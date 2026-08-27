/**
 * Browser-style tab bar for open files. Supports multiple tabs, click
 * to switch, X to close, and a "+" button that instantly creates a new
 * "Untitled N.md" note and opens it in a new tab.
 */

import { useCallback } from 'react'
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

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Browser-style tab bar. Shows one tab per open file, highlights the
 * active tab, and has a "+" button that instantly creates a new note.
 * @returns The rendered tab bar.
 */
export function FileTab(): React.JSX.Element {
  const { openTabs, openFilePath, switchTab, closeTab, tree, createFile, openFile } = useVault()

  /** Create a new Untitled note and open it, just like clicking "+" in a browser. */
  const handleNewTab = useCallback(async (): Promise<void> => {
    const name = nextUntitledName(tree)
    const actual = await createFile(name)
    openFile(actual)
  }, [tree, createFile, openFile])

  return (
    <div className="flex h-9 items-end border-b border-border bg-[#0e0e0e] px-0.5">
      {/* Tab list — horizontally scrollable when many tabs */}
      <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto">
        {openTabs.map((tabPath) => {
          const isActive = tabPath === openFilePath
          const fileName = tabPath.split('/').pop() ?? tabPath
          return (
            <div
              key={tabPath}
              className={cn(
                'group flex h-8 max-w-[180px] cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-[13px] transition-colors',
                isActive
                  ? 'border-border bg-background text-foreground'
                  : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground'
              )}
              onClick={() => switchTab(tabPath)}
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
      </div>

      {/* "+" new tab button */}
      <button
        type="button"
        className="mb-0.5 ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        onClick={() => void handleNewTab()}
        title="New tab"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
