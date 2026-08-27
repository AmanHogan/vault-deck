import { useEffect, useRef, useState } from 'react'
import { Trash2, Group, Ungroup, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EDGE_KIND_LABELS,
  EDGE_STYLES,
  HANDLE_SIDE_LABELS,
  TEXT_SIZE_LABELS,
  nodeColorFor,
  type ArrowStyle,
  type DiagramEdgeData,
  type DiagramNodeData,
  type EdgeKind,
  type HandleSide,
  type LineStyle,
  type NodeShape,
  type TextSize,
} from '@/lib/diagram-types'
import { useResizableWidth } from '@/lib/use-resizable-width'
import { InlineKindPicker } from '@/components/diagram/kind-picker'

const TEXT_SIZES = Object.keys(TEXT_SIZE_LABELS) as TextSize[]

const EDGE_KINDS = Object.keys(EDGE_KIND_LABELS) as EdgeKind[]
const HANDLE_SIDES = Object.keys(HANDLE_SIDE_LABELS) as HandleSide[]
const SHAPES: { value: NodeShape; label: string; radius: string }[] = [
  { value: 'rectangle', label: 'Rectangle', radius: '0' },
  { value: 'rounded', label: 'Rounded', radius: '5px' },
  { value: 'diamond', label: 'Diamond', radius: '0' },
  { value: 'ellipse', label: 'Ellipse', radius: '999px' },
]
const LINE_STYLES: { value: LineStyle; label: string; dasharray?: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed', dasharray: '4 3' },
  { value: 'dotted', label: 'Dotted', dasharray: '1.5 2.5' },
]
const ARROW_STYLES: { value: ArrowStyle; label: string }[] = [
  { value: 'forward', label: 'One-way →' },
  { value: 'both', label: 'Bidirectional ↔' },
  { value: 'none', label: 'No arrowheads —' },
]

const PINNED_COLORS_STORAGE_KEY = 'workspace:pinned-colors'
const MAX_PINNED_COLORS = 8

function loadPinnedColors(): string[] {
  try {
    const raw = window.localStorage.getItem(PINNED_COLORS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : []
  } catch {
    return []
  }
}

function savePinnedColors(colors: string[]): void {
  try {
    window.localStorage.setItem(PINNED_COLORS_STORAGE_KEY, JSON.stringify(colors))
  } catch {
    // localStorage unavailable — pins just won't persist.
  }
}

/**
 * A row of small icon buttons instead of a text dropdown — each button is a
 * tiny visual preview of the option itself.
 */
function IconOptionRow<Option extends { value: string; label: string }>({
  options,
  value,
  onChange,
  disabled,
  renderPreview,
}: {
  options: Option[]
  value: Option['value']
  onChange: (value: Option['value']) => void
  disabled?: boolean
  renderPreview: (option: Option, active: boolean) => React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`flex h-9 flex-1 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
            option.value === value
              ? 'border-primary bg-primary/10'
              : 'border-input hover:bg-accent'
          }`}
        >
          {renderPreview(option, option.value === value)}
        </button>
      ))}
    </div>
  )
}

interface FillColorPickerProps {
  value: string
  onCommit: (color: string) => void
}

/**
 * Native color input that only commits on the picker's `change` event —
 * i.e. once, when the user closes it — instead of on every drag movement.
 * @param props The current color and a commit callback.
 * @returns The rendered color input.
 */
function FillColorPicker({ value, onCommit }: FillColorPickerProps): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  const [local, setLocal] = useState(value)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value)
  }, [value])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleChange = (e: Event): void => {
      onCommit((e.target as HTMLInputElement).value)
    }
    el.addEventListener('change', handleChange)
    return (): void => el.removeEventListener('change', handleChange)
  }, [onCommit])

  return (
    <input
      ref={ref}
      type="color"
      className="h-8 w-full cursor-pointer rounded-md border border-input bg-transparent"
      value={local}
      onInput={(e) => setLocal(e.currentTarget.value)}
    />
  )
}

interface PinnedColorRowProps {
  value: string
  onPick: (color: string) => void
  disabled?: boolean
}

/**
 * Small palette of colors the user has pinned for reuse. The current fill
 * color can be pinned with the "+" swatch; a pinned swatch can be unpinned
 * with a right-click.
 * @param props The current fill color, a pick callback, and whether disabled.
 * @returns The rendered swatch row.
 */
function PinnedColorRow({ value, onPick, disabled }: PinnedColorRowProps): React.JSX.Element {
  const [pinned, setPinned] = useState<string[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinned(loadPinnedColors())
  }, [])

  const pinCurrent = (): void => {
    setPinned((prev) => {
      if (prev.includes(value)) return prev
      const next = [value, ...prev].slice(0, MAX_PINNED_COLORS)
      savePinnedColors(next)
      return next
    })
  }

  const unpin = (color: string): void => {
    setPinned((prev) => {
      const next = prev.filter((c) => c !== color)
      savePinnedColors(next)
      return next
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pinned.map((color) => (
        <button
          key={color}
          type="button"
          title={`${color} — right-click to unpin`}
          disabled={disabled}
          onClick={() => onPick(color)}
          onContextMenu={(e) => {
            e.preventDefault()
            unpin(color)
          }}
          className={`h-5 w-5 shrink-0 rounded-full border transition-transform hover:scale-110 disabled:opacity-50 ${
            color === value ? 'ring-2 ring-primary ring-offset-1 ring-offset-sidebar' : 'border-border'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
      <button
        type="button"
        title="Pin the current color"
        disabled={disabled || pinned.includes(value)}
        onClick={pinCurrent}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground text-[10px] leading-none text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30"
      >
        +
      </button>
    </div>
  )
}

interface PropertiesPanelProps {
  readOnly?: boolean
  selectedNode: DiagramNodeData | null
  selectedEdge: DiagramEdgeData | null
  selectedNodeIds: string[]
  onUpdateNode: (id: string, patch: Partial<DiagramNodeData>) => void
  onUpdateEdge: (id: string, patch: Partial<DiagramEdgeData>) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
  onGroup: (ids: string[]) => void
  onUngroup: (id: string) => void
}

/**
 * Side panel for editing the selected node or edge's style and metadata,
 * plus grouping multi-selected nodes.
 * @param props Selection state and mutation callbacks from the canvas.
 * @returns The rendered panel.
 */
export function PropertiesPanel({
  readOnly = false,
  selectedNode,
  selectedEdge,
  selectedNodeIds,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onGroup,
  onUngroup,
}: PropertiesPanelProps): React.JSX.Element {
  const { width, onPointerDown } = useResizableWidth(288, 240, 480, 'left')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (window.innerWidth < 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true)
    }
  }, [])

  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center border-l bg-sidebar py-3">
        <button
          type="button"
          title="Expand panel"
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col gap-4 overflow-y-auto border-l bg-sidebar p-4"
    >
      <div
        onPointerDown={onPointerDown}
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Properties
        </p>
        <button
          type="button"
          title="Collapse panel"
          onClick={() => setCollapsed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {!readOnly && selectedNodeIds.length >= 2 ? (
        <Button size="sm" variant="secondary" onClick={() => onGroup(selectedNodeIds)}>
          <Group className="h-3.5 w-3.5" /> Group {selectedNodeIds.length} nodes
        </Button>
      ) : null}

      {selectedNode ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Node
          </p>

          <label className="flex flex-col gap-1 text-xs">
            Label
            <Input
              disabled={readOnly}
              value={selectedNode.label}
              onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
            />
          </label>

          <div className="flex flex-col gap-1 text-xs">
            Kind
            <InlineKindPicker
              disabled={readOnly}
              currentKind={selectedNode.kind}
              onPick={(kind) => onUpdateNode(selectedNode.id, { kind })}
            />
          </div>

          {selectedNode.kind !== 'text' ? (
            <>
              <div className="flex flex-col gap-1 text-xs">
                Shape
                <IconOptionRow
                  options={SHAPES}
                  value={selectedNode.shape ?? 'rounded'}
                  onChange={(shape) => onUpdateNode(selectedNode.id, { shape })}
                  disabled={readOnly}
                  renderPreview={(option) => (
                    <span
                      className="h-4 w-6 border-[1.5px] border-current"
                      style={{ borderRadius: option.radius, clipPath: option.value === 'diamond' ? 'polygon(50% 0,100% 50%,50% 100%,0 50%)' : undefined }}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1 text-xs">
                Border style
                <IconOptionRow
                  options={LINE_STYLES}
                  value={selectedNode.borderStyle ?? 'solid'}
                  onChange={(borderStyle) => onUpdateNode(selectedNode.id, { borderStyle })}
                  disabled={readOnly}
                  renderPreview={(option) => (
                    <svg width="24" height="8" viewBox="0 0 24 8" className="overflow-visible">
                      <line
                        x1="1"
                        y1="4"
                        x2="23"
                        y2="4"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeDasharray={option.dasharray}
                      />
                    </svg>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1 text-xs">
                Fill
                <IconOptionRow
                  options={[
                    { value: 'filled' as const, label: 'Filled' },
                    { value: 'outline' as const, label: 'Outline' },
                  ]}
                  value={selectedNode.filled === false ? 'outline' : 'filled'}
                  onChange={(value) => onUpdateNode(selectedNode.id, { filled: value === 'filled' })}
                  disabled={readOnly}
                  renderPreview={(option) => (
                    <span
                      className="h-4 w-4 rounded-sm border-[1.5px] border-current"
                      style={{ backgroundColor: option.value === 'filled' ? 'currentColor' : 'transparent' }}
                    />
                  )}
                />
              </div>

              {!readOnly ? (
                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="flex flex-col gap-1">
                    {selectedNode.filled === false ? 'Outline color' : 'Fill color'}
                    <FillColorPicker
                      value={selectedNode.fillColor ?? nodeColorFor(selectedNode.kind)}
                      onCommit={(color) => onUpdateNode(selectedNode.id, { fillColor: color })}
                    />
                  </label>
                  <PinnedColorRow
                    value={selectedNode.fillColor ?? nodeColorFor(selectedNode.kind)}
                    onPick={(color) => onUpdateNode(selectedNode.id, { fillColor: color })}
                  />
                </div>
              ) : null}

              <label className="flex flex-col gap-1 text-xs">
                Description
                <Textarea
                  disabled={readOnly}
                  className="min-h-[60px]"
                  value={selectedNode.description ?? ''}
                  onChange={(e) => onUpdateNode(selectedNode.id, { description: e.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              {!readOnly ? (
                <label className="flex flex-col gap-1 text-xs">
                  Text color
                  <FillColorPicker
                    value={selectedNode.fillColor ?? nodeColorFor(selectedNode.kind)}
                    onCommit={(color) => onUpdateNode(selectedNode.id, { fillColor: color })}
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-1 text-xs">
                Size
                <Select
                  disabled={readOnly}
                  value={selectedNode.fontSize ?? 'md'}
                  onValueChange={(value) => onUpdateNode(selectedNode.id, { fontSize: value as TextSize })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {TEXT_SIZE_LABELS[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <p className="text-[11px] text-muted-foreground">
                Double-click the text on the canvas to edit it — or resize it like a node by
                dragging its corner handles.
              </p>
            </>
          )}

          {!readOnly ? (
            <div className="flex gap-2">
              {selectedNode.kind === 'group' ? (
                <Button size="sm" variant="secondary" onClick={() => onUngroup(selectedNode.id)}>
                  <Ungroup className="h-3.5 w-3.5" /> Ungroup
                </Button>
              ) : null}
              <Button size="sm" variant="destructive" onClick={() => onDeleteNode(selectedNode.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedEdge ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connection
          </p>

          <label className="flex flex-col gap-1 text-xs">
            Label
            <Input
              disabled={readOnly}
              value={selectedEdge.label ?? ''}
              onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Kind
            <Select
              disabled={readOnly}
              value={selectedEdge.kind}
              onValueChange={(value) => onUpdateEdge(selectedEdge.id, { kind: value as EdgeKind })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDGE_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {EDGE_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Source side
              <Select
                disabled={readOnly}
                value={selectedEdge.sourceHandle ?? 'auto'}
                onValueChange={(value) =>
                  onUpdateEdge(selectedEdge.id, {
                    sourceHandle: value === 'auto' ? undefined : (value as HandleSide),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {HANDLE_SIDES.map((side) => (
                    <SelectItem key={side} value={side}>
                      {HANDLE_SIDE_LABELS[side]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Target side
              <Select
                disabled={readOnly}
                value={selectedEdge.targetHandle ?? 'auto'}
                onValueChange={(value) =>
                  onUpdateEdge(selectedEdge.id, {
                    targetHandle: value === 'auto' ? undefined : (value as HandleSide),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {HANDLE_SIDES.map((side) => (
                    <SelectItem key={side} value={side}>
                      {HANDLE_SIDE_LABELS[side]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            Arrow style
            <Select
              disabled={readOnly}
              value={selectedEdge.arrowStyle ?? 'forward'}
              onValueChange={(value) =>
                onUpdateEdge(selectedEdge.id, { arrowStyle: value as ArrowStyle })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARROW_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Line style
            <Select
              disabled={readOnly}
              value={selectedEdge.lineStyle ?? EDGE_STYLES[selectedEdge.kind].lineStyle}
              onValueChange={(value) =>
                onUpdateEdge(selectedEdge.id, { lineStyle: value as LineStyle })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {!readOnly ? (
            <Button size="sm" variant="destructive" onClick={() => onDeleteEdge(selectedEdge.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          ) : null}
        </div>
      ) : null}

      {!selectedNode && !selectedEdge ? (
        <p className="text-xs text-muted-foreground">
          Select a node or connection to edit its style. Shift-click to multi-select nodes for
          grouping. Double-click a node to drill into it — even an empty one, so you can add its
          first child. Drag an edge&apos;s endpoint to reconnect it.
        </p>
      ) : null}
    </div>
  )
}
