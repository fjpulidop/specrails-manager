import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import { IssuePickerStep, FreeFormStep, BatchFreeFormStep } from '../IssuePickerStep'

vi.mock('../../lib/api', () => ({
  getApiBase: () => '/api',
}))

const mockIssues = [
  { id: 'i1', number: 1, title: 'Fix the login bug', body: 'Description here', labels: ['bug'] },
  { id: 'i2', number: 2, title: 'Add search feature', body: '', labels: ['enhancement', 'ui'] },
  { id: 'i3', number: 3, title: 'Update docs', body: '', labels: [] },
]

describe('IssuePickerStep', () => {
  const onSelectionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIssues,
    })
  })

  it('renders loading skeleton while fetching', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    const { container } = render(
      <IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders issues after fetch completes', async () => {
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('Fix the login bug')).toBeInTheDocument()
      expect(screen.getByText('Add search feature')).toBeInTheDocument()
    })
  })

  it('renders issue numbers in monospace', async () => {
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
    })
  })

  it('renders labels for issues', async () => {
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('enhancement')).toBeInTheDocument()
    })
  })

  it('calls onSelectionChange when issue is clicked (single select)', async () => {
    const user = userEvent.setup()
    render(
      <IssuePickerStep
        multiSelect={false}
        selectedIssues={[]}
        onSelectionChange={onSelectionChange}
      />
    )
    await waitFor(() => expect(screen.getByText('Fix the login bug')).toBeInTheDocument())
    await user.click(screen.getByText('Fix the login bug').closest('button') as HTMLElement)
    expect(onSelectionChange).toHaveBeenCalledWith([mockIssues[0]])
  })

  it('deselects issue on second click (single select)', async () => {
    const user = userEvent.setup()
    render(
      <IssuePickerStep
        multiSelect={false}
        selectedIssues={[mockIssues[0]]}
        onSelectionChange={onSelectionChange}
      />
    )
    await waitFor(() => expect(screen.getByText('Fix the login bug')).toBeInTheDocument())
    await user.click(screen.getByText('Fix the login bug').closest('button') as HTMLElement)
    expect(onSelectionChange).toHaveBeenCalledWith([])
  })

  it('adds issue to selection in multiSelect mode', async () => {
    const user = userEvent.setup()
    render(
      <IssuePickerStep
        multiSelect={true}
        selectedIssues={[mockIssues[0]]}
        onSelectionChange={onSelectionChange}
      />
    )
    await waitFor(() => expect(screen.getByText('Add search feature')).toBeInTheDocument())
    await user.click(screen.getByText('Add search feature').closest('button') as HTMLElement)
    expect(onSelectionChange).toHaveBeenCalledWith([mockIssues[0], mockIssues[1]])
  })

  it('removes issue from selection in multiSelect mode when already selected', async () => {
    const user = userEvent.setup()
    render(
      <IssuePickerStep
        multiSelect={true}
        selectedIssues={[mockIssues[0], mockIssues[1]]}
        onSelectionChange={onSelectionChange}
      />
    )
    await waitFor(() => expect(screen.getByText('Fix the login bug')).toBeInTheDocument())
    await user.click(screen.getByText('Fix the login bug').closest('button') as HTMLElement)
    expect(onSelectionChange).toHaveBeenCalledWith([mockIssues[1]])
  })

  it('shows selected issues count when issues are selected', async () => {
    render(
      <IssuePickerStep
        multiSelect={true}
        selectedIssues={[mockIssues[0], mockIssues[1]]}
        onSelectionChange={onSelectionChange}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/2 issues selected/)).toBeInTheDocument()
    })
  })

  it('shows singular "issue" for one selected issue', async () => {
    render(
      <IssuePickerStep
        multiSelect={true}
        selectedIssues={[mockIssues[0]]}
        onSelectionChange={onSelectionChange}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/1 issue selected/)).toBeInTheDocument()
    })
  })

  it('renders search input', () => {
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    expect(screen.getByPlaceholderText('Search issues...')).toBeInTheDocument()
  })

  it('shows "No issues found" when empty response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('No issues found')).toBeInTheDocument()
    })
  })

  it('shows error message when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch issues')).toBeInTheDocument()
    })
  })

  it('shows "No issue tracker configured" when status is 503', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 503, ok: false })
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('No issue tracker configured')).toBeInTheDocument()
    })
  })

  it('limits labels display to 3', async () => {
    const issueWithManyLabels = [
      { id: 'i4', number: 4, title: 'Many labels', body: '', labels: ['a', 'b', 'c', 'd', 'e'] },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => issueWithManyLabels,
    })
    render(<IssuePickerStep selectedIssues={[]} onSelectionChange={onSelectionChange} />)
    await waitFor(() => {
      expect(screen.getByText('a')).toBeInTheDocument()
      expect(screen.getByText('b')).toBeInTheDocument()
      expect(screen.getByText('c')).toBeInTheDocument()
      expect(screen.queryByText('d')).not.toBeInTheDocument()
    })
  })
})

describe('FreeFormStep', () => {
  const onTitleChange = vi.fn()
  const onDescriptionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title input with value', () => {
    render(
      <FreeFormStep
        title="My feature"
        description=""
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />
    )
    const input = screen.getByPlaceholderText('e.g. Add user authentication') as HTMLInputElement
    expect(input.value).toBe('My feature')
  })

  it('calls onTitleChange when title input changes', async () => {
    const user = userEvent.setup()
    render(
      <FreeFormStep
        title=""
        description=""
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />
    )
    await user.type(screen.getByPlaceholderText('e.g. Add user authentication'), 'A')
    expect(onTitleChange).toHaveBeenCalledWith('A')
  })

  it('calls onDescriptionChange when description textarea changes', () => {
    render(
      <FreeFormStep
        title=""
        description=""
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />
    )
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'desc text' } })
    expect(onDescriptionChange).toHaveBeenCalledWith('desc text')
  })

  it('renders "Feature title" label', () => {
    render(
      <FreeFormStep
        title=""
        description=""
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />
    )
    expect(screen.getByText('Feature title')).toBeInTheDocument()
  })

  it('renders "Description" label', () => {
    render(
      <FreeFormStep
        title=""
        description=""
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />
    )
    expect(screen.getByText('Description')).toBeInTheDocument()
  })
})

describe('BatchFreeFormStep', () => {
  const onItemsChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders items list with Feature 1 label', () => {
    render(
      <BatchFreeFormStep
        items={[{ title: '', description: '' }]}
        onItemsChange={onItemsChange}
      />
    )
    expect(screen.getByText(/feature 1/i)).toBeInTheDocument()
  })

  it('calls onItemsChange when title input changes', () => {
    render(
      <BatchFreeFormStep
        items={[{ title: '', description: '' }]}
        onItemsChange={onItemsChange}
      />
    )
    const inputs = screen.getAllByPlaceholderText('Feature title')
    fireEvent.change(inputs[0], { target: { value: 'New feature' } })
    expect(onItemsChange).toHaveBeenCalledWith([{ title: 'New feature', description: '' }])
  })

  it('renders "+ Add another feature" button', () => {
    render(
      <BatchFreeFormStep
        items={[{ title: '', description: '' }]}
        onItemsChange={onItemsChange}
      />
    )
    expect(screen.getByRole('button', { name: /add another feature/i })).toBeInTheDocument()
  })

  it('calls onItemsChange with new item when "Add another feature" is clicked', async () => {
    const user = userEvent.setup()
    render(
      <BatchFreeFormStep
        items={[{ title: 'First', description: '' }]}
        onItemsChange={onItemsChange}
      />
    )
    await user.click(screen.getByRole('button', { name: /add another feature/i }))
    expect(onItemsChange).toHaveBeenCalledWith([
      { title: 'First', description: '' },
      { title: '', description: '' },
    ])
  })

  it('does not show Remove button when there is only one item', () => {
    render(
      <BatchFreeFormStep
        items={[{ title: '', description: '' }]}
        onItemsChange={onItemsChange}
      />
    )
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('shows Remove button when there are multiple items', () => {
    render(
      <BatchFreeFormStep
        items={[
          { title: 'Feature A', description: '' },
          { title: 'Feature B', description: '' },
        ]}
        onItemsChange={onItemsChange}
      />
    )
    const removeBtns = screen.getAllByRole('button', { name: /remove/i })
    expect(removeBtns.length).toBe(2)
  })

  it('calls onItemsChange without removed item when Remove is clicked', async () => {
    const user = userEvent.setup()
    render(
      <BatchFreeFormStep
        items={[
          { title: 'Feature A', description: '' },
          { title: 'Feature B', description: '' },
        ]}
        onItemsChange={onItemsChange}
      />
    )
    const removeBtns = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeBtns[0])
    expect(onItemsChange).toHaveBeenCalledWith([{ title: 'Feature B', description: '' }])
  })

  it('renders "Feature 2" label for second item', () => {
    render(
      <BatchFreeFormStep
        items={[
          { title: 'A', description: '' },
          { title: 'B', description: '' },
        ]}
        onItemsChange={onItemsChange}
      />
    )
    expect(screen.getByText(/feature 2/i)).toBeInTheDocument()
  })
})
