import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test-utils'
import { RootLayout } from '../RootLayout'

// Mock Toaster from sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), promise: vi.fn() },
  Toaster: () => null,
}))

// Mock usePipeline so we don't need WebSocket
vi.mock('../../hooks/usePipeline', () => ({
  usePipeline: () => ({
    connectionStatus: 'connected',
    phases: {},
    queue: { jobs: [], activeJobId: null, paused: false },
    logs: [],
    commands: [],
    activeJobId: null,
  }),
}))

// Mock useChat so we don't need full chat setup
vi.mock('../../hooks/useChat', () => ({
  useChat: () => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    isLoading: false,
    isSending: false,
    isPanelOpen: false,
    canCreateNew: false,
    hasActiveConversation: false,
    activeTitle: null,
    toggle: vi.fn(),
    sendMessage: vi.fn(),
    selectConversation: vi.fn(),
    newConversation: vi.fn(),
    deleteConversation: vi.fn(),
  }),
}))

// Mock child components that depend on WebSocket/API
vi.mock('../StatusBar', () => ({
  StatusBar: ({ connectionStatus }: { connectionStatus: string }) => (
    <div data-testid="status-bar">{connectionStatus}</div>
  ),
}))

vi.mock('../ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel" />,
}))

vi.mock('../Navbar', () => ({
  Navbar: () => <nav data-testid="navbar" />,
}))

describe('RootLayout', () => {
  it('renders Navbar component', () => {
    render(<RootLayout />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('renders StatusBar with connection status', () => {
    render(<RootLayout />)
    expect(screen.getByTestId('status-bar')).toBeInTheDocument()
  })

  it('renders ChatPanel', () => {
    render(<RootLayout />)
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
  })

  it('renders a main content area', () => {
    render(<RootLayout />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
