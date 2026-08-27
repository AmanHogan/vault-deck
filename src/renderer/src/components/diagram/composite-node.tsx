import { memo, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  TEXT_SIZE_PX,
  nodeColorFor,
  nodeLabelFor,
  type LineStyle,
  type NodeShape,
  type TextSize,
} from '@/lib/diagram-types'

export interface CompositeNodeData extends Record<string, unknown> {
  label: string
  /** A preset kind key, or free text for a custom kind. */
  kind: string
  description?: string
  shape: NodeShape
  fillColor: string
  borderStyle: LineStyle
  /** Fully transparent (outline-only) background when explicitly false. */
  filled?: boolean
  /** Font size for "text" kind nodes only. */
  fontSize?: TextSize
  hasChildren: boolean
  expanded: boolean
  readOnly?: boolean
  /** True for the read-only stand-ins shown at the edge of a scope to
   * represent connections to/from nodes outside the current view. */
  isGhost?: boolean
  /** Whether the canvas is currently in Excalidraw-style light mode. */
  isLightTheme?: boolean
  /** True while this "text" kind node is being typed into inline. */
  isEditingText?: boolean
  onToggleExpand: (id: string) => void
  onDrillIn: (id: string) => void
  /** Enters inline-edit mode for a "text" kind node. */
  onStartTextEdit: (id: string) => void
  /** Commits (or, if `cancel`, discards) inline-edited text and exits edit mode. */
  onCommitTextEdit: (id: string, text: string, cancel?: boolean) => void
}

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

const BORDER_STYLE_CSS: Record<LineStyle, string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
}

const SHAPE_STYLE: Record<NodeShape, React.CSSProperties> = {
  rectangle: { borderRadius: '0.25rem' },
  rounded: { borderRadius: '1rem' },
  diamond: { borderRadius: 0, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  ellipse: { borderRadius: '50%' },
}

const CENTERED_SHAPES: NodeShape[] = ['diamond', 'ellipse']

const FILL_BASE_DARK: [number, number, number] = [30, 32, 32]
const FILL_BASE_LIGHT: [number, number, number] = [252, 252, 252]

/**
 * Blend a hex accent color into the theme's base so each box reads as a
 * desaturated tint of its category color.
 * @param hex Accent color, e.g. "#3b82f6".
 * @param ratio How much of the accent to mix in (0–1).
 * @param base The base to tint into — dark or light canvas.
 * @returns An `rgb(...)` string safe for inline styles.
 */
function tintFill(hex: string, ratio: number, base: [number, number, number]): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return `rgb(${base.join(',')})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (c: number, baseC: number): number => Math.round(c * ratio + baseC * (1 - ratio))
  return `rgb(${mix(r, base[0])}, ${mix(g, base[1])}, ${mix(b, base[2])})`
}

interface TextNodeProps {
  id: string
  label: string
  color: string
  fontSize: TextSize
  selected: boolean
  readOnly?: boolean
  isEditingText?: boolean
  onStartTextEdit: (id: string) => void
  onCommitTextEdit: (id: string, text: string, cancel?: boolean) => void
}

/** The freeform "text" kind: a borderless, fill-less label. Double-click (or
 * placement via the Text tool) enters inline editing directly on the canvas. */
function TextNode({
  id,
  label,
  color,
  fontSize,
  selected,
  readOnly,
  isEditingText,
  onStartTextEdit,
  onCommitTextEdit,
}: TextNodeProps): React.JSX.Element {
  const [draft, setDraft] = useState(label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditingText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(label)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      })
    }
  }, [isEditingText, label])

  return (
    <div className="group relative h-full w-full">
      <NodeResizer
        isVisible={selected && !readOnly && !isEditingText}
        minWidth={40}
        minHeight={24}
        color={color}
        handleStyle={{ width: 8, height: 8 }}
        lineStyle={{ borderColor: 'transparent' }}
      />
      <div
        className="flex h-full w-full items-center overflow-hidden rounded-sm p-1"
        style={{
          cursor: readOnly ? 'default' : 'text',
          outline: selected ? '1px dashed var(--muted-foreground)' : undefined,
          outlineOffset: 2,
        }}
        onDoubleClick={(event) => {
          if (readOnly) return
          event.stopPropagation()
          onStartTextEdit(id)
        }}
      >
        {isEditingText ? (
          <textarea
            ref={textareaRef}
            className="h-full w-full resize-none bg-transparent leading-snug outline-none"
            style={{ color, fontSize: TEXT_SIZE_PX[fontSize] }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                onCommitTextEdit(id, draft, true)
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onCommitTextEdit(id, draft)
              }
            }}
            onBlur={() => onCommitTextEdit(id, draft)}
          />
        ) : (
          <span
            className="whitespace-pre-wrap break-words font-medium leading-snug"
            style={{ color, fontSize: TEXT_SIZE_PX[fontSize] }}
            title={label}
          >
            {label || (readOnly ? '' : 'Double-click to edit')}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * A diagram node rendered as a card. Collapsed: a compact labeled card.
 * Expanded: a bordered container sized from the node's `style`, with child
 * nodes positioned inside it by React Flow via `parentId`. Double-clicking
 * drills into the node's children as a new scope; the chevron expands
 * children inline. Ghost nodes render dashed and read-only.
 * @param props React Flow node props, including this node's id and data.
 * @returns The rendered node.
 */
function CompositeNodeImpl({ id, data, selected }: NodeProps): React.JSX.Element {
  const {
    label,
    kind,
    description,
    shape,
    fillColor,
    borderStyle,
    filled,
    fontSize,
    hasChildren,
    expanded,
    readOnly,
    isGhost,
    isLightTheme,
    isEditingText,
    onToggleExpand,
    onDrillIn,
    onStartTextEdit,
    onCommitTextEdit,
  } = data as CompositeNodeData
  const color = fillColor || nodeColorFor(kind)
  const centered = CENTERED_SHAPES.includes(shape)
  const fillBase = isLightTheme ? FILL_BASE_LIGHT : FILL_BASE_DARK

  if (kind === 'text') {
    return (
      <TextNode
        id={id}
        label={label}
        color={color}
        fontSize={fontSize ?? 'md'}
        selected={!!selected}
        readOnly={readOnly}
        isEditingText={isEditingText}
        onStartTextEdit={onStartTextEdit}
        onCommitTextEdit={onCommitTextEdit}
      />
    )
  }

  return (
    <div
      className={`group relative h-full w-full ${isGhost ? 'opacity-60' : ''}`}
      onDoubleClick={(event) => {
        if (isGhost) return
        event.stopPropagation()
        onDrillIn(id)
      }}
    >
      <NodeResizer
        isVisible={selected && !readOnly && !isGhost}
        minWidth={180}
        minHeight={64}
        color={color}
        handleStyle={{ width: 8, height: 8 }}
      />

      <div
        className={`h-full w-full shadow-md transition-shadow ${isGhost ? '' : 'cursor-pointer hover:shadow-lg'}`}
        style={{
          ...SHAPE_STYLE[shape],
          backgroundColor:
            filled === false && !isGhost ? 'transparent' : tintFill(color, isGhost ? 0.1 : 0.18, fillBase),
          borderWidth: 2,
          borderStyle: isGhost ? 'dashed' : BORDER_STYLE_CSS[borderStyle],
          borderColor: color,
          boxShadow: selected ? `0 0 0 3px ${color}66` : undefined,
        }}
      >
        <div
          className={
            centered
              ? 'flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden p-6 text-center'
              : 'flex h-full w-full flex-col gap-1 overflow-hidden p-3'
          }
        >
          <div className={centered ? 'flex items-center gap-2' : 'flex items-center justify-between gap-2'}>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{ backgroundColor: `${color}26`, color }}
            >
              {nodeLabelFor(kind)}
            </span>
            {hasChildren && !centered && !isGhost ? (
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleExpand(id)
                }}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </div>
          <span className="line-clamp-2 break-words text-sm font-semibold leading-tight" title={label}>
            {label}
            {isGhost ? ' ↗' : ''}
          </span>
          {!expanded && description ? (
            <p className="line-clamp-2 break-words text-xs text-muted-foreground" title={description}>
              {description}
            </p>
          ) : null}
          {hasChildren && centered && !isGhost ? (
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation()
                onToggleExpand(id)
              }}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : null}
        </div>
      </div>

      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          type="source"
          position={position}
          id={position}
          className="!h-2.5 !w-2.5 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

export const CompositeNode = memo(CompositeNodeImpl)
