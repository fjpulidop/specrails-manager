import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test-utils'
import { Navbar } from '../Navbar'

describe('Navbar', () => {
  it('renders the specrails wordmark', () => {
    render(<Navbar />)
    expect(screen.getByText('spec')).toBeInTheDocument()
    expect(screen.getByText('rails')).toBeInTheDocument()
  })

  it('renders Home navigation link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  })

  it('renders Analytics navigation link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
  })

  it('renders a docs external link pointing to specrails.dev/docs', () => {
    render(<Navbar />)
    // Icon-only link — find by href attribute
    const allLinks = screen.getAllByRole('link')
    const docsLink = allLinks.find((l) => l.getAttribute('href') === 'https://specrails.dev/docs')
    expect(docsLink).toBeDefined()
    expect(docsLink).toHaveAttribute('target', '_blank')
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders a Settings navigation link', () => {
    render(<Navbar />)
    // Icon-only NavLink to /settings — find by href
    const allLinks = screen.getAllByRole('link')
    const settingsLink = allLinks.find((l) => l.getAttribute('href') === '/settings')
    expect(settingsLink).toBeDefined()
  })

  it('renders as a nav element', () => {
    render(<Navbar />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
