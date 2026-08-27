/**
 * Custom React Flow node components for the JSON Canvas editor.
 * Renders text (markdown), file embed, link, and group card types.
 */

import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react'
import { FileText, Globe, ExternalLink } from 'lucide-react'
import { Markdown } from '@/components/markdown'
import { CANVAS_COLORS } from './canvas-types'

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Resolve a canvas color code (1-6) or hex to a CSS color string. */
function resolveColor(color?: string): string | undefined {
  if (!color) return undefined
  if (color in CANVAS_COLORS) return CANVAS_COLORS[color]
  return color
}

const HANDLE_STYLE = {
  width: 8,
  height: 8,
  background: 'var(--icon-accent, #3b82f6)',
  border: '2px solid rgba(0,0,0,0.3)',
}

/** Common 4-side handles for all canvas nodes. */
function CardHandles(): React.JSX.Element {
  return (
    <>
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="right" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Left} id="left" style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top} id="target-top" style={{ ...HANDLE_STYLE, opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ ...HANDLE_STYLE, opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ ...HANDLE_STYLE, opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="target-left" style={{ ...HANDLE_STYLE, opacity: 0 }} />
    </>
  )
}

// ─── Text node ──────────────────────────────────────────────────────────────

interface TextNodeData {
  canvasType: 'text'
  text: string
  color?: string
  onTextChange?: (id: string, text: string) => void
  [key: string]: unknown
}

/**
 * Canvas text card — renders markdown content with inline editing.
 * Double-click to edit, blur or Escape to finish.
 */
export const TextCardNode = memo(function TextCardNode(
  props: NodeProps & { data: TextNodeData },
): React.JSX.Element {
  const { data, id, selected } = props
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const borderColor = resolveColor(data.color)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDraft(data.text) }, [data.text])

  /** Enter editing on double-click. */
  const handleDoubleClick = useCallback(() => {
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  /** Commit text changes. */
  const commitEdit = useCallback(() => {
    setEditing(false)
    if (draft !== data.text) {
      data.onTextChange?.(id, draft)
    }
  }, [draft, data, id])

  /** Handle keyboard shortcuts in textarea. */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDraft(data.text)
      setEditing(false)
    }
  }, [data.text])

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card shadow-md"
      style={{ borderColor: borderColor ?? (selected ? 'var(--icon-accent, #3b82f6)' : 'hsl(var(--border))') }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        minWidth={120}
        minHeight={60}
        isVisible={selected ?? false}
        lineStyle={{ borderColor: 'var(--icon-accent, #3b82f6)' }}
        handleStyle={{ background: 'var(--icon-accent, #3b82f6)', width: 8, height: 8, borderRadius: 2 }}
      />
      <CardHandles />

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="nodrag nowheel h-full w-full resize-none bg-transparent p-3 text-sm text-foreground outline-none font-mono"
          placeholder="Type markdown…"
        />
      ) : (
        <div className="nodrag nowheel h-full w-full overflow-auto p-3 text-sm">
          {data.text ? (
            <Markdown>{data.text}</Markdown>
          ) : (
            <span className="text-muted-foreground italic">Double-click to edit…</span>
          )}
        </div>
      )}
    </div>
  )
})

// ─── File node ──────────────────────────────────────────────────────────────

interface FileNodeData {
  canvasType: 'file'
  file: string
  color?: string
  [key: string]: unknown
}

/**
 * Canvas file card — shows an embedded preview of a vault file.
 * Renders the file content as markdown (for .md files) or shows
 * the filename with an icon.
 */
export const FileCardNode = memo(function FileCardNode(
  props: NodeProps & { data: FileNodeData },
): React.JSX.Element {
  const { data, selected } = props
  const [content, setContent] = useState<string | null>(null)
  const borderColor = resolveColor(data.color)
  const fileName = data.file.split('/').pop() ?? data.file
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const isMarkdown = ext === 'md' || ext === 'txt'

  useEffect(() => {
    if (isMarkdown) {
      void window.api.vault.readFile(data.file).then(setContent).catch(() => setContent(null))
    }
  }, [data.file, isMarkdown])

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card shadow-md"
      style={{ borderColor: borderColor ?? (selected ? 'var(--icon-accent, #3b82f6)' : 'hsl(var(--border))') }}
    >
      <NodeResizer
        minWidth={140}
        minHeight={80}
        isVisible={selected ?? false}
        lineStyle={{ borderColor: 'var(--icon-accent, #3b82f6)' }}
        handleStyle={{ background: 'var(--icon-accent, #3b82f6)', width: 8, height: 8, borderRadius: 2 }}
      />
      <CardHandles />

      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{fileName}</span>
      </div>

      {/* Body */}
      <div className="nodrag nowheel flex-1 overflow-auto p-3 text-sm">
        {isMarkdown && content !== null ? (
          <Markdown>{content}</Markdown>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <span className="text-xs">{fileName}</span>
          </div>
        )}
      </div>
    </div>
  )
})

// ─── Link node ──────────────────────────────────────────────────────────────

interface LinkNodeData {
  canvasType: 'link'
  url: string
  color?: string
  [key: string]: unknown
}

/**
 * Canvas link card — shows a URL with an external link icon.
 */
export const LinkCardNode = memo(function LinkCardNode(
  props: NodeProps & { data: LinkNodeData },
): React.JSX.Element {
  const { data, selected } = props
  const borderColor = resolveColor(data.color)
  let displayUrl = data.url
  try { displayUrl = new URL(data.url).hostname } catch { /* keep raw */ }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card shadow-md"
      style={{ borderColor: borderColor ?? (selected ? 'var(--icon-accent, #3b82f6)' : 'hsl(var(--border))') }}
    >
      <NodeResizer
        minWidth={140}
        minHeight={60}
        isVisible={selected ?? false}
        lineStyle={{ borderColor: 'var(--icon-accent, #3b82f6)' }}
        handleStyle={{ background: 'var(--icon-accent, #3b82f6)', width: 8, height: 8, borderRadius: 2 }}
      />
      <CardHandles />

      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{displayUrl}</span>
        <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-50" />
      </div>

      {/* Body */}
      <div className="nodrag nowheel flex-1 overflow-auto p-3 text-xs text-muted-foreground break-all">
        {data.url}
      </div>
    </div>
  )
})

// ─── Group node ─────────────────────────────────────────────────────────────

interface GroupNodeData {
  canvasType: 'group'
  label?: string
  color?: string
  onLabelChange?: (id: string, label: string) => void
  [key: string]: unknown
}

/**
 * Canvas group card — a visual container that other cards can sit inside.
 * Has a label at the top and a translucent background.
 */
export const GroupCardNode = memo(function GroupCardNode(
  props: NodeProps & { data: GroupNodeData },
): React.JSX.Element {
  const { data, id, selected } = props
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const borderColor = resolveColor(data.color)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDraft(data.label ?? '') }, [data.label])

  const commitLabel = useCallback(() => {
    setEditing(false)
    if (draft !== (data.label ?? '')) {
      data.onLabelChange?.(id, draft)
    }
  }, [draft, data, id])

  return (
    <div
      className="flex h-full w-full flex-col rounded-lg border-2 border-dashed"
      style={{
        borderColor: borderColor ?? (selected ? 'var(--icon-accent, #3b82f6)' : 'hsl(var(--border))'),
        backgroundColor: borderColor ? `${borderColor}10` : 'hsl(var(--card) / 0.3)',
      }}
    >
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={selected ?? false}
        lineStyle={{ borderColor: 'var(--icon-accent, #3b82f6)' }}
        handleStyle={{ background: 'var(--icon-accent, #3b82f6)', width: 8, height: 8, borderRadius: 2 }}
      />
      <CardHandles />

      {/* Label */}
      <div className="px-3 py-1.5" onDoubleClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') commitLabel() }}
            className="nodrag w-full bg-transparent text-xs font-semibold text-foreground outline-none"
            placeholder="Group label…"
          />
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            {data.label || 'Group'}
          </span>
        )}
      </div>
    </div>
  )
})

// ─── Node type registry ─────────────────────────────────────────────────────

export const CANVAS_NODE_TYPES = {
  'canvas-text': TextCardNode,
  'canvas-file': FileCardNode,
  'canvas-link': LinkCardNode,
  'canvas-group': GroupCardNode,
} as const
