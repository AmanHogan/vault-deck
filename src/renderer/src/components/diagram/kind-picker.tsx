import { useEffect, useRef, useState } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import {
  COMMON_NODE_KINDS,
  NODE_KIND_CATEGORIES,
  NODE_KIND_LABELS,
  NODE_KIND_SUPER_GROUPS,
  nodeColorFor,
  nodeLabelFor,
  type NodeKind,
} from '@/lib/diagram-types'

const RECENT_KINDS_STORAGE_KEY = 'workspace:recent-node-kinds'
const MAX_RECENT_KINDS = 6

function loadRecentKinds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KINDS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((k): k is string => typeof k === 'string')
  } catch {
    return []
  }
}

function saveRecentKind(kind: string): string[] {
  const next = [kind, ...loadRecentKinds().filter((k) => k !== kind)].slice(0, MAX_RECENT_KINDS)
  try {
    window.localStorage.setItem(RECENT_KINDS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable — recents just won't persist.
  }
  return next
}

function KindRow({
  kind,
  currentKind,
  onPick,
}: {
  kind: NodeKind
  currentKind?: string
  onPick: (kind: string) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent ${
        kind === currentKind ? 'bg-accent font-medium' : ''
      }`}
      onClick={() => onPick(kind)}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: nodeColorFor(kind) }}
      />
      {NODE_KIND_LABELS[kind]}
    </button>
  )
}

function PickerSectionHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

/** Collapsible row: a clickable header with a chevron, its rows shown only
 * while expanded. */
function CollapsibleSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-accent"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        {label}
      </button>
      {expanded ? children : null}
    </div>
  )
}

const DEFAULT_EXPANDED = new Set(['Common', NODE_KIND_SUPER_GROUPS[0]?.label])

/**
 * Self-contained search box. Type, get a flat list of matches, click one.
 */
function KindSearchBox({
  onPick,
  currentKind,
}: {
  onPick: (kind: string) => void
  currentKind?: string
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const lowerQuery = query.trim().toLowerCase()
  const results =
    lowerQuery.length > 0
      ? (Object.keys(NODE_KIND_LABELS) as NodeKind[]).filter((k) =>
          NODE_KIND_LABELS[k].toLowerCase().includes(lowerQuery),
        )
      : []

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-popover">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          className="h-6 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          placeholder="Search preset kinds…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {lowerQuery.length > 0 ? (
        <div className="max-h-56 overflow-y-auto border-t p-1">
          {results.length > 0 ? (
            results.map((kind) => <KindRow key={kind} kind={kind} currentKind={currentKind} onPick={onPick} />)
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Self-contained browse pane: Common, Recent, and the 5 super-groups.
 */
function KindGroupPane({
  recentKinds,
  onPick,
  currentKind,
}: {
  recentKinds: string[]
  onPick: (kind: string) => void
  currentKind?: string
}): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(DEFAULT_EXPANDED)

  const shownAlready = new Set<string>(COMMON_NODE_KINDS)
  const recentKindsToShow = recentKinds.filter((k) => !shownAlready.has(k))
  recentKindsToShow.forEach((k) => shownAlready.add(k))

  const groups = NODE_KIND_SUPER_GROUPS.map((group) => ({
    group,
    categories: group.categories
      .map((category) => ({
        category,
        kinds: (NODE_KIND_CATEGORIES[category] ?? []).filter((k) => !shownAlready.has(k)),
      }))
      .filter(({ kinds }) => kinds.length > 0),
  })).filter(({ categories }) => categories.length > 0)

  const toggle = (label: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-popover">
      <div className="max-h-72 overflow-y-auto p-1">
        <CollapsibleSection label="Common" expanded={expanded.has('Common')} onToggle={() => toggle('Common')}>
          {COMMON_NODE_KINDS.map((kind) => (
            <KindRow key={`common-${kind}`} kind={kind} currentKind={currentKind} onPick={onPick} />
          ))}
        </CollapsibleSection>
        {recentKindsToShow.length > 0 ? (
          <CollapsibleSection label="Recent" expanded={expanded.has('Recent')} onToggle={() => toggle('Recent')}>
            {recentKindsToShow.map((kind) =>
              kind in NODE_KIND_LABELS ? (
                <KindRow key={`recent-${kind}`} kind={kind as NodeKind} currentKind={currentKind} onPick={onPick} />
              ) : (
                <button
                  key={`recent-${kind}`}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent ${
                    kind === currentKind ? 'bg-accent font-medium' : ''
                  }`}
                  onClick={() => onPick(kind)}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: nodeColorFor(kind) }}
                  />
                  {kind}
                </button>
              ),
            )}
          </CollapsibleSection>
        ) : null}
        {groups.map(({ group, categories }) => (
          <CollapsibleSection
            key={group.label}
            label={group.label}
            expanded={expanded.has(group.label)}
            onToggle={() => toggle(group.label)}
          >
            {categories.map(({ category, kinds }) => (
              <div key={category} className="pl-3">
                <PickerSectionHeader>{category}</PickerSectionHeader>
                {kinds.map((kind) => (
                  <KindRow key={kind} kind={kind} currentKind={currentKind} onPick={onPick} />
                ))}
              </div>
            ))}
          </CollapsibleSection>
        ))}
      </div>
    </div>
  )
}

export interface InlineKindPickerProps {
  /** The currently armed/selected kind, if any — highlighted in the list. */
  currentKind?: string
  onPick: (kind: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Kind combobox: a text input the user can type any kind name into directly
 * plus a chevron button that opens a dropdown with the full preset search/browse
 * tree for picking a built-in kind instead.
 * @param props Current kind, pick callback, disabled flag, className.
 * @returns The rendered combobox.
 */
export function InlineKindPicker({
  currentKind,
  onPick,
  disabled,
  className,
}: InlineKindPickerProps): React.JSX.Element {
  const [recentKinds, setRecentKinds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(currentKind ? nodeLabelFor(currentKind) : '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentKinds(loadRecentKinds())
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(currentKind ? nodeLabelFor(currentKind) : '')
  }, [currentKind])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return (): void => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const handlePick = (kind: string): void => {
    onPick(kind)
    setText(nodeLabelFor(kind))
    setRecentKinds(saveRecentKind(kind))
    setOpen(false)
  }

  const commitTyped = (value: string): void => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== currentKind) {
      onPick(trimmed)
      setRecentKinds(saveRecentKind(trimmed))
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col gap-1.5 ${disabled ? 'pointer-events-none opacity-50' : ''} ${className ?? ''}`}
    >
      <div className="flex items-center gap-1">
        <input
          type="text"
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
          placeholder="Type a kind…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTyped(e.currentTarget.value)
              setOpen(false)
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        <button
          type="button"
          title="Browse preset kinds"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open ? (
        <div className="relative z-10 flex w-full flex-col gap-2">
          <KindSearchBox onPick={handlePick} currentKind={currentKind} />
          <KindGroupPane recentKinds={recentKinds} onPick={handlePick} currentKind={currentKind} />
        </div>
      ) : null}
    </div>
  )
}
