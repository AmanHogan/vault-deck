/**
 * Manages a recursive binary-split pane layout for side-by-side editing.
 * Each leaf pane independently displays one file. The focused pane is where
 * tab clicks route their file.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

// ─── Layout tree types ────────────────────────────────────────────────────

/** A leaf pane that displays a single file. */
export interface LeafPane {
  type: 'leaf'
  id: string
}

/** A split node with two children and a draggable divider. */
export interface SplitPane {
  type: 'split'
  id: string
  direction: 'horizontal' | 'vertical'
  /** Proportion of the first child (0–1). */
  ratio: number
  first: PaneNode
  second: PaneNode
}

export type PaneNode = LeafPane | SplitPane

// ─── Context types ────────────────────────────────────────────────────────

interface PaneLayoutContextValue {
  /** The root of the layout tree. */
  layout: PaneNode
  /** ID of the pane that receives tab clicks. */
  focusedPaneId: string
  /** Map from pane ID → currently displayed file path (or null). */
  paneFiles: Record<string, string | null>

  /** Split an existing pane, placing a file in the new half. */
  splitPane: (
    paneId: string,
    direction: 'horizontal' | 'vertical',
    filePath?: string | null
  ) => void
  /** Close a pane (collapses its parent split). */
  closePane: (paneId: string) => void
  /** Focus a pane so tab clicks route to it. */
  focusPane: (paneId: string) => void
  /** Set which file a specific pane displays. */
  setPaneFile: (paneId: string, filePath: string | null) => void
  /** Resize a split node's divider ratio. */
  resizeSplit: (splitId: string, ratio: number) => void
  /** Whether there are multiple panes (i.e. at least one split). */
  isSplit: boolean
}

const PaneLayoutContext = createContext<PaneLayoutContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function usePaneLayout(): PaneLayoutContextValue {
  const ctx = useContext(PaneLayoutContext)
  if (!ctx) throw new Error('usePaneLayout must be used inside <PaneLayoutProvider>')
  return ctx
}

// ─── Tree helpers ─────────────────────────────────────────────────────────

let _nextId = 1

/** Generate a unique pane ID. */
function uid(): string {
  return `pane-${_nextId++}`
}

/**
 * Collect all leaf pane IDs from the tree.
 * @param node The root node to walk.
 * @returns Array of leaf pane IDs.
 */
function collectLeafIds(node: PaneNode): string[] {
  if (node.type === 'leaf') return [node.id]
  return [...collectLeafIds(node.first), ...collectLeafIds(node.second)]
}

/**
 * Replace a node in the tree by ID, returning a new tree.
 * @param root The tree root.
 * @param targetId The node ID to replace.
 * @param replacement The new node to insert.
 * @returns A new tree with the node replaced, or null if not found.
 */
function replaceNode(root: PaneNode, targetId: string, replacement: PaneNode): PaneNode | null {
  if (root.id === targetId) return replacement
  if (root.type === 'leaf') return null

  const firstResult = replaceNode(root.first, targetId, replacement)
  if (firstResult) return { ...root, first: firstResult }

  const secondResult = replaceNode(root.second, targetId, replacement)
  if (secondResult) return { ...root, second: secondResult }

  return null
}

/**
 * Remove a leaf from the tree and collapse its parent split.
 * If the removed leaf is the root, returns null (nothing left).
 * Otherwise, the sibling of the removed leaf replaces the parent split.
 * @param root The tree root.
 * @param leafId The leaf ID to remove.
 * @returns The new tree, or null if the tree is now empty.
 */
function removeLeaf(root: PaneNode, leafId: string): PaneNode | null {
  if (root.type === 'leaf') {
    return root.id === leafId ? null : root
  }

  // If one of the direct children is the target leaf, collapse
  if (root.first.type === 'leaf' && root.first.id === leafId) return root.second
  if (root.second.type === 'leaf' && root.second.id === leafId) return root.first

  // Recurse
  const firstResult = removeLeaf(root.first, leafId)
  if (firstResult !== root.first) {
    return firstResult ? { ...root, first: firstResult } : root.second
  }

  const secondResult = removeLeaf(root.second, leafId)
  if (secondResult !== root.second) {
    return secondResult ? { ...root, second: secondResult } : root.first
  }

  return root
}

/**
 * Update a split node's ratio by its ID.
 * @param root The tree root.
 * @param splitId The split node ID.
 * @param ratio The new ratio (0–1).
 * @returns A new tree with the updated ratio.
 */
function updateRatio(root: PaneNode, splitId: string, ratio: number): PaneNode {
  if (root.type === 'leaf') return root
  if (root.id === splitId) return { ...root, ratio }
  return {
    ...root,
    first: updateRatio(root.first, splitId, ratio),
    second: updateRatio(root.second, splitId, ratio)
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────

const INITIAL_PANE_ID = 'pane-0'

/**
 * Provides the pane layout tree and operations to descendants.
 * @param props The children to wrap.
 * @returns The provider element.
 */
export function PaneLayoutProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [layout, setLayout] = useState<PaneNode>({ type: 'leaf', id: INITIAL_PANE_ID })
  const [focusedPaneId, setFocusedPaneId] = useState(INITIAL_PANE_ID)
  const [paneFiles, setPaneFiles] = useState<Record<string, string | null>>({
    [INITIAL_PANE_ID]: null
  })

  const focusPane = useCallback((paneId: string) => {
    setFocusedPaneId(paneId)
  }, [])

  const setPaneFile = useCallback((paneId: string, filePath: string | null) => {
    setPaneFiles((prev) => ({ ...prev, [paneId]: filePath }))
  }, [])

  const splitPane = useCallback(
    (paneId: string, direction: 'horizontal' | 'vertical', filePath?: string | null) => {
      const newId = uid()

      setLayout((prev) => {
        const replacement: SplitPane = {
          type: 'split',
          id: uid(),
          direction,
          ratio: 0.5,
          first: { type: 'leaf', id: paneId },
          second: { type: 'leaf', id: newId }
        }

        const result = replaceNode(prev, paneId, replacement)
        return result ?? prev
      })

      // The new pane shows the given file (or the same file as the source pane)
      setPaneFiles((prev) => ({
        ...prev,
        [newId]: filePath !== undefined ? (filePath ?? null) : (prev[paneId] ?? null)
      }))

      // Focus the new pane
      setFocusedPaneId(newId)
    },
    []
  )

  const closePane = useCallback((paneId: string) => {
    setLayout((prev) => {
      const result = removeLeaf(prev, paneId)
      if (!result) {
        // Last pane — reset to a fresh leaf
        const freshId = uid()
        setFocusedPaneId(freshId)
        setPaneFiles({ [freshId]: null })
        return { type: 'leaf', id: freshId }
      }
      return result
    })

    // Clean up the removed pane's file entry
    setPaneFiles((prev) => {
      const next = { ...prev }
      delete next[paneId]
      return next
    })

    // If the focused pane was closed, focus the first remaining leaf
    setFocusedPaneId((prev) => {
      if (prev !== paneId) return prev
      // We need to find a remaining leaf — use layout after update
      // Since setState is batched, we read from the latest layout
      return prev // will be corrected in the effect below
    })

    // We'll fix the focused pane in a separate pass
    setLayout((latestLayout) => {
      const leaves = collectLeafIds(latestLayout)
      setFocusedPaneId((prev) => {
        if (leaves.includes(prev)) return prev
        return leaves[0] ?? INITIAL_PANE_ID
      })
      return latestLayout // no change, just reading
    })
  }, [])

  const resizeSplit = useCallback((splitId: string, ratio: number) => {
    const clamped = Math.min(0.85, Math.max(0.15, ratio))
    setLayout((prev) => updateRatio(prev, splitId, clamped))
  }, [])

  const isSplit = layout.type === 'split'

  const value = useMemo(
    () => ({
      layout,
      focusedPaneId,
      paneFiles,
      splitPane,
      closePane,
      focusPane,
      setPaneFile,
      resizeSplit,
      isSplit
    }),
    [
      layout,
      focusedPaneId,
      paneFiles,
      splitPane,
      closePane,
      focusPane,
      setPaneFile,
      resizeSplit,
      isSplit
    ]
  )

  return <PaneLayoutContext.Provider value={value}>{children}</PaneLayoutContext.Provider>
}
