import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Shortcut {
  keys: string          // Display string, e.g. "G P" or "?"
  description: string
  category: 'navigation' | 'actions' | 'general'
}

// All registered shortcuts for the cheatsheet
export const SHORTCUTS: Shortcut[] = [
  // General
  { keys: '?', description: 'Show keyboard shortcuts', category: 'general' },
  { keys: 'Esc', description: 'Close modal / sidebar', category: 'general' },

  // Navigation
  { keys: 'G D', description: 'Go to Dashboard', category: 'navigation' },
  { keys: 'G J', description: 'Go to Activity / Jobs', category: 'navigation' },
  { keys: 'G A', description: 'Go to Analytics', category: 'navigation' },
  { keys: 'G S', description: 'Go to Settings', category: 'navigation' },

  // Actions (contextual)
  { keys: 'J', description: 'Next item in list', category: 'actions' },
  { keys: 'K', description: 'Previous item in list', category: 'actions' },
]

// ─── Input detection ─────────────────────────────────────────────────────────

function isEditableTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((e.target as HTMLElement)?.isContentEditable) return true
  return false
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseKeyboardShortcutsOptions {
  /** Callback to open cheatsheet modal */
  onOpenCheatsheet: () => void
  /** Optional contextual callbacks */
  onListNavigate?: (direction: 'up' | 'down') => void
}

export function useKeyboardShortcuts({
  onOpenCheatsheet,
  onListNavigate,
}: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const pendingPrefix = useRef<string | null>(null)
  const prefixTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable refs so the keydown handler never goes stale
  const onOpenCheatsheetRef = useRef(onOpenCheatsheet)
  onOpenCheatsheetRef.current = onOpenCheatsheet
  const onListNavigateRef = useRef(onListNavigate)
  onListNavigateRef.current = onListNavigate
  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Never intercept when typing in inputs
      if (isEditableTarget(e)) return

      // Don't intercept modifier combos (except Esc)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key

      // ─── Second key of a G-sequence ──────────────────────────────────
      if (pendingPrefix.current === 'g') {
        if (prefixTimer.current) clearTimeout(prefixTimer.current)
        pendingPrefix.current = null

        const upper = key.toUpperCase()
        const routes: Record<string, string> = {
          D: '/',
          P: '/',         // G P → projects/dashboard
          J: '/activity',
          A: '/analytics',
          S: '/settings',
        }

        if (routes[upper]) {
          e.preventDefault()
          navigate(routes[upper])
          return
        }
        // Unknown second key — fall through
        return
      }

      // ─── First key handlers ──────────────────────────────────────────

      // ? → cheatsheet
      if (key === '?') {
        e.preventDefault()
        onOpenCheatsheetRef.current()
        return
      }

      // G → start sequence
      if (key === 'g') {
        e.preventDefault()
        pendingPrefix.current = 'g'
        prefixTimer.current = setTimeout(() => {
          pendingPrefix.current = null
        }, 800)
        return
      }

      // J/K → list navigation
      if (key === 'j') {
        onListNavigateRef.current?.('down')
        return
      }
      if (key === 'k') {
        onListNavigateRef.current?.('up')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (prefixTimer.current) clearTimeout(prefixTimer.current)
    }
  }, [navigate])
}

// ─── Cheatsheet state hook ───────────────────────────────────────────────────

export function useCheatsheetState() {
  const [open, setOpen] = useState(false)
  const openCheatsheet = useCallback(() => setOpen(true), [])
  const closeCheatsheet = useCallback(() => setOpen(false), [])
  return { cheatsheetOpen: open, setCheatsheetOpen: setOpen, openCheatsheet, closeCheatsheet }
}
