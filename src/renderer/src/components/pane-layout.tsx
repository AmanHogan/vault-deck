/**
 * Recursive pane layout renderer. Renders leaf panes as file editors
 * and split panes as two children separated by a draggable divider.
 * Supports arbitrary nesting of horizontal/vertical splits.
 */

import { lazy, Suspense, useRef, useCallback } from 'react'
import { usePaneLayout, type PaneNode } from '@/lib/pane-layout-context'
import { cn } from '@/lib/utils'
import { X, Columns2, Rows2 } from 'lucide-react'

const VaultFilePage = lazy(() => import('@/pages/VaultFilePage'))

// ─── Loading fallback ─────────────────────────────────────────────────────

function EditorFallback(): React.JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading editor…
    </div>
  )
}

// ─── Draggable divider ────────────────────────────────────────────────────

interface DividerProps {
  splitId: string
  direction: 'horizontal' | 'vertical'
}

/**
 * A thin draggable bar between two panes. Horizontal splits get a
 * vertical divider, vertical splits get a horizontal one.
 * @param props Split node ID and direction.
 * @returns The rendered divider.
 */
function Divider({ splitId, direction }: DividerProps): React.JSX.Element {
  const { resizeSplit } = usePaneLayout()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const parent = containerRef.current?.parentElement
      if (!parent) return

      const rect = parent.getBoundingClientRect()

      const onMove = (ev: MouseEvent): void => {
        let ratio: number
        if (direction === 'horizontal') {
          ratio = (ev.clientX - rect.left) / rect.width
        } else {
          ratio = (ev.clientY - rect.top) / rect.height
        }
        resizeSplit(splitId, ratio)
      }

      const onUp = (): void => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [direction, resizeSplit, splitId]
  )

  const isHorizontal = direction === 'horizontal'

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      className={cn(
        'group relative z-20 flex-shrink-0 transition-colors',
        isHorizontal
          ? 'w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50'
          : 'h-1 cursor-row-resize hover:bg-primary/30 active:bg-primary/50'
      )}
    >
      {/* Wider invisible hit area */}
      <div
        className={cn(
          'absolute',
          isHorizontal ? '-left-1 -right-1 top-0 bottom-0' : 'left-0 right-0 -top-1 -bottom-1'
        )}
      />
    </div>
  )
}

// ─── Leaf pane ────────────────────────────────────────────────────────────

interface LeafPaneViewProps {
  paneId: string
}

/**
 * Renders a single leaf pane. Shows the file editor for the pane's
 * active file, or a placeholder prompting the user to open a file.
 * @param props The pane ID.
 * @returns The rendered leaf pane.
 */
function LeafPaneView({ paneId }: LeafPaneViewProps): React.JSX.Element {
  const { focusedPaneId, paneFiles, focusPane, closePane, splitPane, isSplit } = usePaneLayout()
  const filePath = paneFiles[paneId] ?? null
  const isFocused = paneId === focusedPaneId

  return (
    <div
      className={cn(
        'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        isFocused && isSplit && 'ring-1 ring-inset ring-primary/20'
      )}
      onClick={() => focusPane(paneId)}
    >
      {/* Pane header — only shown when split */}
      {isSplit && (
        <div className="flex h-7 shrink-0 items-center justify-between border-b border-border bg-[#0e0e0e] px-2 text-xs text-muted-foreground">
          <span className="truncate">{filePath?.split('/').pop() ?? 'Empty pane'}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Split right"
              className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                splitPane(paneId, 'horizontal', filePath)
              }}
            >
              <Columns2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Split down"
              className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                splitPane(paneId, 'vertical', filePath)
              }}
            >
              <Rows2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Close pane"
              className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-accent hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                closePane(paneId)
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Editor content */}
      {filePath ? (
        <Suspense fallback={<EditorFallback />}>
          <VaultFilePage key={filePath} overrideFilePath={filePath} />
        </Suspense>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <p>Open a file from the sidebar or tab bar</p>
        </div>
      )}
    </div>
  )
}

// ─── Recursive layout renderer ───────────────────────────────────────────

interface PaneNodeViewProps {
  node: PaneNode
}

/**
 * Recursively render a pane layout tree. Leaf nodes become editors,
 * split nodes become flex containers with a draggable divider.
 * @param props The tree node to render.
 * @returns The rendered layout subtree.
 */
function PaneNodeView({ node }: PaneNodeViewProps): React.JSX.Element {
  if (node.type === 'leaf') {
    return <LeafPaneView paneId={node.id} />
  }

  const isHorizontal = node.direction === 'horizontal'
  const firstSize = `${node.ratio * 100}%`
  const secondSize = `${(1 - node.ratio) * 100}%`

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1', isHorizontal ? 'flex-row' : 'flex-col')}>
      <div className="flex min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: firstSize }}>
        <PaneNodeView node={node.first} />
      </div>
      <Divider splitId={node.id} direction={node.direction} />
      <div className="flex min-h-0 min-w-0 overflow-hidden" style={{ flexBasis: secondSize }}>
        <PaneNodeView node={node.second} />
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────

/**
 * Top-level pane layout. Renders the full tree from the layout context.
 * @returns The rendered pane layout.
 */
export function PaneLayout(): React.JSX.Element {
  const { layout } = usePaneLayout()
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <PaneNodeView node={layout} />
    </div>
  )
}
