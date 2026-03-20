import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '../../test-utils'
import { SpecrailsTechPanel } from '../SpecrailsTechPanel'

const mockAgent = {
  slug: 'architect',
  name: 'Architect',
  title: 'Design & Planning',
  status: 'active',
  status_source: 'specrails',
  agents_md_path: '/path/agents.md',
}

const mockDoc = {
  slug: 'getting-started',
  title: 'Getting Started',
  path: '/docs/getting-started.md',
  updated_at: '2024-06-01T10:00:00Z',
}

describe('SpecrailsTechPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton (null/null) initially when fetch is pending', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    )

    const { container } = render(<SpecrailsTechPanel />)
    // Initial null state renders the pulse skeleton
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders agents when API returns connected=true with data', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('agents')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: true, data: [mockAgent] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: true, data: [mockDoc] }),
      })
    })

    render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(screen.getByText('Architect')).toBeInTheDocument()
    })
    expect(screen.getByText('Design & Planning')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders docs when API returns connected=true with docs data', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('agents')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: true, data: [mockAgent] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: true, data: [mockDoc] }),
      })
    })

    render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument()
    })
  })

  it('renders offline message when connected=false', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ connected: false, error: 'not running' }),
      })
    )

    render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(screen.getByText(/specrails-tech is not running/i)).toBeInTheDocument()
    })
  })

  it('renders offline message when fetch throws', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(screen.getByText(/specrails-tech is not running/i)).toBeInTheDocument()
    })
  })

  it('renders null when both lists are empty after load', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ connected: true, data: [] }),
      })
    )

    const { container } = render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    // Both empty → component returns null
    expect(container.firstChild).toBeNull()
  })

  it('renders agents section heading when agents are present', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('agents')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: true, data: [mockAgent] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: true, data: [] }),
      })
    })

    render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(screen.getByText(/agents/i)).toBeInTheDocument()
    })
  })

  it('renders docs section heading when docs are present', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('agents')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: true, data: [] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: true, data: [mockDoc] }),
      })
    })

    render(<SpecrailsTechPanel />)

    await waitFor(() => {
      expect(screen.getByText(/docs/i)).toBeInTheDocument()
    })
  })
})
