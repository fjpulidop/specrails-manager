import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'

// ─── Mock WebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static lastInstance: MockWebSocket | null = null

  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  readyState = 0

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    MockWebSocket.lastInstance = this
  }

  send(_data: string) {}

  close() {
    this.readyState = 3
    this.onclose?.()
  }

  triggerOpen() {
    this.readyState = 1
    this.onopen?.()
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  triggerClose() {
    this.readyState = 3
    this.onclose?.()
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    MockWebSocket.lastInstance = null
    ;(global as unknown as Record<string, unknown>).WebSocket = MockWebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in "connecting" status', () => {
    const onMessage = vi.fn()
    const { result } = renderHook(() => useWebSocket('ws://localhost:4200', onMessage))
    expect(result.current.connectionStatus).toBe('connecting')
  })

  it('transitions to "connected" when WebSocket opens', () => {
    const onMessage = vi.fn()
    const { result } = renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    act(() => { MockWebSocket.lastInstance?.triggerOpen() })
    expect(result.current.connectionStatus).toBe('connected')
  })

  it('creates a WebSocket with the provided URL', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('ws://localhost:9999', onMessage))
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:9999')
  })

  it('calls onMessage with parsed JSON when a message arrives', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    act(() => {
      MockWebSocket.lastInstance?.triggerOpen()
      MockWebSocket.lastInstance?.triggerMessage({ type: 'queue', jobs: [] })
    })

    expect(onMessage).toHaveBeenCalledWith({ type: 'queue', jobs: [] })
  })

  it('silently ignores malformed JSON messages', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    act(() => {
      MockWebSocket.lastInstance?.triggerOpen()
      MockWebSocket.lastInstance?.onmessage?.({ data: 'not-valid-json{{{' })
    })

    expect(onMessage).not.toHaveBeenCalled()
  })

  it('reconnects after close with 1s delay (first backoff)', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    act(() => { MockWebSocket.lastInstance?.triggerOpen() })
    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => { MockWebSocket.lastInstance?.triggerClose() })
    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('reconnects with exponential backoff (2s second attempt)', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    // Close once (1s delay)
    act(() => { MockWebSocket.lastInstance?.triggerClose() })
    act(() => { vi.advanceTimersByTime(1000) })

    // Close again (2s delay)
    act(() => { MockWebSocket.lastInstance?.triggerClose() })
    act(() => { vi.advanceTimersByTime(2000) })

    expect(MockWebSocket.instances).toHaveLength(3)
  })

  it('resets retry count to 0 after successful reconnect', () => {
    const onMessage = vi.fn()
    renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    const ws1 = MockWebSocket.lastInstance!
    act(() => { ws1.triggerOpen() })

    act(() => { ws1.triggerClose() })
    act(() => { vi.advanceTimersByTime(1000) })

    const ws2 = MockWebSocket.lastInstance!
    act(() => { ws2.triggerOpen() }) // successful reconnect → resets counter

    act(() => { ws2.triggerClose() })
    act(() => { vi.advanceTimersByTime(1000) }) // should reconnect at 1s (first delay again)

    expect(MockWebSocket.instances).toHaveLength(3)
  })

  it('stops reconnecting after max retries (5 backoff delays)', () => {
    const onMessage = vi.fn()
    const { result } = renderHook(() => useWebSocket('ws://localhost:4200', onMessage))

    // Exhaust 5 backoffs: 1s, 2s, 4s, 8s, 16s
    const delays = [1000, 2000, 4000, 8000, 16000]
    for (const delay of delays) {
      act(() => { MockWebSocket.lastInstance?.triggerClose() })
      act(() => { vi.advanceTimersByTime(delay) })
    }

    // 6th close — no more reconnects
    act(() => { MockWebSocket.lastInstance?.triggerClose() })
    act(() => { vi.advanceTimersByTime(60000) })

    expect(result.current.connectionStatus).toBe('disconnected')
  })

  it('cleans up pending retry timeout on unmount', () => {
    const onMessage = vi.fn()
    const { unmount } = renderHook(() => useWebSocket('ws://localhost:4200', onMessage))
    const ws = MockWebSocket.lastInstance!

    act(() => { ws.triggerOpen() })

    // Trigger a close so a retry timer gets queued
    act(() => { ws.triggerClose() })
    // At this point a 1s timer is pending

    // Unmount before the timer fires — the cleanup cancels the pending timer
    unmount()

    // Advance past the retry delay — no new connection should have been made
    act(() => { vi.advanceTimersByTime(2000) })

    // Only the original WS instance should exist (the pending timer was cancelled)
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})
