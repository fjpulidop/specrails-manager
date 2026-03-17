import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'

import { scanCommands } from './config'

const TEST_COMMAND_FRONTMATTER = `---
name: "Test Writer"
description: "Generate comprehensive tests for files using sr-test-writer. Pass file paths or leave empty to test all recently changed files."
phases:
  - key: detect
    label: Detect
    description: "Detects test framework and reads existing test patterns"
  - key: write
    label: Write Tests
    description: "Generates test files targeting >80% coverage"
  - key: report
    label: Report
    description: "Outputs test writer results summary"
---

# Test Writer
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let existsSyncSpy: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let readdirSyncSpy: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let readFileSyncSpy: any

describe('scanCommands — test command', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readdirSyncSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue(['test.md'] as any)
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(TEST_COMMAND_FRONTMATTER)
  })

  afterEach(() => {
    existsSyncSpy.mockRestore()
    readdirSyncSpy.mockRestore()
    readFileSyncSpy.mockRestore()
  })

  it('discovers test.md and returns correct id, slug, name', () => {
    const commands = scanCommands('/some/commands/dir')

    expect(commands).toHaveLength(1)
    expect(commands[0].id).toBe('test')
    expect(commands[0].slug).toBe('test')
    expect(commands[0].name).toBe('Test Writer')
  })

  it('parses description from frontmatter', () => {
    const commands = scanCommands('/some/commands/dir')

    expect(commands[0].description).toBe(
      'Generate comprehensive tests for files using sr-test-writer. Pass file paths or leave empty to test all recently changed files.'
    )
  })

  it('parses phases array: 3 phases with keys detect, write, report', () => {
    const commands = scanCommands('/some/commands/dir')

    expect(commands[0].phases).toHaveLength(3)
    expect(commands[0].phases.map((p) => p.key)).toEqual(['detect', 'write', 'report'])
  })

  it('phase labels are: Detect, Write Tests, Report', () => {
    const commands = scanCommands('/some/commands/dir')

    expect(commands[0].phases[0].label).toBe('Detect')
    expect(commands[0].phases[1].label).toBe('Write Tests')
    expect(commands[0].phases[2].label).toBe('Report')
  })

  it('phase descriptions are non-empty strings', () => {
    const commands = scanCommands('/some/commands/dir')

    for (const phase of commands[0].phases) {
      expect(typeof phase.description).toBe('string')
      expect(phase.description.length).toBeGreaterThan(0)
    }
  })

  it('returns empty phases array when frontmatter has no phases key', () => {
    readFileSyncSpy.mockReturnValue(`---\nname: "Test Writer"\ndescription: "No phases here"\n---\n# Test Writer\n`)

    const commands = scanCommands('/some/commands/dir')

    expect(commands[0].phases).toEqual([])
  })

  it('handles missing test.md gracefully (empty commands dir)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readdirSyncSpy.mockReturnValue([] as any)

    const commands = scanCommands('/some/commands/dir')

    expect(commands).toEqual([])
  })

  it('handles malformed frontmatter gracefully (falls back to filename-derived name)', () => {
    readFileSyncSpy.mockReturnValue('# No frontmatter here\nJust content')

    const commands = scanCommands('/some/commands/dir')

    expect(commands).toHaveLength(1)
    expect(commands[0].id).toBe('test')
    expect(commands[0].name).toBe('test')
    expect(commands[0].phases).toEqual([])
  })
})
