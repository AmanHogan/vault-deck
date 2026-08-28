/**
 * Browser-style tab bar for open files. Supports drag-to-reorder,
 * click to switch, X to close, right-click context menu with
 * "Close All", a "+" button that creates a new note, and vertical
 * resize.
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import { useVault } from '@/lib/vault-context'
import {
  FileText,
  Network,
  Layers,
  FileSpreadsheet,
  Image,
  File,
  X,
  Plus,
  PenTool,
  LayoutDashboard,
  GripVertical,
  Columns2,
  Rows2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VaultEntry } from '@/types/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePaneLayout } from '@/lib/pane-layout-context'

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
  const base = 'h-3.5 w-3.5 shrink-0'
  switch (ext) {
    case 'diagram':
      return <Network className={base} style={{ color: 'var(--icon-diagram)' }} />
    case 'excalidraw':
      return <PenTool className={base} style={{ color: 'var(--icon-excalidraw)' }} />
    case 'canvas':
      return <LayoutDashboard className={base} style={{ color: 'var(--icon-canvas)' }} />
    case 'deck':
      return <Layers className={base} style={{ color: 'var(--icon-deck)' }} />
    case 'md':
    case 'txt':
      return <FileText className={`${base} text-muted-foreground`} />
    case 'pdf':
    case 'pptx':
    case 'docx':
      return <FileSpreadsheet className={base} style={{ color: 'var(--icon-document)' }} />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image className={base} style={{ color: 'var(--icon-image)' }} />
    default:
      return <File className={`${base} text-muted-foreground`} />
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MIN_HEIGHT = 34
const MAX_HEIGHT = 120
const DEFAULT_HEIGHT = 40

// ─── Sortable tab item ─────────────────────────────────────────────────────

interface SortableTabProps {
  tabPath: string
  isActive: boolean
  onSwitch: (path: string) => void
  onClose: (path: string) => void
  onContextMenu: (e: React.MouseEvent, path: string) => void
}

/**
 * A single draggable/sortable tab. Uses dnd-kit's useSortable hook.
 * @param props Tab state and event handlers.
 * @returns The rendered sortable tab.
 */
function SortableTab({
  tabPath,
  isActive,
  onSwitch,
  onClose,
  onContextMenu
}: SortableTabProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tabPath
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined
  }

  const fileName = tabPath.split('/').pop() ?? tabPath

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex h-[34px] max-w-[200px] shrink-0 cursor-pointer items-center gap-1 rounded-t-lg border border-b-0 px-2 text-[13px] transition-colors',
        isActive
          ? 'border-border bg-background text-foreground'
          : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground',
        isDragging && 'shadow-lg ring-1 ring-primary/30'
      )}
      onClick={() => onSwitch(tabPath)}
      onContextMenu={(e) => onContextMenu(e, tabPath)}
    >
      {/* Drag handle */}
      <div
        className={cn(
          'flex h-4 w-3 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 active:cursor-grabbing',
          isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </div>

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
        onClick={(e) => {
          e.stopPropagation()
          onClose(tabPath)
        }}
        title="Close tab"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

/**
 * Browser-style tab bar with drag-to-reorder. Shows one tab per open
 * file, highlights the active tab, has a "+" button for new notes,
 * right-click "Close All", and is vertically resizable.
 * @returns The rendered tab bar.
 */
export function FileTab(): React.JSX.Element {
  const {
    openTabs,
    openFilePath,
    switchTab,
    closeTab,
    closeAllTabs,
    reorderTabs,
    tree,
    createFile,
    openFile
  } = useVault()
  const { splitPane, focusedPaneId } = usePaneLayout()
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabPath: string } | null>(null)

  // ── Resizable height ──────────────────────────────────────────
  const [barHeight, setBarHeight] = useState(DEFAULT_HEIGHT)
  const resizing = useRef(false)

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      resizing.current = true
      const startY = e.clientY
      const startH = barHeight

      const onMove = (ev: MouseEvent): void => {
        if (!resizing.current) return
        const delta = ev.clientY - startY
        setBarHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + delta)))
      }
      const onUp = (): void => {
        resizing.current = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [barHeight]
  )

  // ── Drag-to-reorder ───────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 5px of movement before starting a drag, so clicks still work
      activationConstraint: { distance: 5 }
    })
  )

  /** Track which tab is being dragged (for detach detection). */
  const draggingTabRef = useRef<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    draggingTabRef.current = String(event.active.id)
  }, [])

  /**
   * On drag end: if dropped on another tab, reorder. If dropped outside
   * the window bounds entirely (and there's more than one tab), detach
   * the tab into a new Electron window.
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const draggedTab = draggingTabRef.current
      draggingTabRef.current = null

      // Normal reorder within the tab bar
      if (over && active.id !== over.id) {
        const oldIndex = openTabs.indexOf(String(active.id))
        const newIndex = openTabs.indexOf(String(over.id))
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderTabs(oldIndex, newIndex)
        }
        return
      }

      // Detach: dropped with no target and we have the pointer coordinates
      if (!over && draggedTab && openTabs.length > 1) {
        const pointerEvent = event.activatorEvent as PointerEvent | MouseEvent | undefined
        const delta = event.delta
        if (pointerEvent && delta) {
          const dropX = pointerEvent.clientX + delta.x
          const dropY = pointerEvent.clientY + delta.y

          // Check if the drop point is outside the visible window area
          const outsideWindow =
            dropX < 0 || dropY < 0 || dropX > window.innerWidth || dropY > window.innerHeight

          if (outsideWindow) {
            // Convert to screen coordinates for the new window position
            const screenX = window.screenX + dropX
            const screenY = window.screenY + dropY

            // Close the tab in this window, open in a new one
            closeTab(draggedTab)
            void window.api.window.createFileWindow(draggedTab, screenX, screenY)
          }
        }
      }
    },
    [openTabs, reorderTabs, closeTab]
  )

  // Stable array of tab IDs for SortableContext
  const tabIds = useMemo(() => openTabs, [openTabs])

  /** Create a new Untitled note and open it. */
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
              {openTabs.map((tabPath) => (
                <SortableTab
                  key={tabPath}
                  tabPath={tabPath}
                  isActive={tabPath === openFilePath}
                  onSwitch={switchTab}
                  onClose={closeTab}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </SortableContext>
          </DndContext>

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
        onMouseDown={onResizeStart}
        className="absolute bottom-0 left-0 right-0 z-10 h-1 cursor-row-resize transition-colors hover:bg-primary/30 active:bg-primary/50"
      />

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          {/* Invisible backdrop to dismiss */}
          <div
            className="fixed inset-0 z-50"
            onClick={dismissCtx}
            onContextMenu={(e) => {
              e.preventDefault()
              dismissCtx()
            }}
          />
          <div
            className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover py-1 text-sm shadow-xl"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left text-popover-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                closeTab(ctxMenu.tabPath)
                dismissCtx()
              }}
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
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-popover-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                switchTab(ctxMenu.tabPath)
                splitPane(focusedPaneId, 'horizontal', ctxMenu.tabPath)
                dismissCtx()
              }}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Split Right
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-popover-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                switchTab(ctxMenu.tabPath)
                splitPane(focusedPaneId, 'vertical', ctxMenu.tabPath)
                dismissCtx()
              }}
            >
              <Rows2 className="h-3.5 w-3.5" />
              Split Down
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left text-destructive hover:bg-accent"
              onClick={() => {
                closeAllTabs()
                dismissCtx()
              }}
            >
              Close All Tabs
            </button>
          </div>
        </>
      )}
    </div>
  )
}
