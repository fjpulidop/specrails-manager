import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSectionPreferences, DEFAULT_ORDER, type SectionId } from '../useSectionPreferences'

const PROJECT_A = 'proj-aaa'
const PROJECT_B = 'proj-bbb'
const STORAGE_KEY_A = `specrails.dashboard.sectionPrefs.${PROJECT_A}`
const STORAGE_KEY_B = `specrails.dashboard.sectionPrefs.${PROJECT_B}`
const STORAGE_KEY_LEGACY = 'specrails.dashboard.sectionPrefs'

describe('useSectionPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('initial state', () => {
    it('returns default order when no stored prefs', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.order).toEqual(DEFAULT_ORDER)
    })

    it('returns all sections collapsed (not expanded) by default', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      for (const id of DEFAULT_ORDER) {
        expect(result.current.isExpanded(id)).toBe(false)
      }
    })

    it('returns no sections pinned by default', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      for (const id of DEFAULT_ORDER) {
        expect(result.current.isPinned(id)).toBe(false)
      }
    })

    it('restores order from localStorage', () => {
      const customOrder: SectionId[] = ['jobs', 'health', 'commands', 'tickets', 'rails']
      localStorage.setItem(STORAGE_KEY_A, JSON.stringify({ order: customOrder, pinned: [] }))

      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.order).toEqual(customOrder)
    })

    it('restores pinned state from localStorage', () => {
      localStorage.setItem(STORAGE_KEY_A, JSON.stringify({
        order: DEFAULT_ORDER,
        pinned: ['health', 'jobs'],
      }))

      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.isPinned('health')).toBe(true)
      expect(result.current.isPinned('jobs')).toBe(true)
      expect(result.current.isPinned('commands')).toBe(false)
    })

    it('pinned sections start expanded', () => {
      localStorage.setItem(STORAGE_KEY_A, JSON.stringify({
        order: DEFAULT_ORDER,
        pinned: ['health'],
      }))

      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.isExpanded('health')).toBe(true)
      expect(result.current.isExpanded('commands')).toBe(false)
    })

    it('falls back to defaults on corrupted localStorage', () => {
      localStorage.setItem(STORAGE_KEY_A, 'not-json')

      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.order).toEqual(DEFAULT_ORDER)
    })

    it('falls back to defaults when stored order has stale section IDs', () => {
      // Simulates pre-SPEA-614 localStorage with old 'runbooks' ID
      localStorage.setItem(STORAGE_KEY_A, JSON.stringify({
        order: ['commands', 'runbooks', 'jobs', 'health'],
        pinned: ['runbooks'],
      }))

      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.order).toEqual(DEFAULT_ORDER)
      // Stale pinned ID should be filtered out
      expect(result.current.isPinned('rails')).toBe(false)
    })
  })

  describe('reorder', () => {
    it('updates order and persists to localStorage', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      const newOrder: SectionId[] = ['jobs', 'commands', 'tickets', 'rails', 'health']

      act(() => {
        result.current.reorder(newOrder)
      })

      expect(result.current.order).toEqual(newOrder)

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_A)!)
      expect(stored.order).toEqual(newOrder)
    })
  })

  describe('togglePin', () => {
    it('pins a section', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))

      act(() => {
        result.current.togglePin('health')
      })

      expect(result.current.isPinned('health')).toBe(true)
    })

    it('unpins a pinned section', () => {
      localStorage.setItem(STORAGE_KEY_A, JSON.stringify({
        order: DEFAULT_ORDER,
        pinned: ['health'],
      }))

      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.isPinned('health')).toBe(true)

      act(() => {
        result.current.togglePin('health')
      })

      expect(result.current.isPinned('health')).toBe(false)
    })

    it('persists pin state to localStorage', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))

      act(() => {
        result.current.togglePin('jobs')
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_A)!)
      expect(stored.pinned).toContain('jobs')
    })
  })

  describe('toggleExpanded', () => {
    it('expands a collapsed section', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))
      expect(result.current.isExpanded('health')).toBe(false)

      act(() => {
        result.current.toggleExpanded('health')
      })

      expect(result.current.isExpanded('health')).toBe(true)
    })

    it('collapses an expanded section', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))

      act(() => {
        result.current.toggleExpanded('health')
      })
      expect(result.current.isExpanded('health')).toBe(true)

      act(() => {
        result.current.toggleExpanded('health')
      })
      expect(result.current.isExpanded('health')).toBe(false)
    })

    it('does not persist expand state to localStorage (transient)', () => {
      const { result } = renderHook(() => useSectionPreferences(PROJECT_A))

      act(() => {
        result.current.toggleExpanded('health')
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_A) || '{}')
      // expanded state is transient, should not be in localStorage
      expect(stored.expanded).toBeUndefined()
    })
  })

  describe('per-project isolation', () => {
    it('stores prefs independently per project', () => {
      // Pin health in project A
      const { result: hookA } = renderHook(() => useSectionPreferences(PROJECT_A))
      act(() => {
        hookA.current.togglePin('health')
      })
      expect(hookA.current.isPinned('health')).toBe(true)

      // Project B should have no pins
      const { result: hookB } = renderHook(() => useSectionPreferences(PROJECT_B))
      expect(hookB.current.isPinned('health')).toBe(false)
    })

    it('persists to separate localStorage keys per project', () => {
      const { result: hookA } = renderHook(() => useSectionPreferences(PROJECT_A))
      act(() => {
        hookA.current.togglePin('jobs')
      })

      const { result: hookB } = renderHook(() => useSectionPreferences(PROJECT_B))
      act(() => {
        hookB.current.togglePin('health')
      })

      const storedA = JSON.parse(localStorage.getItem(STORAGE_KEY_A)!)
      const storedB = JSON.parse(localStorage.getItem(STORAGE_KEY_B)!)
      expect(storedA.pinned).toEqual(['jobs'])
      expect(storedB.pinned).toEqual(['health'])
    })

    it('reloads prefs when projectId changes', () => {
      localStorage.setItem(STORAGE_KEY_A, JSON.stringify({
        order: DEFAULT_ORDER,
        pinned: ['health'],
      }))
      localStorage.setItem(STORAGE_KEY_B, JSON.stringify({
        order: DEFAULT_ORDER,
        pinned: ['jobs'],
      }))

      let projectId = PROJECT_A
      const { result, rerender } = renderHook(() => useSectionPreferences(projectId))

      expect(result.current.isPinned('health')).toBe(true)
      expect(result.current.isPinned('jobs')).toBe(false)

      // Switch to project B
      projectId = PROJECT_B
      rerender()

      expect(result.current.isPinned('health')).toBe(false)
      expect(result.current.isPinned('jobs')).toBe(true)
    })

    it('uses legacy key when no projectId provided', () => {
      localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify({
        order: DEFAULT_ORDER,
        pinned: ['health'],
      }))

      const { result } = renderHook(() => useSectionPreferences())
      expect(result.current.isPinned('health')).toBe(true)
    })
  })
})
