import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProposal } from '../useProposal'

// ─── Mock useSharedWebSocket ───────────────────────────────────────────────────

let wsHandler: ((msg: unknown) => void) | null = null

vi.mock('../useSharedWebSocket', () => ({
  useSharedWebSocket: () => ({
    registerHandler: vi.fn((_id: string, fn: (msg: unknown) => void) => { wsHandler = fn }),
    unregisterHandler: vi.fn(),
    connectionStatus: 'connected' as const,
  }),
}))

// ─── Mock lib/api ──────────────────────────────────────────────────────────────

let mockProjectId: string | null = 'proj-proposal'

vi.mock('../../lib/api', () => ({
  getApiBase: () => `/api/projects/${mockProjectId}`,
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wsHandler = null
    mockProjectId = 'proj-proposal'
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-123' }),
    })
  })

  it('initial state: idle', () => {
    const { result } = renderHook(() => useProposal('proj-proposal'))
    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.proposalId).toBeNull()
    expect(result.current.state.streamingText).toBe('')
    expect(result.current.state.resultMarkdown).toBe('')
  })

  it('startProposal: POSTs idea, dispatches START_EXPLORING', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-456' }),
    })

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Build a new feature')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/propose'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idea: 'Build a new feature' }),
      })
    )
    expect(result.current.state.status).toBe('exploring')
    expect(result.current.state.proposalId).toBe('prop-456')
  })

  it('WS proposal_stream: appends delta to streamingText', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-789' }),
    })

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('My idea')
    })

    act(() => {
      wsHandler?.({ type: 'proposal_stream', projectId: 'proj-proposal', proposalId: 'prop-789', delta: 'Hello' })
    })
    act(() => {
      wsHandler?.({ type: 'proposal_stream', projectId: 'proj-proposal', proposalId: 'prop-789', delta: ' world' })
    })

    expect(result.current.state.streamingText).toBe('Hello world')
  })

  it('WS proposal_ready: transitions to review, strips tool markers', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-ready' }),
    })

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('My idea')
    })

    act(() => {
      wsHandler?.({
        type: 'proposal_ready',
        projectId: 'proj-proposal',
        proposalId: 'prop-ready',
        markdown: '# Proposal\n<!--tool:search-->\nContent here',
      })
    })

    expect(result.current.state.status).toBe('review')
    expect(result.current.state.resultMarkdown).toBe('# Proposal\n\nContent here')
    expect(result.current.state.resultMarkdown).not.toContain('<!--tool:')
    expect(result.current.state.streamingText).toBe('')
    expect(result.current.state.history).toHaveLength(1)
    expect(result.current.state.history[0].role).toBe('assistant')
  })

  it('sendRefinement: dispatches START_REFINING, POSTs feedback', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ proposalId: 'prop-refine' }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as unknown as Response)

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('My idea')
    })

    // Transition to review first
    act(() => {
      wsHandler?.({
        type: 'proposal_ready',
        projectId: 'proj-proposal',
        proposalId: 'prop-refine',
        markdown: '# Draft',
      })
    })

    await act(async () => {
      await result.current.sendRefinement('Make it shorter')
    })

    expect(result.current.state.status).toBe('refining')
    expect(result.current.state.history.at(-1)).toEqual({ role: 'user', content: 'Make it shorter' })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/propose/prop-refine/refine'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('WS proposal_refined: transitions back to review', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ proposalId: 'prop-refined' }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as unknown as Response)

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })
    act(() => {
      wsHandler?.({
        type: 'proposal_ready',
        projectId: 'proj-proposal',
        proposalId: 'prop-refined',
        markdown: '# First draft',
      })
    })
    await act(async () => {
      await result.current.sendRefinement('feedback')
    })
    act(() => {
      wsHandler?.({
        type: 'proposal_refined',
        projectId: 'proj-proposal',
        proposalId: 'prop-refined',
        markdown: '# Refined version',
      })
    })

    expect(result.current.state.status).toBe('review')
    expect(result.current.state.resultMarkdown).toBe('# Refined version')
  })

  it('createIssue: dispatches CREATING_ISSUE, POSTs', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ proposalId: 'prop-issue' }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as unknown as Response)

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })
    act(() => {
      wsHandler?.({
        type: 'proposal_ready',
        projectId: 'proj-proposal',
        proposalId: 'prop-issue',
        markdown: '# Final',
      })
    })

    await act(async () => {
      await result.current.createIssue()
    })

    expect(result.current.state.status).toBe('creating_issue')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/propose/prop-issue/create-issue'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('WS proposal_issue_created: transitions to created with issueUrl', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ proposalId: 'prop-created' }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as unknown as Response)

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })
    act(() => {
      wsHandler?.({
        type: 'proposal_ready',
        projectId: 'proj-proposal',
        proposalId: 'prop-created',
        markdown: '# Final',
      })
    })
    await act(async () => {
      await result.current.createIssue()
    })
    act(() => {
      wsHandler?.({
        type: 'proposal_issue_created',
        projectId: 'proj-proposal',
        proposalId: 'prop-created',
        issueUrl: 'https://github.com/org/repo/issues/42',
      })
    })

    expect(result.current.state.status).toBe('created')
    expect(result.current.state.issueUrl).toBe('https://github.com/org/repo/issues/42')
  })

  it('cancel: dispatches CANCELLED, sends DELETE', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ proposalId: 'prop-cancel' }),
      })
      .mockResolvedValueOnce({ ok: true } as unknown as Response)

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })
    await act(async () => {
      await result.current.cancel()
    })

    expect(result.current.state.status).toBe('cancelled')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/propose/prop-cancel'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('reset: returns to idle', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-reset' }),
    })

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })
    expect(result.current.state.status).toBe('exploring')

    act(() => { result.current.reset() })

    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.proposalId).toBeNull()
  })

  it('project switch: resets state', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-switch' }),
    })

    const { result, rerender } = renderHook(
      ({ pid }: { pid: string | null }) => useProposal(pid),
      { initialProps: { pid: 'proj-proposal' as string | null } }
    )

    await act(async () => {
      await result.current.startProposal('Idea')
    })
    expect(result.current.state.status).toBe('exploring')

    rerender({ pid: 'proj-other' })

    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.proposalId).toBeNull()
  })

  it('error handling: dispatches ERROR on fetch failures', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Connection refused'))

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })

    expect(result.current.state.status).toBe('error')
    expect(result.current.state.errorMessage).toContain('Connection refused')
  })

  it('ignores WS messages for wrong proposalId', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposalId: 'prop-correct' }),
    })

    const { result } = renderHook(() => useProposal('proj-proposal'))

    await act(async () => {
      await result.current.startProposal('Idea')
    })

    act(() => {
      wsHandler?.({
        type: 'proposal_stream',
        projectId: 'proj-proposal',
        proposalId: 'prop-wrong-id',
        delta: 'should be ignored',
      })
    })

    expect(result.current.state.streamingText).toBe('')
  })
})
