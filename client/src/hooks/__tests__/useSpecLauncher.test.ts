import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSpecLauncher } from '../useSpecLauncher'

// ─── Mock useSharedWebSocket ───────────────────────────────────────────────────

let registeredHandler: ((msg: unknown) => void) | null = null

vi.mock('../useSharedWebSocket', () => ({
  useSharedWebSocket: () => ({
    registerHandler: vi.fn((_id: string, fn: (msg: unknown) => void) => {
      registeredHandler = fn
    }),
    unregisterHandler: vi.fn(),
    connectionStatus: 'connected' as const,
  }),
}))

// ─── Mock lib/api ──────────────────────────────────────────────────────────────

vi.mock('../../lib/api', () => ({
  getApiBase: () => '/api/projects/proj-1',
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSpecLauncher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandler = null
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ launchId: 'launch-abc' }),
    })
  })

  describe('initial state', () => {
    it('starts in idle status', () => {
      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      expect(result.current.state.status).toBe('idle')
    })

    it('starts with null launchId', () => {
      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      expect(result.current.state.launchId).toBeNull()
    })

    it('starts with empty streamText', () => {
      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      expect(result.current.state.streamText).toBe('')
    })

    it('starts with null error', () => {
      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      expect(result.current.state.error).toBeNull()
    })
  })

  describe('launch', () => {
    it('POSTs to spec-launcher/start and transitions to "launching"', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ launchId: 'launch-xyz' }),
      })

      const { result } = renderHook(() => useSpecLauncher('proj-1'))

      await act(async () => { await result.current.launch('Add login feature') })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/spec-launcher/start',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ description: 'Add login feature' }),
        })
      )
      expect(result.current.state.status).toBe('launching')
      expect(result.current.state.launchId).toBe('launch-xyz')
    })

    it('sets status to error when server returns non-ok', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      })

      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      await act(async () => { await result.current.launch('test') })

      expect(result.current.state.status).toBe('error')
      expect(result.current.state.error).toBe('Internal Server Error')
    })

    it('sets generic error when server JSON parse fails', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => { throw new Error('parse error') },
      })

      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      await act(async () => { await result.current.launch('test') })

      expect(result.current.state.status).toBe('error')
      expect(result.current.state.error).toContain('503')
    })

    it('sets error when fetch throws (network error)', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Connection refused'))

      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      await act(async () => { await result.current.launch('test') })

      expect(result.current.state.status).toBe('error')
      expect(result.current.state.error).toContain('Connection refused')
    })
  })

  describe('WebSocket message handling', () => {
    async function setupLaunching() {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ launchId: 'launch-abc' }),
      })
      const hook = renderHook(() => useSpecLauncher('proj-1'))
      await act(async () => { await hook.result.current.launch('build feature') })
      return hook
    }

    it('appends delta text from spec_launcher_stream messages', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ type: 'spec_launcher_stream', launchId: 'launch-abc', delta: 'Hello ' })
        registeredHandler?.({ type: 'spec_launcher_stream', launchId: 'launch-abc', delta: 'World' })
      })

      expect(result.current.state.streamText).toBe('Hello World')
    })

    it('skips tool annotation deltas (starts with <!--tool:)', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ type: 'spec_launcher_stream', launchId: 'launch-abc', delta: '<!--tool:some-annotation-->' })
        registeredHandler?.({ type: 'spec_launcher_stream', launchId: 'launch-abc', delta: 'visible text' })
      })

      expect(result.current.state.streamText).toBe('visible text')
    })

    it('transitions to "done" on spec_launcher_done', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ type: 'spec_launcher_done', launchId: 'launch-abc', changeId: 'change-001' })
      })

      expect(result.current.state.status).toBe('done')
      expect(result.current.state.changeId).toBe('change-001')
    })

    it('transitions to "done" with null changeId when not provided', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ type: 'spec_launcher_done', launchId: 'launch-abc', changeId: null })
      })

      expect(result.current.state.status).toBe('done')
      expect(result.current.state.changeId).toBeNull()
    })

    it('transitions to "error" on spec_launcher_error', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ type: 'spec_launcher_error', launchId: 'launch-abc', error: 'Claude API error' })
      })

      expect(result.current.state.status).toBe('error')
      expect(result.current.state.error).toBe('Claude API error')
    })

    it('ignores messages for a different launchId', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ type: 'spec_launcher_done', launchId: 'OTHER-launch', changeId: 'x' })
      })

      expect(result.current.state.status).toBe('launching')
    })

    it('ignores messages with no type', async () => {
      const { result } = await setupLaunching()

      act(() => {
        registeredHandler?.({ launchId: 'launch-abc' })
      })

      expect(result.current.state.status).toBe('launching')
    })
  })

  describe('cancel', () => {
    it('resets state immediately and DELETEs the launch', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ launchId: 'launch-cancel' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      const { result } = renderHook(() => useSpecLauncher('proj-1'))

      await act(async () => { await result.current.launch('test cancel') })
      expect(result.current.state.status).toBe('launching')

      await act(async () => { await result.current.cancel() })
      expect(result.current.state.status).toBe('idle')
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/proj-1/spec-launcher/launch-cancel',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('does nothing if no active launchId', async () => {
      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      const fetchCallsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

      await act(async () => { await result.current.cancel() })
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsBefore)
    })
  })

  describe('reset', () => {
    it('resets state to idle', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ launchId: 'launch-reset' }),
      })

      const { result } = renderHook(() => useSpecLauncher('proj-1'))
      await act(async () => { await result.current.launch('test reset') })
      expect(result.current.state.status).toBe('launching')

      act(() => { result.current.reset() })
      expect(result.current.state.status).toBe('idle')
      expect(result.current.state.launchId).toBeNull()
      expect(result.current.state.streamText).toBe('')
    })
  })

  describe('project switch', () => {
    it('resets state when activeProjectId changes', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ launchId: 'launch-switch' }),
      })

      const { result, rerender } = renderHook(
        ({ projectId }: { projectId: string | null }) => useSpecLauncher(projectId),
        { initialProps: { projectId: 'proj-1' } }
      )

      await act(async () => { await result.current.launch('test') })
      expect(result.current.state.status).toBe('launching')

      act(() => { rerender({ projectId: 'proj-2' }) })

      await waitFor(() => {
        expect(result.current.state.status).toBe('idle')
      })
    })
  })
})
