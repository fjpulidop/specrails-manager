import { useState, useEffect, useRef, useCallback } from 'react'
import { Download } from 'lucide-react'

export interface ExportDropdownProps {
  /** Base URL for the export endpoint, e.g. `${getApiBase()}/jobs/export` */
  baseUrl: string
  /** Extra query params to append, e.g. { period: '7d', from: '2026-01-01' } */
  params?: Record<string, string>
  /** Label shown on button. Default: "Export" */
  label?: string
}

export function ExportDropdown({ baseUrl, params, label = 'Export' }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function buildUrl(format: 'csv' | 'json'): string {
    const searchParams = new URLSearchParams({ format, ...params })
    return `${baseUrl}?${searchParams.toString()}`
  }

  function handleCsv() {
    setOpen(false)
    window.open(buildUrl('csv'), '_blank')
  }

  const handleJson = useCallback(async () => {
    setOpen(false)
    setDownloading(true)
    try {
      const res = await fetch(buildUrl('json'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      const pathPart = baseUrl.split('/').filter(Boolean).pop() ?? 'export'
      anchor.download = `${pathPart}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.warn('[ExportDropdown] JSON download failed:', err)
    } finally {
      setDownloading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, params])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={downloading}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <Download className="w-3 h-3" />
        {downloading ? 'Downloading…' : label}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[130px] rounded-md border border-border/60 bg-popover shadow-md text-xs overflow-hidden"
        >
          <button
            role="menuitem"
            type="button"
            onClick={handleCsv}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-accent/60 transition-colors"
          >
            <Download className="w-3 h-3 shrink-0" />
            Export CSV
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={handleJson}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-accent/60 transition-colors"
          >
            <Download className="w-3 h-3 shrink-0" />
            Export JSON
          </button>
        </div>
      )}
    </div>
  )
}
