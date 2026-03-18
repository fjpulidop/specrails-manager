import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProjectCache } from '../useProjectCache'

// Access the module-level globalCache by re-importing the module
// We'll clear it between tests by switching projectIds

describe('useProjectCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initialValue when no cache exists', () => {
    const fetcher = vi.fn().mockResolvedValue(['data'])
    const { result } = renderHook(() =>
      useProjectCache({
        namespace: 'test',
        projectId: 'proj-no-cache',
        initialValue: [] as string[],
        fetcher,
      })
    )
    // Before the fetch resolves
    expect(result.current.data).toEqual([])
    expect(result.current.isFirstLoad).toBe(true)
  })

  it('calls fetcher on mount and updates data with result', async () => {
    const fetcher = vi.fn().mockResolvedValue(['item1', 'item2'])
    const { result } = renderHook(() =>
      useProjectCache({
        namespace: 'mount-test',
        projectId: 'proj-mount',
        initialValue: [] as string[],
        fetcher,
      })
    )
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.data).toEqual(['item1', 'item2']))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFirstLoad).toBe(false)
  })

  it('on projectId change: instantly restores cached data, fetches fresh in background', async () => {
    const fetcher = vi.fn()
    fetcher.mockResolvedValueOnce(['proj-a-data'])
    fetcher.mockResolvedValueOnce(['proj-b-data'])
    fetcher.mockResolvedValueOnce(['proj-a-fresh'])

    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) =>
        useProjectCache({
          namespace: 'switch-test',
          projectId,
          initialValue: [] as string[],
          fetcher,
        }),
      { initialProps: { projectId: 'proj-switch-a' } }
    )

    // Wait for project A data to load and be cached
    await waitFor(() => expect(result.current.data).toEqual(['proj-a-data']))

    // Switch to project B
    rerender({ projectId: 'proj-switch-b' })
    // project B has no cache, so starts with initialValue
    expect(result.current.data).toEqual([])

    // Wait for project B data
    await waitFor(() => expect(result.current.data).toEqual(['proj-b-data']))

    // Switch back to A — should restore cached data instantly
    rerender({ projectId: 'proj-switch-a' })
    expect(result.current.data).toEqual(['proj-a-data'])
    expect(result.current.isFirstLoad).toBe(false)
  })

  it('cancelled flag prevents stale fetch from updating state', async () => {
    let resolveFirst: (v: string[]) => void
    const firstFetch = new Promise<string[]>((res) => { resolveFirst = res })
    const fetcher = vi.fn()
    fetcher.mockReturnValueOnce(firstFetch)
    fetcher.mockResolvedValueOnce(['proj-b-stale-test'])

    const { result, rerender } = renderHook(
      ({ projectId }: { projectId: string }) =>
        useProjectCache({
          namespace: 'cancel-test',
          projectId,
          initialValue: [] as string[],
          fetcher,
        }),
      { initialProps: { projectId: 'proj-cancel-a' } }
    )

    // Switch before first fetch resolves
    rerender({ projectId: 'proj-cancel-b' })
    await waitFor(() => expect(result.current.data).toEqual(['proj-b-stale-test']))

    // Now resolve the first (cancelled) fetch
    act(() => resolveFirst!(['stale-data']))

    // Should NOT have updated to stale-data — still on proj-b data
    expect(result.current.data).toEqual(['proj-b-stale-test'])
  })

  it('polling: when pollInterval > 0, fetcher is called repeatedly', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockResolvedValue(['polled'])
    renderHook(() =>
      useProjectCache({
        namespace: 'poll-test',
        projectId: 'proj-poll',
        initialValue: [] as string[],
        fetcher,
        pollInterval: 1000,
      })
    )

    // Initial fetch
    await act(async () => { await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // Advance timer to trigger poll
    await act(async () => { vi.advanceTimersByTime(1000) })
    await act(async () => { await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(2)

    await act(async () => { vi.advanceTimersByTime(1000) })
    await act(async () => { await Promise.resolve() })
    expect(fetcher).toHaveBeenCalledTimes(3)

    vi.useRealTimers()
  })

  it('error in fetcher: keeps cached/initial data, does not crash', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fetch failed'))
    const { result } = renderHook(() =>
      useProjectCache({
        namespace: 'error-test',
        projectId: 'proj-error',
        initialValue: ['initial'] as string[],
        fetcher,
      })
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    // Data stays at initial value after error
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(['initial'])
  })

  it('refresh() triggers a new fetch', async () => {
    const fetcher = vi.fn()
    fetcher.mockResolvedValueOnce(['v1'])
    fetcher.mockResolvedValueOnce(['v2'])

    const { result } = renderHook(() =>
      useProjectCache({
        namespace: 'refresh-test',
        projectId: 'proj-refresh',
        initialValue: [] as string[],
        fetcher,
      })
    )

    await waitFor(() => expect(result.current.data).toEqual(['v1']))

    act(() => { result.current.refresh() })
    await waitFor(() => expect(result.current.data).toEqual(['v2']))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
