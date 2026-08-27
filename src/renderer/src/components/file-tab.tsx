/**
 * Browser-style tab bar for open files. Supports multiple tabs, click
 * to switch, X to close, right-click context menu with "Close All",
 * a "+" button that creates a new note, and vertical resize.
 */

import { useState, useCallback, useRef } from 'react'
import { useVault } from '@/lib/vault-context'
import { FileText, Network, Layers, FileSpreadsheet, Image, File, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VaultEntry } from '@/types/types'

// ─── Auto-naming helpers ────────────────────────────────────────────────────

/**
 * Walk the tree and collect all file names (just the filename, no path).
 * @param entries The tree entries to walk.
 * @returns A set of all file names in the tree.
 */
function collectFileNames(entries: VaultEntry[]): Set<string> {
  const names = new Set<string>()
  for (const entry of entries) {
    if (entry.type === 'file') {
      names.add(entry.name)
    } else if (entry.children) {
      for (const n of collectFileNames(entry.children)) {
        names.add(n)
      }
    }
  }
  return names
}

/**
 * Generate the next "Untitled N" name, scanning existing files to avoid
 * collisions.
 * @param tree The current vault file tree.
 * @returns The next available name like "Untitled 1.md".
 */
function nextUntitledName(tree: VaultEntry[]): string {
  const existing = collectFileNames(tree)
  let n = 1
  while (existing.has(`Untitled ${n}.md`)) {
    n++
  }
  return `Untitled ${n}.md`
}

// ─── Tab icon ───────────────────────────────────────────────────────────────

/**
 * Return the appropriate icon for a file path based on extension.
 * @param props The file path.
 * @returns The rendered icon.
 */
function TabIcon({ filePath }: { filePath: string }): React.JSX.Element {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'diagram':
      return <Network className="h-3.5 w-3.5 shrink-0 text-blue-400" />
    case 'deck':
      return <Layers className="h-3.5 w-3.5 shrink-0 text-purple-400" />
    case 'md':
    case 'txt':
      return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    case 'pdf':
    case 'pptx':
    case 'docx':
      return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-orange-400" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className="h-3.5 w-3.5 shrink-0 text-green-400" />
    default:
      return <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MIN_HEIGHT = 34
const MAX_HEIGHT = 120
const DEFAULT_HEIGHT = 40

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Browser-style tab bar. Shows one tab per open file, highlights the
 * active tab, has a "+" button for new notes, right-click "Close All",
 * and is vertically resizable via a bottom drag handle.
 * @returns The rendered tab bar.
 */
export function FileTab(): React.JSX.Element {
  const { openTabs, openFilePath, switchTab, closeTab, closeAllTabs, tree, createFile, openFile } = useVault()
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabPath: string } | null>(null)

  // ── Resizable height ──────────────────────────────────────────
  const [barHeight, setBarHeight] = useState(DEFAULT_HEIGHT)
  const dragging = useRef(false)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startY = e.clientY
    const startH = barHeight

    const onMove = (ev: MouseEvent): void => {
      if (!dragging.current) return
      const delta = ev.clientY - startY
      setBarHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + delta)))
    }
    const onUp = (): void => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [barHeight])

  /** Create a new Untitled note and open it, just like clicking "+" in a browser. */
  const handleNewTab = useCallback(async (): Promise<void> => {
    const name = nextUntitledName(tree)
    const actual = await createFile(name)
    openFile(actual)
  }, [tree, createFile, openFile])

  /** Show context menu on right-click. */
  const handleContextMenu = useCallback((e: React.MouseEvent, tabPath: string) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, tabPath })
  }, [])

  /** Dismiss context menu. */
  const dismissCtx = useCallback(() => setCtxMenu(null), [])

  return (
    <div className="relative">
      {/* Tab bar — resizable height, wraps when tall enough */}
      <div
        className="flex flex-wrap content-start items-end gap-0.5 border-b border-border bg-[#0e0e0e] pl-1 pr-[140px] overflow-y-auto overflow-x-hidden titlebar-drag"
        style={{ height: barHeight }}
      >
        <div className="flex flex-wrap content-end items-end gap-0.5 min-h-full titlebar-nodrag">
          {openTabs.map((tabPath) => {
            const isActive = tabPath === openFilePath
            const fileName = tabPath.split('/').pop() ?? tabPath
            return (
              <div
                key={tabPath}
                className={cn(
                  'group flex h-[34px] max-w-[200px] shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border border-b-0 px-3 text-[13px] transition-colors',
                  isActive
                    ? 'border-border bg-background text-foreground'
                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground'
                )}
                onClick={() => switchTab(tabPath)}
                onContextMenu={(e) => handleContextMenu(e, tabPath)}
              >
                <TabIcon filePath={tabPath} />
                <span className="truncate">{fileName}</span>
                <button
                  type="button"
                  className={cn(
                    'ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors',
                    isActive
                      ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  onClick={(e) => { e.stopPropagation(); closeTab(tabPath) }}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}

          {/* "+" new tab button — flows inline with tabs */}
          <button
            type="button"
            className="mb-0.5 ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            onClick={() => void handleNewTab()}
            title="New tab"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom drag handle for resizing */}
      <div
        role="separator"
        aria-orientation="horizontal"
        onMouseDown={onDragStart}
        className="absolute bottom-0 left-0 right-0 z-10 h-1 cursor-row-resize transition-colors hover:bg-primary/30 active:bg-primary/50"
      />

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          {/* Invisible backdrop to dismiss */}
          <div className="fixed inset-0 z-50" onClick={dismissCtx} onContextMenu={(e) => { e.preventDefault(); dismissCtx() }} />
          <div
            className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover py-1 text-sm shadow-xl"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left text-popover-foreground hover:bg-accent hover:text-foreground"
              onClick={() => { closeTab(ctxMenu.tabPath); dismissCtx() }}
            >
              Close
            </button>
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left text-popover-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                // Close all tabs except this one
                for (const t of openTabs) {
                  if (t !== ctxMenu.tabPath) closeTab(t)
                }
                dismissCtx()
              }}
            >
              Close Others
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left text-destructive hover:bg-accent"
              onClick={() => { closeAllTabs(); dismissCtx() }}
            >
              Close All Tabs
            </button>
          </div>
        </>
      )}
    </div>
  )
}
