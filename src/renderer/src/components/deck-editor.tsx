/**
 * Editor for `.deck` vault files. Stores flashcards as JSON in the vault
 * instead of SQLite. Supports card CRUD, study mode with flip animation,
 * progress tracking, bulk import, and auto-save.
 *
 * ## .deck file format
 * ```json
 * {
 *   "title": "My Deck",
 *   "description": "optional",
 *   "tags": ["tag1"],
 *   "cards": [
 *     { "id": "abc123", "term": "...", "definition": "...",
 *       "group": "", "hint": "", "starred": false }
 *   ]
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useId } from 'react'
import { Markdown } from '@/components/markdown'
import { ImportCardsPanel, type ParsedCard } from '@/components/import-cards-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Star, Pencil, Trash2, Plus, GripVertical,
  ChevronLeft, ChevronRight, RotateCcw,
  Upload, Check, X, BookOpen, BarChart2, RefreshCw,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeckCard {
  id: string
  term: string
  definition: string
  group: string
  hint: string
  starred: boolean
}

interface DeckFile {
  title: string
  description: string
  tags: string[]
  cards: DeckCard[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a short random id. */
function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** Parse a .deck JSON string into a DeckFile, with defaults for missing fields. */
function parseDeck(raw: string): DeckFile {
  try {
    const obj = JSON.parse(raw) as Partial<DeckFile>
    return {
      title: obj.title ?? 'Untitled',
      description: obj.description ?? '',
      tags: Array.isArray(obj.tags) ? obj.tags : [],
      cards: Array.isArray(obj.cards)
        ? obj.cards.map((c) => ({
            id: c.id ?? uid(),
            term: c.term ?? '',
            definition: c.definition ?? '',
            group: c.group ?? '',
            hint: c.hint ?? '',
            starred: Boolean(c.starred),
          }))
        : [],
    }
  } catch {
    return { title: 'Untitled', description: '', tags: [], cards: [] }
  }
}

/** Serialize a DeckFile back to formatted JSON. */
function serializeDeck(deck: DeckFile): string {
  return JSON.stringify(deck, null, 2)
}

const AUTOSAVE_DELAY = 800

// ─── Sub-components ──────────────────────────────────────────────────────────

function InsertCardForm({
  groups,
  onInsert,
  onCancel,
}: {
  groups: string[]
  onInsert: (term: string, def: string, group: string, hint: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [term, setTerm] = useState('')
  const [def, setDef] = useState('')
  const [group, setGroup] = useState('')
  const [hint, setHint] = useState('')

  function commit(): void {
    if (!term.trim() || !def.trim()) return
    onInsert(term, def, group, hint)
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary">Insert card here</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Term *</Label>
          <Textarea autoFocus value={term} onChange={(e) => setTerm(e.target.value)} rows={3} placeholder="Term" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Definition *</Label>
          <Textarea value={def} onChange={(e) => setDef(e.target.value)} rows={3} placeholder="Definition" className="text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Group</Label>
          <Input list="insert-groups" value={group} onChange={(e) => setGroup(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
          <datalist id="insert-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hint</Label>
          <Input value={hint} onChange={(e) => setHint(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={commit} disabled={!term.trim() || !def.trim()}>
          <Check className="mr-1 h-3 w-3" /> Insert
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="mr-1 h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  )
}

function SortableCard({
  card,
  groups,
  insertOpen,
  onToggleInsert,
  onInsert,
  onStar,
  onDelete,
  onUpdate,
}: {
  card: DeckCard
  groups: string[]
  insertOpen: boolean
  onToggleInsert: () => void
  onInsert: (term: string, def: string, group: string, hint: string) => void
  onStar: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, data: Partial<DeckCard>) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const [editing, setEditing] = useState(false)
  const [term, setTerm] = useState(card.term)
  const [definition, setDefinition] = useState(card.definition)
  const [groupName, setGroupName] = useState(card.group)
  const [hint, setHint] = useState(card.hint)

  function saveEdit(): void {
    onUpdate(card.id, { term, definition, group: groupName, hint })
    setEditing(false)
  }

  function cancelEdit(): void {
    setTerm(card.term)
    setDefinition(card.definition)
    setGroupName(card.group)
    setHint(card.hint)
    setEditing(false)
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="rounded-lg border bg-card">
        {editing ? (
          <div className="space-y-2 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Term</Label>
                <Textarea value={term} onChange={(e) => setTerm(e.target.value)} rows={3} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Definition</Label>
                <Textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3} className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Group</Label>
                <Input list={`g-${card.id}`} value={groupName} onChange={(e) => setGroupName(e.target.value)} className="h-8 text-sm" />
                <datalist id={`g-${card.id}`}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hint</Label>
                <Input value={hint} onChange={(e) => setHint(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit}><Check className="mr-1 h-3 w-3" /> Save</Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}><X className="mr-1 h-3 w-3" /> Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-4">
            <button type="button" {...attributes} {...listeners} className="mt-1 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing" title="Drag to reorder">
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="grid min-h-[5rem] min-w-0 flex-1 grid-cols-2 gap-4">
              <div className="text-sm">
                <Markdown>{card.term}</Markdown>
                {card.hint && <p className="mt-1 text-xs italic text-muted-foreground">Hint: {card.hint}</p>}
              </div>
              <div className="text-sm text-muted-foreground"><Markdown>{card.definition}</Markdown></div>
            </div>
            <div className="flex items-center gap-1">
              {card.group && <Badge variant="outline" className="text-xs">{card.group}</Badge>}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onStar(card.id)}>
                <Star className={`h-3.5 w-3.5 ${card.starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => onDelete(card.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Insert-between button */}
      <div className="group relative flex h-7 items-center">
        <div className="absolute inset-x-0 h-px bg-transparent transition-colors group-hover:bg-border" />
        <button
          type="button"
          onClick={onToggleInsert}
          className={`absolute left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-background transition-all
            ${insertOpen ? 'rotate-45 border-primary text-primary opacity-100' : 'border-border text-muted-foreground opacity-0 hover:scale-110 hover:border-primary hover:text-primary group-hover:opacity-100'}`}
          title={insertOpen ? 'Close' : 'Insert card here'}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {insertOpen && <InsertCardForm groups={groups} onInsert={onInsert} onCancel={onToggleInsert} />}
    </>
  )
}

function CircleProgress({ value, total, size = 160, color = '#22c55e' }: { value: number; total: number; size?: number; color?: string }): React.JSX.Element {
  const sw = 14
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? value / total : 0
  const offset = circ * (1 - pct)
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size / 2} y={size / 2 - 10} textAnchor="middle" fontSize="26" fontWeight="700" fill="currentColor">{Math.round(pct * 100)}%</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="13" fill="#6b7280">{value} / {total}</text>
    </svg>
  )
}

// ─── Main editor ─────────────────────────────────────────────────────────────

interface DeckEditorProps {
  filePath: string
}

/**
 * Full deck editor: card list with drag-reorder, inline editing, study mode
 * with flip animation, progress tracking, and auto-save to the vault file.
 * @param props.filePath The vault-relative path to the .deck file.
 * @returns The rendered deck editor.
 */
export function DeckEditor({ filePath }: DeckEditorProps): React.JSX.Element {
  const dndId = useId()

  // ── File state ──
  const [deck, setDeck] = useState<DeckFile>({ title: 'Untitled', description: '', tags: [], cards: [] })
  const [loaded, setLoaded] = useState(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deckRef = useRef(deck)
  deckRef.current = deck

  // ── Study state ──
  const [studyMode, setStudyMode] = useState(false)
  const [studyGroup, setStudyGroup] = useState<string | null>(null)
  const [studyIdx, setStudyIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reversed, setReversed] = useState(false)
  const [trackingOn, setTrackingOn] = useState(false)
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const [stillIds, setStillIds] = useState<Set<string>>(new Set())
  const [studyFilter, setStudyFilter] = useState<string[] | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  // ── UI state ──
  const [editingDeck, setEditingDeck] = useState(false)
  const [deckTitle, setDeckTitle] = useState('')
  const [deckDesc, setDeckDesc] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [deckTags, setDeckTags] = useState<string[]>([])

  const [addingCard, setAddingCard] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [newDef, setNewDef] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [newHint, setNewHint] = useState('')
  const [insertIdx, setInsertIdx] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const cards = deck.cards
  const groups = Array.from(new Set(cards.map((c) => c.group).filter(Boolean)))
  const studyCards = studyFilter !== null
    ? cards.filter((c) => studyFilter.includes(c.id))
    : studyGroup ? cards.filter((c) => c.group === studyGroup) : cards
  const hasSession = knownIds.size > 0 || stillIds.size > 0 || studyIdx > 0

  // ── Load file ──
  useEffect(() => {
    setLoaded(false)
    void (async () => {
      try {
        const raw = await window.api.vault.readFile(filePath)
        const parsed = parseDeck(raw)
        setDeck(parsed)
        setDeckTitle(parsed.title)
        setDeckDesc(parsed.description)
        setDeckTags(parsed.tags)
      } catch {
        setDeck({ title: 'Untitled', description: '', tags: [], cards: [] })
      }
      setLoaded(true)
    })()
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [filePath])

  // ── Auto-save helper ──
  const scheduleSave = useCallback((next: DeckFile) => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(() => {
      void window.api.vault.writeFile(filePath, serializeDeck(next))
    }, AUTOSAVE_DELAY)
  }, [filePath])

  /** Update deck state and schedule an auto-save. */
  function updateDeck(fn: (prev: DeckFile) => DeckFile): void {
    setDeck((prev) => {
      const next = fn(prev)
      scheduleSave(next)
      return next
    })
  }

  // ── Study helpers ──
  function startStudy(group?: string): void {
    setStudyGroup(group ?? null)
    setStudyFilter(null)
    setStudyIdx(0)
    setFlipped(false)
    setStudyMode(true)
    setKnownIds(new Set())
    setStillIds(new Set())
    setShowSummary(false)
  }

  function nextCard(): void { setFlipped(false); setStudyIdx((i) => Math.min(i + 1, studyCards.length - 1)) }
  function prevCard(): void { setFlipped(false); setStudyIdx((i) => Math.max(i - 1, 0)) }

  function markCard(cardId: string, known: boolean): void {
    if (known) {
      setKnownIds((s) => new Set([...s, cardId]))
      setStillIds((s) => { const n = new Set(s); n.delete(cardId); return n })
    } else {
      setStillIds((s) => new Set([...s, cardId]))
      setKnownIds((s) => { const n = new Set(s); n.delete(cardId); return n })
    }
    if (studyIdx < studyCards.length - 1) setTimeout(() => nextCard(), 280)
    else setTimeout(() => setShowSummary(true), 350)
  }

  // Keyboard shortcuts in study mode
  useEffect(() => {
    if (!studyMode || showSummary) return
    function onKey(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f) }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextCard() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevCard() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [studyMode, showSummary, studyIdx, studyCards.length])

  // ── Card CRUD ──
  function addCard(): void {
    if (!newTerm.trim() || !newDef.trim()) return
    updateDeck((d) => ({
      ...d,
      cards: [...d.cards, { id: uid(), term: newTerm, definition: newDef, group: newGroup, hint: newHint, starred: false }],
    }))
    setNewTerm(''); setNewDef(''); setNewGroup(''); setNewHint(''); setAddingCard(false)
  }

  function insertCard(afterIdx: number, term: string, def: string, group: string, hint: string): void {
    updateDeck((d) => {
      const c = [...d.cards]
      c.splice(afterIdx + 1, 0, { id: uid(), term, definition: def, group, hint, starred: false })
      return { ...d, cards: c }
    })
    setInsertIdx(null)
  }

  function updateCard(id: string, data: Partial<DeckCard>): void {
    updateDeck((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, ...data } : c)) }))
  }

  function toggleStar(id: string): void {
    updateDeck((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)) }))
  }

  function deleteCard(id: string): void {
    updateDeck((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }))
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    updateDeck((d) => {
      const oldIdx = d.cards.findIndex((c) => c.id === active.id)
      const newIdx = d.cards.findIndex((c) => c.id === over.id)
      return { ...d, cards: arrayMove(d.cards, oldIdx, newIdx) }
    })
  }

  async function handleBulkImport(parsed: ParsedCard[]): Promise<void> {
    updateDeck((d) => ({
      ...d,
      cards: [
        ...d.cards,
        ...parsed.map((c) => ({
          id: uid(),
          term: c.term,
          definition: c.definition,
          group: c.groupName ?? '',
          hint: c.hint ?? '',
          starred: false,
        })),
      ],
    }))
    setImporting(false)
  }

  function saveDeckMeta(): void {
    updateDeck((d) => ({ ...d, title: deckTitle, description: deckDesc, tags: deckTags }))
    setEditingDeck(false)
  }

  // ── Loading state ──
  if (!loaded) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading deck…</div>
  }

  // ── Study summary ──
  if (studyMode && showSummary) {
    const knownCount = knownIds.size
    const stillCount = stillIds.size
    const notReviewed = studyCards.length - knownCount - stillCount
    return (
      <div className="space-y-8 p-6">
        <Button variant="outline" onClick={() => setStudyMode(false)}>← Back to deck</Button>
        <div className="flex flex-col items-center gap-6 py-4">
          <div>
            <h2 className="mb-1 text-center text-2xl font-bold">Session Complete!</h2>
            <p className="text-center text-sm text-muted-foreground">{studyCards.length} card{studyCards.length !== 1 ? 's' : ''} reviewed</p>
          </div>
          <CircleProgress value={knownCount} total={studyCards.length} size={180}
            color={knownCount / studyCards.length >= 0.8 ? '#22c55e' : knownCount / studyCards.length >= 0.5 ? '#eab308' : '#ef4444'} />
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-green-500" /><span className="font-medium text-green-600">{knownCount} Know it</span></div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-red-400" /><span className="font-medium text-red-500">{stillCount} Still learning</span></div>
            {notReviewed > 0 && <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-muted-foreground/40" /><span className="text-muted-foreground">{notReviewed} skipped</span></div>}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {stillCount > 0 && (
              <Button onClick={() => { setStudyFilter([...stillIds]); setKnownIds(new Set()); setStillIds(new Set()); setStudyIdx(0); setFlipped(false); setShowSummary(false) }}>
                <RefreshCw className="mr-1.5 h-4 w-4" />Study {stillCount} still learning
              </Button>
            )}
            <Button variant="outline" onClick={() => { setKnownIds(new Set()); setStillIds(new Set()); setStudyIdx(0); setFlipped(false); setStudyFilter(null); setShowSummary(false) }}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Restart all
            </Button>
            <Button variant="ghost" onClick={() => setStudyMode(false)}>Back to deck</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Study mode ──
  if (studyMode) {
    const current = studyCards[studyIdx]
    const reviewedCount = knownIds.size + stillIds.size
    return (
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => setStudyMode(false)}>← Back to deck</Button>
          {trackingOn && reviewedCount > 0 ? (
            <div className="min-w-32 max-w-48 flex-1 space-y-0.5">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(knownIds.size / studyCards.length) * 100}%` }} />
                <div className="h-full bg-red-400 transition-all duration-300" style={{ width: `${(stillIds.size / studyCards.length) * 100}%` }} />
              </div>
              <p className="text-center text-xs text-muted-foreground">{knownIds.size} ✓ · {stillIds.size} ✗ · {studyCards.length - reviewedCount} left</p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{studyGroup ? `${studyGroup} · ` : ''}{studyIdx + 1} / {studyCards.length}</span>
          )}
          <div className="flex items-center gap-2">
            <Button variant={reversed ? 'default' : 'outline'} size="sm" onClick={() => { setReversed((r) => !r); setFlipped(false) }}>
              ⇄ {reversed ? 'Def → Term' : 'Term → Def'}
            </Button>
            <button type="button" role="switch" aria-checked={trackingOn} onClick={() => setTrackingOn((t) => !t)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${trackingOn ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${trackingOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="whitespace-nowrap text-xs text-muted-foreground">Track progress</span>
          </div>
        </div>

        {current ? (
          <div role="button" tabIndex={0} onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setFlipped((f) => !f) }}
            className="cursor-pointer select-none" style={{ perspective: '1200px' }} title="Click or press Space to flip">
            <div style={{ transformStyle: 'preserve-3d', transition: 'transform 0.45s cubic-bezier(0.4,0.2,0.2,1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', position: 'relative' }}>
              <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                className="flex min-h-80 max-h-[70vh] w-full flex-col items-center justify-center overflow-y-auto rounded-xl border bg-card p-10 text-center shadow-sm">
                <Badge variant="outline" className="mb-4 text-xs">{reversed ? 'Definition' : 'Term'}</Badge>
                <div className="w-full text-xl"><Markdown>{reversed ? current.definition : current.term}</Markdown></div>
                {!reversed && current.hint && <p className="mt-3 text-sm italic text-muted-foreground">Hint: {current.hint}</p>}
                <p className="mt-4 text-xs text-muted-foreground opacity-60">Click or press Space to flip</p>
              </div>
              <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-xl border bg-accent/30 p-10 text-center shadow-sm">
                <Badge variant="secondary" className="mb-4 text-xs">{reversed ? 'Term' : 'Definition'}</Badge>
                <div className="w-full text-xl"><Markdown>{reversed ? current.term : current.definition}</Markdown></div>
              </div>
            </div>
          </div>
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No cards in this group.</CardContent></Card>
        )}

        {trackingOn && current && (
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="outline"
              className={`gap-2 border-2 hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 ${stillIds.has(current.id) ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-950' : ''}`}
              onClick={() => markCard(current.id, false)}>
              <X className="h-5 w-5" /> Still learning
            </Button>
            <Button size="lg"
              className={`gap-2 border-2 ${knownIds.has(current.id) ? 'border-green-600 bg-green-600 hover:bg-green-700' : 'border-green-500 bg-green-500 hover:bg-green-600'}`}
              onClick={() => markCard(current.id, true)}>
              <Check className="h-5 w-5" /> Know it
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={prevCard} disabled={studyIdx === 0}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { setStudyIdx(0); setFlipped(false) }}><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={nextCard} disabled={studyIdx >= studyCards.length - 1}><ChevronRight className="h-4 w-4" /></Button>
          {trackingOn && reviewedCount === studyCards.length && (
            <Button size="sm" onClick={() => setShowSummary(true)}><BarChart2 className="mr-1 h-4 w-4" /> See results</Button>
          )}
        </div>
        {current && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => toggleStar(current.id)}>
              <Star className={`mr-1 h-4 w-4 ${current.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              {current.starred ? 'Unstar' : 'Star'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── Card list / management view ──
  return (
    <div className="space-y-6 overflow-auto p-6">
      {/* Deck header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingDeck ? (
            <div className="space-y-3">
              <Input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} className="h-auto py-1 text-xl font-bold" />
              <Textarea value={deckDesc} onChange={(e) => setDeckDesc(e.target.value)} placeholder="Description" rows={2} className="text-sm" />
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = tagInput.trim(); if (t && !deckTags.includes(t)) setDeckTags([...deckTags, t]); setTagInput('') } }}
                  placeholder="Add tag, press Enter" className="h-8 text-sm" />
              </div>
              {deckTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {deckTags.map((t) => <Badge key={t} variant="secondary" className="cursor-pointer text-xs" onClick={() => setDeckTags(deckTags.filter((x) => x !== t))}>{t} ×</Badge>)}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDeckMeta}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingDeck(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold">{deck.title}</h1>
              {deck.description && <p className="mt-1 text-sm text-muted-foreground">{deck.description}</p>}
              {deck.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {deck.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingDeck(!editingDeck); setDeckTitle(deck.title); setDeckDesc(deck.description); setDeckTags(deck.tags) }}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{cards.length} cards</span>
      </div>

      {/* Study row */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        {cards.length === 0 ? (
          <span className="text-sm text-muted-foreground">Add cards below to start studying.</span>
        ) : (
          <>
            {hasSession && (
              <>
                <Button size="sm" onClick={() => setStudyMode(true)}>
                  ▶ Resume
                  <span className="ml-1.5 text-xs opacity-75">({knownIds.size}✓ {stillIds.size}✗)</span>
                </Button>
                <span className="text-xs text-muted-foreground">·</span>
              </>
            )}
            <Button size="sm" variant={hasSession ? 'outline' : 'default'} onClick={() => startStudy()}>
              {hasSession ? 'New session' : `Study all ${cards.length} cards`}
            </Button>
            {groups.map((g) => (
              <Button key={g} variant="outline" size="sm" onClick={() => startStudy(g)}>
                {g} <span className="ml-1 text-muted-foreground">({cards.filter((c) => c.group === g).length})</span>
              </Button>
            ))}
          </>
        )}
      </div>

      {/* Cards section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {cards.length} cards · drag to reorder · hover between cards to insert
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImporting((i) => !i)}>
              <Upload className="mr-1 h-4 w-4" /> Import
            </Button>
            <Button size="sm" onClick={() => setAddingCard((a) => !a)}>
              <Plus className="mr-1 h-4 w-4" /> Add Card
            </Button>
          </div>
        </div>

        {importing && <ImportCardsPanel onImport={handleBulkImport} onClose={() => setImporting(false)} />}

        {addingCard && (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">New card</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Term *</Label><Textarea value={newTerm} onChange={(e) => setNewTerm(e.target.value)} rows={4} className="text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Definition *</Label><Textarea value={newDef} onChange={(e) => setNewDef(e.target.value)} rows={4} className="text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Group</Label>
                <Input list="new-card-groups" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
                <datalist id="new-card-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
              </div>
              <div className="space-y-1"><Label className="text-xs">Hint</Label><Input value={newHint} onChange={(e) => setNewHint(e.target.value)} className="h-8 text-sm" placeholder="Optional" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addCard} disabled={!newTerm.trim() || !newDef.trim()}><Check className="mr-1 h-3 w-3" /> Add</Button>
              <Button size="sm" variant="outline" onClick={() => setAddingCard(false)}><X className="mr-1 h-3 w-3" /> Cancel</Button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No cards yet. Add one above or import from a file.</CardContent></Card>
        ) : (
          <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0">
                {cards.map((card, i) => (
                  <SortableCard
                    key={card.id} card={card} groups={groups}
                    insertOpen={insertIdx === i}
                    onToggleInsert={() => setInsertIdx(insertIdx === i ? null : i)}
                    onInsert={(t, d, g, h) => insertCard(i, t, d, g, h)}
                    onStar={toggleStar} onDelete={deleteCard} onUpdate={updateCard}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
