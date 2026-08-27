/**
 * Obsidian-compatible canvas editor. Loads/saves `.canvas` JSON files
 * from the vault using React Flow for the spatial layout.
 *
 * Supports four card types (text, file, link, group), edges with
 * optional labels, drag-to-create, and colour coding.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionMode,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CANVAS_NODE_TYPES } from './canvas-nodes'
import { CanvasToolbar, type CanvasTool } from './canvas-toolbar'
import type {
  CanvasDocument,
  CanvasNode,
  CanvasEdge,
} from './canvas-types'
import {
  DEFAULT_TEXT_NODE,
  DEFAULT_FILE_NODE,
  DEFAULT_LINK_NODE,
  DEFAULT_GROUP_NODE,
} from './canvas-types'

// ─── Helpers ────────────────────────────────────────────────────────────────

let idCounter = 0

/** Generate a unique ID for new canvas elements. */
function newId(): string {
  return `${Date.now().toString(36)}-${(idCounter++).toString(36)}`
}

/**
 * Convert a JSON Canvas node to a React Flow node.
 * @param cn The canvas node from the file.
 * @returns The React Flow node.
 */
function canvasToFlowNode(cn: CanvasNode): Node {
  const base = {
    id: cn.id,
    position: { x: cn.x, y: cn.y },
    style: { width: cn.width, height: cn.height },
    width: cn.width,
    height: cn.height,
  }

  switch (cn.type) {
    case 'text':
      return { ...base, type: 'canvas-text', data: { canvasType: 'text', text: cn.text, color: cn.color } }
    case 'file':
      return { ...base, type: 'canvas-file', data: { canvasType: 'file', file: cn.file, color: cn.color } }
    case 'link':
      return { ...base, type: 'canvas-link', data: { canvasType: 'link', url: cn.url, color: cn.color } }
    case 'group':
      return {
        ...base,
        type: 'canvas-group',
        data: { canvasType: 'group', label: cn.label, color: cn.color },
        zIndex: -1,
      }
  }
}

/**
 * Convert a React Flow node back to a JSON Canvas node.
 * @param n The React Flow node.
 * @returns The canvas node for serialisation.
 */
function flowToCanvasNode(n: Node): CanvasNode {
  const base = {
    id: n.id,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    width: Math.round(n.measured?.width ?? n.width ?? 260),
    height: Math.round(n.measured?.height ?? n.height ?? 120),
    color: (n.data as Record<string, unknown>).color as string | undefined,
  }
  const d = n.data as Record<string, unknown>

  switch (d.canvasType) {
    case 'text':
      return { ...base, type: 'text', text: (d.text as string) ?? '' }
    case 'file':
      return { ...base, type: 'file', file: (d.file as string) ?? '' }
    case 'link':
      return { ...base, type: 'link', url: (d.url as string) ?? '' }
    case 'group':
      return { ...base, type: 'group', label: (d.label as string) ?? '' }
    default:
      return { ...base, type: 'text', text: '' }
  }
}

/**
 * Convert a JSON Canvas edge to a React Flow edge.
 * @param ce The canvas edge from the file.
 * @returns The React Flow edge.
 */
function canvasToFlowEdge(ce: CanvasEdge): Edge {
  return {
    id: ce.id,
    source: ce.fromNode,
    target: ce.toNode,
    sourceHandle: ce.fromSide ?? undefined,
    targetHandle: ce.toSide ? `target-${ce.toSide}` : undefined,
    label: ce.label,
    markerEnd: (ce.toEnd ?? 'arrow') !== 'none'
      ? { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' }
      : undefined,
    style: { stroke: '#71717a', strokeWidth: 2 },
    type: 'default',
  }
}

/**
 * Convert a React Flow edge back to a JSON Canvas edge.
 * @param e The React Flow edge.
 * @returns The canvas edge for serialisation.
 */
function flowToCanvasEdge(e: Edge): CanvasEdge {
  const result: CanvasEdge = {
    id: e.id,
    fromNode: e.source,
    toNode: e.target,
  }
  if (e.sourceHandle) result.fromSide = e.sourceHandle as CanvasEdge['fromSide']
  if (e.targetHandle) {
    const side = e.targetHandle.replace('target-', '')
    result.toSide = side as CanvasEdge['toSide']
  }
  if (e.label) result.label = String(e.label)
  return result
}

// ─── Autosave delay ─────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 1200

// ─── Inner component (needs ReactFlowProvider) ─────────────────────────────

interface CanvasInnerProps {
  filePath: string
}

/**
 * Inner canvas editor that handles all state, loading/saving, and
 * the toolbar interactions. Must be inside a ReactFlowProvider.
 * @param props The vault-relative file path.
 * @returns The rendered canvas.
 */
function CanvasInner({ filePath }: CanvasInnerProps): React.JSX.Element {
  const reactFlow = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filePathRef = useRef(filePath)

  useEffect(() => { filePathRef.current = filePath }, [filePath])

  // ── Callbacks injected into node data ──────────────────────────

  const handleTextChange = useCallback((nodeId: string, text: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, text } } : n,
      ),
    )
    setDirty(true)
  }, [setNodes])

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
      ),
    )
    setDirty(true)
  }, [setNodes])

  /** Inject callback refs into node data so cards can commit edits. */
  const injectCallbacks = useCallback(
    (flowNodes: Node[]): Node[] =>
      flowNodes.map((n) => {
        const d = n.data as Record<string, unknown>
        if (d.canvasType === 'text') {
          return { ...n, data: { ...d, onTextChange: handleTextChange } }
        }
        if (d.canvasType === 'group') {
          return { ...n, data: { ...d, onLabelChange: handleLabelChange } }
        }
        return n
      }),
    [handleTextChange, handleLabelChange],
  )

  // ── Load ───────────────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setDirty(false)

    void (async () => {
      try {
        const raw = await window.api.vault.readFile(filePath)
        const doc = (raw.trim() ? JSON.parse(raw) : { nodes: [], edges: [] }) as CanvasDocument
        const flowNodes = injectCallbacks((doc.nodes ?? []).map(canvasToFlowNode))
        const flowEdges = (doc.edges ?? []).map(canvasToFlowEdge)
        setNodes(flowNodes)
        setEdges(flowEdges)

        // Fit view after initial render
        setTimeout(() => {
          reactFlow.fitView({ padding: 0.15 })
        }, 100)
      } catch (err) {
        console.error('Failed to load .canvas file:', err)
        setNodes([])
        setEdges([])
      }
      setLoading(false)
    })()

    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath])

  // ── Save ───────────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const currentNodes = reactFlow.getNodes()
      const currentEdges = reactFlow.getEdges()
      const doc: CanvasDocument = {
        nodes: currentNodes.map(flowToCanvasNode),
        edges: currentEdges.map(flowToCanvasEdge),
      }
      await window.api.vault.writeFile(filePathRef.current, JSON.stringify(doc, null, 2))
      setDirty(false)
    } catch (err) {
      console.error('Canvas save failed:', err)
    }
    setSaving(false)
  }, [reactFlow])

  /** Schedule an autosave after changes. */
  const scheduleSave = useCallback(() => {
    setDirty(true)
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(() => { void save() }, AUTOSAVE_DELAY)
  }, [save])

  // ── Track selection ────────────────────────────────────────────

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    setSelectedNodeIds(new Set(sel.map((n) => n.id)))
  }, [])

  // ── Click to create cards ──────────────────────────────────────

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === 'select') return

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const id = newId()

      let newNode: Node

      switch (activeTool) {
        case 'text':
          newNode = canvasToFlowNode({
            id,
            x: position.x,
            y: position.y,
            ...DEFAULT_TEXT_NODE,
          })
          break
        case 'file': {
          // Prompt for file path (simple prompt for now)
          const file = window.prompt('Vault file path (e.g. notes/idea.md):')
          if (!file) return
          newNode = canvasToFlowNode({
            id,
            x: position.x,
            y: position.y,
            ...DEFAULT_FILE_NODE,
            file,
          })
          break
        }
        case 'link': {
          const url = window.prompt('URL:')
          if (!url) return
          newNode = canvasToFlowNode({
            id,
            x: position.x,
            y: position.y,
            ...DEFAULT_LINK_NODE,
            url,
          })
          break
        }
        case 'group':
          newNode = canvasToFlowNode({
            id,
            x: position.x,
            y: position.y,
            ...DEFAULT_GROUP_NODE,
          })
          break
        default:
          return
      }

      // Inject callbacks
      const withCallbacks = injectCallbacks([newNode])[0]
      setNodes((nds) => [...nds, withCallbacks])
      scheduleSave()
      setActiveTool('select')
    },
    [activeTool, reactFlow, injectCallbacks, setNodes, scheduleSave],
  )

  // ── Connect edges ──────────────────────────────────────────────

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        id: newId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#71717a' },
        style: { stroke: '#71717a', strokeWidth: 2 },
        type: 'default',
      }
      setEdges((eds) => [...eds, edge])
      scheduleSave()
    },
    [setEdges, scheduleSave],
  )

  // ── Node/edge changes → mark dirty ────────────────────────────

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      // Only mark dirty for position/resize/remove changes, not selection
      const meaningful = changes.some(
        (c) => c.type === 'position' || c.type === 'dimensions' || c.type === 'remove',
      )
      if (meaningful) scheduleSave()
    },
    [onNodesChange, scheduleSave],
  )

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      const meaningful = changes.some((c) => c.type === 'remove')
      if (meaningful) scheduleSave()
    },
    [onEdgesChange, scheduleSave],
  )

  // ── Colour selected nodes ─────────────────────────────────────

  const selectedColor = useMemo(() => {
    if (selectedNodeIds.size === 0) return undefined
    const first = nodes.find((n) => selectedNodeIds.has(n.id))
    return (first?.data as Record<string, unknown>)?.color as string | undefined
  }, [selectedNodeIds, nodes])

  const handleColorChange = useCallback(
    (color: string | undefined) => {
      setNodes((nds) =>
        nds.map((n) =>
          selectedNodeIds.has(n.id)
            ? { ...n, data: { ...n.data, color } }
            : n,
        ),
      )
      scheduleSave()
    },
    [selectedNodeIds, setNodes, scheduleSave],
  )

  // ── Delete selected on Backspace/Delete ────────────────────────

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedNodeIds.size > 0) {
          setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)))
          // Also remove edges connected to deleted nodes
          setEdges((eds) =>
            eds.filter(
              (ed) => !selectedNodeIds.has(ed.source) && !selectedNodeIds.has(ed.target),
            ),
          )
          scheduleSave()
        }
      }
      // Ctrl/Cmd+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void save()
      }
    },
    [selectedNodeIds, setNodes, setEdges, scheduleSave, save],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading canvas…
      </div>
    )
  }

  return (
    <div className="relative h-full w-full" onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={CANVAS_NODE_TYPES}
        connectionMode={ConnectionMode.Loose}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        className="canvas-flow"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#333" />
        <Controls
          showInteractive={false}
          className="!bg-card/90 !border-border !shadow-lg !rounded-xl [&>button]:!bg-transparent [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-accent [&>button:hover]:!text-foreground"
        />
        <MiniMap
          nodeColor="#404040"
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-card/90 !border-border !rounded-lg !shadow-lg"
          pannable
          zoomable
        />
      </ReactFlow>

      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onSave={() => void save()}
        saving={saving}
        dirty={dirty}
        selectedColor={selectedColor}
        onColorChange={handleColorChange}
        hasSelection={selectedNodeIds.size > 0}
      />
    </div>
  )
}

// ─── Public wrapper with Provider ───────────────────────────────────────────

interface CanvasEditorProps {
  filePath: string
}

/**
 * Obsidian-compatible canvas editor. Wraps React Flow in a provider
 * and delegates to CanvasInner.
 * @param props The vault-relative .canvas file path.
 * @returns The rendered canvas editor.
 */
export function CanvasEditor({ filePath }: CanvasEditorProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasInner filePath={filePath} />
    </ReactFlowProvider>
  )
}
