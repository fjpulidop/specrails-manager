import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import { ExportDropdown } from '../ExportDropdown'

// URL.createObjectURL / URL.revokeObjectURL are not available in jsdom
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true })
Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true })

// window.open is not wired by jsdom in the same way — override it
const mockWindowOpen = vi.fn()
Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true })

describe('ExportDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    // Default fetch from test-setup resolves with { ok: true, json: async () => ({}) }
    // Override with a blob response for JSON export tests where needed
  })

  // ---- Rendering ----

  it('renders the button with default "Export" label', () => {
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument()
  })

  it('renders the button with a custom label', () => {
    render(<ExportDropdown baseUrl="/api/jobs/export" label="Download" />)
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument()
  })

  it('does not show the dropdown menu initially', () => {
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  // ---- Toggle open / close ----

  it('shows dropdown menu when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Export CSV/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Export JSON/i })).toBeInTheDocument()
  })

  it('hides dropdown menu when the button is clicked a second time', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    const btn = screen.getByRole('button', { name: /Export/i })
    await user.click(btn)
    await user.click(btn)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('sets aria-expanded to true when the dropdown is open', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    const btn = screen.getByRole('button', { name: /Export/i })
    await user.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('sets aria-expanded to false when the dropdown is closed', () => {
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    const btn = screen.getByRole('button', { name: /Export/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  // ---- CSV export ----

  it('calls window.open with the correct CSV URL when "Export CSV" is clicked', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export CSV/i }))
    expect(mockWindowOpen).toHaveBeenCalledTimes(1)
    const [url, target] = mockWindowOpen.mock.calls[0]
    expect(url).toContain('/api/jobs/export')
    expect(url).toContain('format=csv')
    expect(target).toBe('_blank')
  })

  it('closes the dropdown after "Export CSV" is clicked', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export CSV/i }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // ---- Extra params appended to URL ----

  it('appends extra params to the CSV URL', async () => {
    const user = userEvent.setup()
    render(
      <ExportDropdown
        baseUrl="/api/jobs/export"
        params={{ period: '7d', from: '2026-01-01' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export CSV/i }))
    const [url] = mockWindowOpen.mock.calls[0]
    expect(url).toContain('period=7d')
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('format=csv')
  })

  it('appends extra params to the JSON fetch URL', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    const user = userEvent.setup()
    render(
      <ExportDropdown
        baseUrl="/api/jobs/export"
        params={{ period: '30d' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toContain('period=30d')
      expect(url).toContain('format=json')
    })
  })

  // ---- JSON export ----

  it('calls fetch with the correct JSON URL when "Export JSON" is clicked', async () => {
    const blob = new Blob(['[]'], { type: 'application/json' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(url).toContain('/api/jobs/export')
      expect(url).toContain('format=json')
    })
  })

  it('calls URL.createObjectURL and URL.revokeObjectURL during JSON download', async () => {
    const blob = new Blob(['[]'], { type: 'application/json' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  it('closes the dropdown immediately when "Export JSON" is clicked', async () => {
    // Make fetch hang so dropdown state can be observed before completion
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))
    // Dropdown should be closed immediately after clicking the menu item
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // ---- "Downloading…" state ----

  it('shows "Downloading…" on the button while the JSON fetch is in progress', async () => {
    // Hang the fetch so the downloading state persists long enough to assert
    let resolveBlob!: (v: unknown) => void
    const blobPromise = new Promise((res) => { resolveBlob = res })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => blobPromise,
    })

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    // While fetch is pending, the button should show "Downloading…"
    expect(screen.getByRole('button', { name: /Downloading/i })).toBeInTheDocument()

    // Resolve and wait for state to clear
    resolveBlob(new Blob(['[]']))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Downloading/i })).not.toBeInTheDocument()
    })
  })

  it('button is disabled while JSON download is in progress', async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    const btn = screen.getByRole('button', { name: /Downloading/i })
    expect(btn).toBeDisabled()
  })

  it('restores label after JSON download completes', async () => {
    const blob = new Blob(['[]'], { type: 'application/json' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" label="Download" />)
    await user.click(screen.getByRole('button', { name: /Download/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Downloading/i })).not.toBeInTheDocument()
    })
  })

  // ---- Error handling ----

  it('recovers from a failed JSON fetch (downloading state is cleared)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      // After error, downloading state must be cleared and button re-enabled
      expect(screen.queryByRole('button', { name: /Downloading/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Export/i })).not.toBeDisabled()
    })
  })

  it('recovers from a network error during JSON fetch', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Downloading/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Export/i })).not.toBeDisabled()
    })
  })

  // ---- Click outside ----

  it('closes the dropdown when a mousedown event fires outside the component', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <ExportDropdown baseUrl="/api/jobs/export" />
        <div data-testid="outside">outside</div>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: /Export/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Fire a mousedown on the element outside the component
    fireEvent.mouseDown(screen.getByTestId('outside'))

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('does not close the dropdown when mousedown fires inside the component', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/jobs/export" />)

    await user.click(screen.getByRole('button', { name: /Export/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Fire mousedown on the menu itself (inside the container)
    fireEvent.mouseDown(screen.getByRole('menu'))

    // Menu should still be open
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  // ---- URL construction edge cases ----

  it('builds correct URL when no extra params are provided', async () => {
    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="http://example.com/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export CSV/i }))
    const [url] = mockWindowOpen.mock.calls[0]
    expect(url).toBe('http://example.com/export?format=csv')
  })

  it('derives JSON filename from the last path segment of baseUrl', async () => {
    const blob = new Blob(['[]'], { type: 'application/json' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    // Spy on anchor creation to verify the download attribute
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')

    const user = userEvent.setup()
    render(<ExportDropdown baseUrl="/api/analytics/export" />)
    await user.click(screen.getByRole('button', { name: /Export/i }))
    await user.click(screen.getByRole('menuitem', { name: /Export JSON/i }))

    await waitFor(() => {
      const anchorCalls = appendChildSpy.mock.calls.filter(
        ([node]) => node instanceof HTMLAnchorElement
      )
      expect(anchorCalls.length).toBeGreaterThanOrEqual(1)
      const anchor = anchorCalls[0][0] as HTMLAnchorElement
      expect(anchor.download).toBe('export.json')
    })
  })
})
