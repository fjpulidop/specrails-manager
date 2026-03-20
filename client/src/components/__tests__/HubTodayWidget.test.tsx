import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '../../test-utils'
import { HubTodayWidget } from '../HubTodayWidget'

// Mock useSharedWebSocket
vi.mock('../../hooks/useSharedWebSocket', () => ({
  useSharedWebSocket: () => ({
    registerHandler: vi.fn(),
    unregisterHandler: vi.fn(),
    connectionStatus: 'connected' as const,
  }),
}))

// Mock useHub — controllable projects list
let mockProjects: { id: string; name: string }[] = []

vi.mock('../../hooks/useHub', () => ({
  useHub: () => ({
    projects: mockProjects,
    activeProjectId: null,
    setActiveProjectId: vi.fn(),
    isLoading: false,
    setupProjectIds: new Set(),
    startSetupWizard: vi.fn(),
    completeSetupWizard: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
  }),
}))

describe('HubTodayWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjects = []
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ projectCount: 3, costToday: 0.0123, jobsToday: 7 }),
    })
  })

  it('renders nothing when there are fewer than 2 projects', async () => {
    mockProjects = [{ id: 'p1', name: 'Project 1' }]
    const { container } = render(<HubTodayWidget />)

    // Wait for async fetch to settle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Component returns null when < 2 projects
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when state is null (initial load)', async () => {
    // fetch doesn't resolve yet — state stays null
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    )
    mockProjects = [{ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }]

    const { container } = render(<HubTodayWidget />)
    // state is null, projects >= 2, but state is null so still renders nothing
    expect(container.firstChild).toBeNull()
  })

  it('renders hub today stats when state loads and 2+ projects', async () => {
    mockProjects = [
      { id: 'p1', name: 'Project 1' },
      { id: 'p2', name: 'Project 2' },
    ]
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ projectCount: 2, costToday: 0.0050, jobsToday: 5 }),
    })

    render(<HubTodayWidget />)

    await waitFor(() => {
      expect(screen.getByText(/hub today:/i)).toBeInTheDocument()
    })

    expect(screen.getByText('$0.0050')).toBeInTheDocument()
    expect(screen.getByText(/5 jobs across 2 projects/i)).toBeInTheDocument()
  })

  it('renders a "View analytics" link', async () => {
    mockProjects = [
      { id: 'p1', name: 'P1' },
      { id: 'p2', name: 'P2' },
    ]

    render(<HubTodayWidget />)

    await waitFor(() => {
      expect(screen.queryByText(/view analytics/i)).toBeInTheDocument()
    })
  })

  it('does not render if fetch returns not ok', async () => {
    mockProjects = [
      { id: 'p1', name: 'P1' },
      { id: 'p2', name: 'P2' },
    ]
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false })

    const { container } = render(<HubTodayWidget />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // state stays null, so renders nothing
    expect(container.firstChild).toBeNull()
  })
})
