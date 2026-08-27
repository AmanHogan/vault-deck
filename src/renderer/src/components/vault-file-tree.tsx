/**
 * Recursive file tree component for the vault sidebar. Shows folders
 * (collapsible) and files with extension-based icons. Clicking a file
 * opens it via the vault context.
 *
 * Features:
 * - Icon toolbar at the top (new file, new diagram, new deck, new folder, collapse all)
 * - Right-click context menus on files and folders (with Duplicate / Copy)
 * - Inline rename
 * - Drag-and-drop to move files/folders into other folders
 * - Multi-select with Ctrl+Click and Shift+Click, bulk delete
 */

import { useState, useCallback, createContext, useContext, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  FileText,
  FilePlus,
  Network,
  Layers,
  Image,
  FileSpreadsheet,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Trash2,
  Check,
  X,
  Pencil,
  FileType,
  Presentation,
  ExternalLink,
  Copy,
  ChevronsDownUp,
} from 'lucide-react'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import type { VaultEntry } from '@/types/types'
import { useVault } from '@/lib/vault-context'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return initial content for a new file based on extension. */
function initialContent(name: string): string | undefined {
  if (name.endsWith('.deck')) {
    const title = name.replace(/\.deck$/, '')
    return JSON.stringify({ title, description: '', tags: [], cards: [] }, null, 2)
  }
  if (name.endsWith('.diagram')) {
    return JSON.stringify({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }, null, 2)
  }
  return undefined
}

/** Extract just the filename from a path. */
function fileName(path: string): string {
  return path.split('/').pop() ?? path
}

/** Extract the parent directory from a path (empty string for root-level). */
function parentDir(path: string): string {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

/** Flatten a tree into a list of file paths in display order. */
function flattenFilePaths(entries: VaultEntry[], expandedDirs: Set<string>): string[] {
  const result: string[] = []
  for (const e of entries) {
    if (e.type === 'file') {
      result.push(e.path)
    } else if (e.children && expandedDirs.has(e.path)) {
      result.push(...flattenFilePaths(e.children, expandedDirs))
    }
  }
  return result
}

// ─── Tree context (shared state for selection + expand/collapse) ────────────

interface TreeContextValue {
  // Selection
  selected: Set<string>
  lastClicked: string | null
  toggleSelect: (path: string, e: React.MouseEvent) => void
  clearSelection: () => void
  isSelected: (path: string) => boolean
  // Expand/collapse
  expandedDirs: Set<string>
  toggleExpanded: (path: string) => void
  setExpanded: (path: string, open: boolean) => void
}

const TreeContext = createContext<TreeContextValue>({
  selected: new Set(),
  lastClicked: null,
  toggleSelect: () => {},
  clearSelection: () => {},
  isSelected: () => false,
  expandedDirs: new Set(),
  toggleExpanded: () => {},
  setExpanded: () => {},
})

// ─── Inline name input ──────────────────────────────────────────────────────

/**
 * Inline text input for naming new files/folders or renaming.
 * @param props placeholder, defaultValue, onCommit, onCancel.
 * @returns The rendered inline input.
 */
function InlineNameInput({
  placeholder,
  defaultValue = '',
  onCommit,
  onCancel,
}: {
  placeholder: string
  defaultValue?: string
  onCommit: (name: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [value, setValue] = useState(defaultValue)

  const commit = (): void => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== defaultValue) {
      onCommit(trimmed)
    } else {
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1">
      <input
        autoFocus
        type="text"
        className="h-6 min-w-0 flex-1 rounded border border-input bg-transparent px-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={commit}
      />
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        onMouseDown={(e) => { e.preventDefault(); commit() }}
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
        onMouseDown={(e) => { e.preventDefault(); onCancel() }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── File extension icon ────────────────────────────────────────────────────

/**
 * Render the appropriate icon for a file extension.
 * @param props The extension (including dot) and optional className.
 * @returns The rendered icon element.
 */
function FileExtIcon({ ext, className }: { ext: string; className?: string }): React.JSX.Element {
  switch (ext) {
    case '.md':
    case '.txt':
      return <FileText className={className} />
    case '.diagram':
      return <Network className={className} />
    case '.deck':
      return <Layers className={className} />
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
      return <Image className={className} />
    case '.csv':
    case '.xlsx':
      return <FileSpreadsheet className={className} />
    case '.pdf':
      return <FileType className={className} />
    case '.pptx':
      return <Presentation className={className} />
    case '.docx':
      return <FileText className={className} />
    default:
      return <File className={className} />
  }
}

// ─── Context menu styled items ──────────────────────────────────────────────

const ctxItemClass =
  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'
const ctxSepClass = 'my-1 h-px bg-border'

// ─── File tree node ─────────────────────────────────────────────────────────

interface FileTreeNodeProps {
  entry: VaultEntry
  depth: number
}

/**
 * A single node (file or folder) in the file tree, rendered recursively.
 * Supports right-click context menus, drag-and-drop, multi-select, and copy.
 * @param props The entry and indentation depth.
 * @returns The rendered tree node.
 */
function FileTreeNode({ entry, depth }: FileTreeNodeProps): React.JSX.Element {
  const { openFilePath, openFile, createFile, createDirectory, deleteFile, deleteDirectory, renameFile, copyFile, refreshTree } = useVault()
  const { selected, toggleSelect, isSelected, expandedDirs, toggleExpanded, setExpanded: setDirExpanded } = useContext(TreeContext)

  const [creatingFile, setCreatingFile] = useState<'file' | 'diagram' | 'deck' | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const expanded = expandedDirs.has(entry.path)
  const isActive = entry.type === 'file' && openFilePath === entry.path
  const isMultiSelected = isSelected(entry.path)
  const multiCount = selected.size

  // ── Drag source handlers ──

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', entry.path)
    e.dataTransfer.effectAllowed = 'move'
  }, [entry.path])

  // ── Drop target handlers (folders only) ──

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const sourcePath = e.dataTransfer.getData('text/plain')
    if (!sourcePath || sourcePath === entry.path) return
    if (entry.path.startsWith(sourcePath + '/')) return
    const name = fileName(sourcePath)
    const newPath = `${entry.path}/${name}`
    if (parentDir(sourcePath) === entry.path) return
    try {
      await renameFile(sourcePath, newPath)
      setDirExpanded(entry.path, true)
    } catch { /* move failed */ }
  }, [entry.path, renameFile, setDirExpanded])

  /** Delete all selected files. */
  const deleteSelected = useCallback(async () => {
    const paths = Array.from(selected)
    for (const p of paths) {
      try { await window.api.vault.deleteFile(p) } catch {
        try { await window.api.vault.deleteDirectory(p) } catch { /* ignore */ }
      }
    }
    await refreshTree()
  }, [selected, refreshTree])

  if (entry.type === 'directory') {
    const FolderIcon = expanded ? FolderOpen : FolderClosed
    const ChevronIcon = expanded ? ChevronDown : ChevronRight

    return (
      <div>
        <ContextMenuPrimitive.Root>
          <ContextMenuPrimitive.Trigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => void handleDrop(e)}
              className={cn(
                'group flex cursor-pointer items-center gap-1 rounded-md px-1 py-1 text-sm hover:bg-sidebar-accent',
                dragOver && 'bg-primary/15 ring-1 ring-primary',
              )}
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
              {renaming ? (
                <InlineNameInput
                  placeholder={entry.name}
                  defaultValue={entry.name}
                  onCommit={async (newName) => {
                    setRenaming(false)
                    const parent = parentDir(entry.path)
                    try {
                      const newPath = parent ? `${parent}/${newName}` : newName
                      await window.api.vault.renameFile(entry.path, newPath)
                    } catch { /* rename failed */ }
                  }}
                  onCancel={() => setRenaming(false)}
                />
              ) : (
                <button
                  type="button"
                  className="flex flex-1 items-center gap-1.5 truncate text-left"
                  onClick={() => toggleExpanded(entry.path)}
                >
                  <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <FolderIcon className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate">{entry.name}</span>
                </button>
              )}
            </div>
          </ContextMenuPrimitive.Trigger>

          <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content className="z-50 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => { setCreatingFile('file'); setDirExpanded(entry.path, true) }}>
                <FileText className="h-4 w-4" /> New file
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => { setCreatingFile('diagram'); setDirExpanded(entry.path, true) }}>
                <Network className="h-4 w-4" /> New diagram
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => { setCreatingFile('deck'); setDirExpanded(entry.path, true) }}>
                <Layers className="h-4 w-4" /> New deck
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => { setCreatingFolder(true); setDirExpanded(entry.path, true) }}>
                <FolderClosed className="h-4 w-4" /> New folder
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Separator className={ctxSepClass} />
              <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => setRenaming(true)}>
                <Pencil className="h-4 w-4" /> Rename
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Separator className={ctxSepClass} />
              <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => void window.api.vault.showInExplorer(entry.path)}>
                <FolderOpen className="h-4 w-4" /> Reveal in Finder
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Separator className={ctxSepClass} />
              <ContextMenuPrimitive.Item className={`${ctxItemClass} text-destructive data-highlighted:text-destructive`} onClick={() => void deleteDirectory(entry.path)}>
                <Trash2 className="h-4 w-4" /> Delete folder
              </ContextMenuPrimitive.Item>
            </ContextMenuPrimitive.Content>
          </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>

        {creatingFile && (
          <div style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
            <InlineNameInput
              placeholder={creatingFile === 'diagram' ? 'diagram.diagram' : creatingFile === 'deck' ? 'flashcards.deck' : 'note.md'}
              onCommit={async (name) => {
                const kind = creatingFile
                setCreatingFile(null)
                let finalName = name
                if (kind === 'diagram' && !name.endsWith('.diagram')) finalName = name + '.diagram'
                if (kind === 'deck' && !name.endsWith('.deck')) finalName = name + '.deck'
                const path = `${entry.path}/${finalName}`
                const actual = await createFile(path, initialContent(finalName))
                openFile(actual)
              }}
              onCancel={() => setCreatingFile(null)}
            />
          </div>
        )}

        {creatingFolder && (
          <div style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
            <InlineNameInput
              placeholder="folder name"
              onCommit={async (name) => {
                setCreatingFolder(false)
                await createDirectory(`${entry.path}/${name}`)
              }}
              onCancel={() => setCreatingFolder(false)}
            />
          </div>
        )}

        {expanded && entry.children?.map((child) => (
          <FileTreeNode key={child.path} entry={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  // ── File node ──
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          className={cn(
            'group flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-sm hover:bg-sidebar-accent',
            isActive && !isMultiSelected && 'bg-primary/10 text-primary',
            isMultiSelected && 'bg-primary/20 ring-1 ring-primary/40',
          )}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              toggleSelect(entry.path, e)
            } else {
              openFile(entry.path)
            }
          }}
        >
          {renaming ? (
            <InlineNameInput
              placeholder={entry.name}
              defaultValue={entry.name}
              onCommit={async (newName) => {
                setRenaming(false)
                const parent = parentDir(entry.path)
                try {
                  const newPath = parent ? `${parent}/${newName}` : newName
                  const actual = await renameFile(entry.path, newPath)
                  openFile(actual)
                } catch { /* rename failed */ }
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <div className="flex flex-1 items-center gap-1.5 truncate text-left">
              <FileExtIcon ext={entry.extension} className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{entry.name}</span>
            </div>
          )}
        </div>
      </ContextMenuPrimitive.Trigger>

      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="z-50 min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => openFile(entry.path)}>
            <FileText className="h-4 w-4" /> Open
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Separator className={ctxSepClass} />
          <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => void (async () => {
            const newPath = await copyFile(entry.path)
            openFile(newPath)
          })()}>
            <Copy className="h-4 w-4" /> Duplicate
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => setRenaming(true)}>
            <Pencil className="h-4 w-4" /> Rename
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Separator className={ctxSepClass} />
          <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => void window.api.vault.showInExplorer(entry.path)}>
            <FolderOpen className="h-4 w-4" /> Reveal in Finder
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item className={ctxItemClass} onClick={() => void window.api.vault.openInDefaultApp(entry.path)}>
            <ExternalLink className="h-4 w-4" /> Open in default app
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Separator className={ctxSepClass} />
          {multiCount > 1 && isMultiSelected && (
            <ContextMenuPrimitive.Item
              className={`${ctxItemClass} text-destructive data-highlighted:text-destructive`}
              onClick={() => void deleteSelected()}
            >
              <Trash2 className="h-4 w-4" /> Delete {multiCount} selected
            </ContextMenuPrimitive.Item>
          )}
          <ContextMenuPrimitive.Item className={`${ctxItemClass} text-destructive data-highlighted:text-destructive`} onClick={() => void deleteFile(entry.path)}>
            <Trash2 className="h-4 w-4" /> Delete
          </ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  )
}

// ─── Icon toolbar button ────────────────────────────────────────────────────

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Main file tree ─────────────────────────────────────────────────────────

type RootCreate = 'file' | 'diagram' | 'deck' | 'folder' | null

/**
 * The vault file tree panel. Shows the full tree with an icon toolbar
 * at the top, right-click context menus, drag-and-drop, multi-select
 * (Ctrl/Cmd+Click, Shift+Click), Collapse All, and Duplicate.
 * @returns The rendered file tree.
 */
export function VaultFileTree(): React.JSX.Element | null {
  const { tree, vaultPath, createFile, createDirectory, openFile, renameFile } = useVault()
  const [creating, setCreating] = useState<RootCreate>(null)
  const [rootDragOver, setRootDragOver] = useState(false)

  // ── Centralized expand/collapse state (all collapsed by default) ──
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set())

  const toggleExpanded = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const setDirExpanded = useCallback((path: string, open: boolean) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (open) next.add(path)
      else next.delete(path)
      return next
    })
  }, [])

  /** Collapse all folders. */
  const collapseAll = useCallback(() => {
    setExpandedDirs(new Set())
  }, [])

  // ── Multi-select state ──
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastClicked, setLastClicked] = useState<string | null>(null)

  // Flat list of all visible file paths (for shift-select range)
  const flatPaths = useMemo(() => flattenFilePaths(tree, expandedDirs), [tree, expandedDirs])

  const toggleSelect = useCallback((path: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClicked) {
      const startIdx = flatPaths.indexOf(lastClicked)
      const endIdx = flatPaths.indexOf(path)
      if (startIdx !== -1 && endIdx !== -1) {
        const lo = Math.min(startIdx, endIdx)
        const hi = Math.max(startIdx, endIdx)
        const range = flatPaths.slice(lo, hi + 1)
        setSelected((prev) => {
          const next = new Set(prev)
          for (const p of range) next.add(p)
          return next
        })
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })
    }
    setLastClicked(path)
  }, [lastClicked, flatPaths])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    setLastClicked(null)
  }, [])

  const isSelected = useCallback((path: string) => selected.has(path), [selected])

  const treeCtx = useMemo<TreeContextValue>(() => ({
    selected,
    lastClicked,
    toggleSelect,
    clearSelection,
    isSelected,
    expandedDirs,
    toggleExpanded,
    setExpanded: setDirExpanded,
  }), [selected, lastClicked, toggleSelect, clearSelection, isSelected, expandedDirs, toggleExpanded, setDirExpanded])

  if (!vaultPath) return null

  const placeholder: Record<Exclude<RootCreate, null>, string> = {
    file: 'note.md',
    diagram: 'diagram.diagram',
    deck: 'flashcards.deck',
    folder: 'folder name',
  }

  /** Handle drop at the vault root level — moves item to root. */
  const handleRootDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setRootDragOver(false)
    const sourcePath = e.dataTransfer.getData('text/plain')
    if (!sourcePath) return
    const name = sourcePath.split('/').pop() ?? sourcePath
    if (!sourcePath.includes('/')) return
    try {
      await renameFile(sourcePath, name)
    } catch { /* move failed */ }
  }

  return (
    <TreeContext.Provider value={treeCtx}>
      <div
        className={cn('flex flex-col gap-1 py-1', rootDragOver && 'bg-primary/5')}
        onDragOver={(e) => { e.preventDefault(); setRootDragOver(true) }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => void handleRootDrop(e)}
        onClick={(e) => {
          if (e.target === e.currentTarget) clearSelection()
        }}
      >
        {/* Icon toolbar */}
        <div className="mb-1 flex items-center justify-end gap-0.5 px-2">
          <ToolbarButton icon={FilePlus} label="New file" onClick={() => setCreating('file')} />
          <ToolbarButton icon={Network} label="New diagram" onClick={() => setCreating('diagram')} />
          <ToolbarButton icon={Layers} label="New deck" onClick={() => setCreating('deck')} />
          <ToolbarButton icon={FolderPlus} label="New folder" onClick={() => setCreating('folder')} />
          <ToolbarButton icon={ChevronsDownUp} label="Collapse all" onClick={collapseAll} />
        </div>

        {/* Selection count bar */}
        {selected.size > 0 && (
          <div className="mx-2 flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
            <span>{selected.size} selected</span>
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
              title="Clear selection"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {creating && (
          <InlineNameInput
            placeholder={placeholder[creating]}
            onCommit={async (name) => {
              const kind = creating
              setCreating(null)
              if (kind === 'folder') {
                await createDirectory(name)
              } else {
                let finalName = name
                if (kind === 'diagram' && !name.endsWith('.diagram')) finalName = name + '.diagram'
                if (kind === 'deck' && !name.endsWith('.deck')) finalName = name + '.deck'
                const actual = await createFile(finalName, initialContent(finalName))
                openFile(actual)
              }
            }}
            onCancel={() => setCreating(null)}
          />
        )}

        {tree.length === 0 && !creating && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            Vault is empty. Create a file to get started.
          </p>
        )}

        {tree.map((entry) => (
          <FileTreeNode key={entry.path} entry={entry} depth={0} />
        ))}
      </div>
    </TreeContext.Provider>
  )
}
