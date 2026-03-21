import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '../../test-utils'
import { CheckpointTracker } from '../CheckpointTracker'
import type { CheckpointState } from '../CheckpointTracker'

const makeCheckpoints = (): CheckpointState[] => [
  { key: 'step-1', name: 'Initialize', status: 'done', detail: 'Completed init', duration_ms: 1200 },
  { key: 'step-2', name: 'Install deps', status: 'running', detail: 'npm install...' },
  { key: 'step-3', name: 'Configure', status: 'pending' },
]

describe('CheckpointTracker', () => {
  it('renders Setup progress heading', () => {
    render(<CheckpointTracker checkpoints={makeCheckpoints()} logLines={[]} />)
    expect(screen.getByText('Setup progress')).toBeInTheDocument()
  })

  it('renders checkpoint names', () => {
    render(<CheckpointTracker checkpoints={makeCheckpoints()} logLines={[]} />)
    expect(screen.getByText('Initialize')).toBeInTheDocument()
    expect(screen.getByText('Install deps')).toBeInTheDocument()
    expect(screen.getByText('Configure')).toBeInTheDocument()
  })

  it('shows done count and total', () => {
    render(<CheckpointTracker checkpoints={makeCheckpoints()} logLines={[]} />)
    // 1 done out of 3
    expect(screen.getByText(/1 of 3 complete/)).toBeInTheDocument()
  })

  it('shows 100% when all checkpoints are done', () => {
    const allDone: CheckpointState[] = [
      { key: 'a', name: 'Step A', status: 'done' },
      { key: 'b', name: 'Step B', status: 'done' },
    ]
    render(<CheckpointTracker checkpoints={allDone} logLines={[]} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('2 of 2 complete')).toBeInTheDocument()
  })

  it('shows 0% and "0 of 0 complete" when no checkpoints', () => {
    render(<CheckpointTracker checkpoints={[]} logLines={[]} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 of 0 complete')).toBeInTheDocument()
  })

  it('shows detail text for running checkpoint', () => {
    render(<CheckpointTracker checkpoints={makeCheckpoints()} logLines={[]} />)
    expect(screen.getByText('npm install...')).toBeInTheDocument()
  })

  it('shows detail text for done checkpoint', () => {
    render(<CheckpointTracker checkpoints={makeCheckpoints()} logLines={[]} />)
    expect(screen.getByText('Completed init')).toBeInTheDocument()
  })

  it('renders log line count in raw log button', () => {
    const lines = ['line 1', 'line 2', 'line 3']
    render(<CheckpointTracker checkpoints={[]} logLines={lines} />)
    expect(screen.getByText(/Raw log \(3 lines\)/)).toBeInTheDocument()
  })

  it('expands raw log on button click', () => {
    const lines = ['first log line', 'second log line']
    render(<CheckpointTracker checkpoints={[]} logLines={lines} />)
    const toggle = screen.getByText(/Raw log/)
    // Log lines not visible yet
    expect(screen.queryByText('first log line')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.getByText('first log line')).toBeInTheDocument()
    expect(screen.getByText('second log line')).toBeInTheDocument()
  })

  it('collapses raw log on second click', () => {
    const lines = ['a log line']
    render(<CheckpointTracker checkpoints={[]} logLines={lines} />)
    const toggle = screen.getByText(/Raw log/)
    fireEvent.click(toggle)
    expect(screen.getByText('a log line')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.queryByText('a log line')).not.toBeInTheDocument()
  })

  it('shows pending checkpoint with a number index', () => {
    const checkpoints: CheckpointState[] = [
      { key: 'p1', name: 'Pending Step', status: 'pending' },
    ]
    render(<CheckpointTracker checkpoints={checkpoints} logLines={[]} />)
    // Pending step shows index+1 = 1
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Pending Step')).toBeInTheDocument()
  })

  it('shows connector line between nodes (except last)', () => {
    // Just ensure it renders without crash with multiple items
    const checkpoints: CheckpointState[] = [
      { key: 'c1', name: 'First', status: 'done' },
      { key: 'c2', name: 'Second', status: 'done' },
      { key: 'c3', name: 'Third', status: 'pending' },
    ]
    render(<CheckpointTracker checkpoints={checkpoints} logLines={[]} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })
})
