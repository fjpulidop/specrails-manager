import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test-utils'
import ProjectHealthGrid from '../ProjectHealthGrid'
import type { ProjectHealth } from '../../types'

const now = new Date()
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

const greenProject: ProjectHealth = {
  projectId: 'p-green',
  projectName: 'Green Project',
  successRate24h: 0.95,
  totalCost24h: 1.25,
  pendingJobsCount: 0,
  lastSuccessfulJobAt: oneHourAgo,
  healthStatus: 'green',
}

const yellowProject: ProjectHealth = {
  projectId: 'p-yellow',
  projectName: 'Yellow Project',
  successRate24h: 0.70,
  totalCost24h: 3.50,
  pendingJobsCount: 3,
  lastSuccessfulJobAt: oneHourAgo,
  healthStatus: 'yellow',
}

const redProject: ProjectHealth = {
  projectId: 'p-red',
  projectName: 'Red Project',
  successRate24h: 0.40,
  totalCost24h: 0.10,
  pendingJobsCount: 0,
  lastSuccessfulJobAt: null,
  healthStatus: 'red',
}

describe('ProjectHealthGrid', () => {
  it('renders empty state when no projects', () => {
    render(<ProjectHealthGrid projects={[]} onSelectProject={vi.fn()} />)
    expect(screen.getByText('No projects registered yet.')).toBeInTheDocument()
  })

  it('renders health cards for each project', () => {
    render(
      <ProjectHealthGrid
        projects={[greenProject, yellowProject, redProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByText('Green Project')).toBeInTheDocument()
    expect(screen.getByText('Yellow Project')).toBeInTheDocument()
    expect(screen.getByText('Red Project')).toBeInTheDocument()
  })

  it('renders correct traffic light labels', () => {
    render(
      <ProjectHealthGrid
        projects={[greenProject, yellowProject, redProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByTestId('traffic-light-green')).toHaveTextContent('Healthy')
    expect(screen.getByTestId('traffic-light-yellow')).toHaveTextContent('Warning')
    expect(screen.getByTestId('traffic-light-red')).toHaveTextContent('Critical')
  })

  it('displays success rate as percentage', () => {
    render(
      <ProjectHealthGrid
        projects={[greenProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('displays 24h cost formatted', () => {
    render(
      <ProjectHealthGrid
        projects={[greenProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByText('$1.25')).toBeInTheDocument()
  })

  it('displays pending job count', () => {
    render(
      <ProjectHealthGrid
        projects={[yellowProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows "never" when no successful jobs', () => {
    render(
      <ProjectHealthGrid
        projects={[redProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByText('never')).toBeInTheDocument()
  })

  it('calls onSelectProject when card is clicked', () => {
    const onSelect = vi.fn()
    render(
      <ProjectHealthGrid
        projects={[greenProject]}
        onSelectProject={onSelect}
      />
    )

    fireEvent.click(screen.getByText('Green Project'))
    expect(onSelect).toHaveBeenCalledWith('p-green')
  })

  it('renders responsive grid with correct data-testid', () => {
    render(
      <ProjectHealthGrid
        projects={[greenProject]}
        onSelectProject={vi.fn()}
      />
    )

    expect(screen.getByTestId('health-grid')).toBeInTheDocument()
  })
})
