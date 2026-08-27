import { useMemo, useState, type FormEvent } from 'react'
import { Dialog } from 'radix-ui'
import { Trash2, Pencil, Plus, X } from 'lucide-react'
import type { BusinessCommitmentOne, BusinessCommitmentOneFormState, ValueEntry } from '@/types/types'
import { emptyBusinessCommitmentForm, StatusMap } from '@/types/types'
import { createCommitmentOne, updateBusinessCommitmentOne, deleteCommitmentOne } from '@/lib/actions'
import { toFormState, toApiPayload } from '@/lib/mappers/businessCommitmentOneMapper'
import { exportBcomm1ToPdf } from '@/lib/utils/export-pdf'
import { exportEachBcomm1ToMarkdown } from '@/lib/utils/export-markdown'
import DocComp from './ui/doc-comp'
import { ExportRangeButton } from './ui/export-range-button'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

const VALUE_CATEGORIES = [
  'Improved outcomes',
  'Increased efficiency',
  'Reduced risk/cost',
  'Enhanced customer experience',
  'Enhanced employee experience',
]

type SortField = 'started' | 'dateCompleted' | 'workItem'
type SortDir = 'asc' | 'desc'
type TableTab = 'open' | 'closed'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

type Props = { initialCommitments: BusinessCommitmentOne[] }

export default function BcommPage({ initialCommitments }: Props) {
  const [commitments, setCommitments] = useState<BusinessCommitmentOne[]>(initialCommitments)
  const [form, setForm] = useState<BusinessCommitmentOneFormState>(emptyBusinessCommitmentForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('started')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [valueEntry, setValueEntry] = useState<ValueEntry>({ label: VALUE_CATEGORIES[0], value: '' })
  const [tableTab, setTableTab] = useState<TableTab>('open')

  const sorted = useMemo(() => {
    return [...commitments].sort((a, b) => {
      const av = sortField === 'workItem' ? (a.workItem ?? '').toLowerCase() : (a[sortField] ?? '')
      const bv = sortField === 'workItem' ? (b.workItem ?? '').toLowerCase() : (b[sortField] ?? '')
      if (av === bv) return 0
      const ord = av < bv ? -1 : 1
      return sortDir === 'asc' ? ord : -ord
    })
  }, [commitments, sortField, sortDir])

  const CLOSED_STATUSES = new Set(['COMPLETED', 'FAILED'])
  const openRows = useMemo(() => sorted.filter((c) => !CLOSED_STATUSES.has(c.status ?? '')), [sorted])
  const closedRows = useMemo(() => sorted.filter((c) => CLOSED_STATUSES.has(c.status ?? '')), [sorted])
  const visibleRows = tableTab === 'open' ? openRows : closedRows

  function openCreate() {
    setEditingId(null)
    setForm(emptyBusinessCommitmentForm())
    setValueEntry({ label: VALUE_CATEGORIES[0], value: '' })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(c: BusinessCommitmentOne) {
    setEditingId(c.id!)
    setForm(toFormState(c))
    setValueEntry({ label: VALUE_CATEGORIES[0], value: '' })
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyBusinessCommitmentForm())
    setError(null)
  }

  function setField<K extends keyof BusinessCommitmentOneFormState>(k: K, v: BusinessCommitmentOneFormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function addValueEntry() {
    if (!valueEntry.label || !valueEntry.value.trim()) return
    setForm((p) => ({ ...p, valueEntryList: [...(p.valueEntryList ?? []), { ...valueEntry }] }))
    setValueEntry((v) => ({ ...v, value: '' }))
  }

  function removeValueEntry(i: number) {
    setForm((p) => ({ ...p, valueEntryList: p.valueEntryList?.filter((_, j) => j !== i) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.workItem.trim()) { setError('Work item is required.'); return }
    setLoading(true); setError(null)
    try {
      if (editingId != null) {
        const updated = await updateBusinessCommitmentOne(editingId, toApiPayload(form))
        setCommitments((p) => p.map((c) => (c.id === editingId ? updated : c)))
      } else {
        const created = await createCommitmentOne(toApiPayload(form))
        setCommitments((p) => [created, ...p])
      }
      closeModal()
    } catch {
      setError('Could not save.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setLoading(true)
    try {
      await deleteCommitmentOne(id)
      setCommitments((p) => p.filter((c) => c.id !== id))
      if (editingId === id) closeModal()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DocComp
        cardTitle="Work Impact"
        cardDescription="Deliver measurable impact through your work assignments."
        goals="Share accomplishments and clearly describe how each one added value (e.g., improved outcomes, increased efficiency, reduced risk/cost, or enhanced experience)."
        validationCriteria={[
          'Recorded at least three distinct accomplishments.',
          'For each accomplishment: what you did, the problem/opportunity, who benefited, why it mattered, measurable impact, and value category.',
        ]}
        tips={[
          'Ask stakeholders what key deliverables they expect.',
          'Think how your work ties to broader organizational priorities.',
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openCreate}><Plus className="h-4 w-4" />New commitment</Button>
        <span className="text-sm font-medium text-muted-foreground">Sort by</span>
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="started">Date started</SelectItem>
            <SelectItem value="dateCompleted">Date completed</SelectItem>
            <SelectItem value="workItem">Work item</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportBcomm1ToPdf(commitments)}>Export PDF</Button>
          <ExportRangeButton
            items={commitments}
            getDate={(c) => c.dateCompleted || c.started}
            onExport={(f) => void exportEachBcomm1ToMarkdown(f)}
          />
        </div>
      </div>

      {/* Open / Closed tabs */}
      <div className="flex border-b border-border">
        {(['open', 'closed'] as const).map((tab) => {
          const count = tab === 'open' ? openRows.length : closedRows.length
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setTableTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium transition ${tableTab === tab ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab === 'open' ? 'Open' : 'Closed'}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {tableTab === 'open'
              ? <>No open commitments. Click <strong>New commitment</strong> to add one.</>
              : 'No completed or failed commitments yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Work Item</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Started</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Completed</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">Values</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((c) => {
                const valueList = Array.isArray(c.valueCategories) ? (c.valueCategories as unknown as ValueEntry[]) : []
                return (
                  <tr
                    key={c.id}
                    onClick={() => openEdit(c)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(c) } }}
                    className="cursor-pointer border-t border-border transition hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
                  >
                    <td className="max-w-xs px-4 py-3 font-medium">
                      <p className="truncate">{c.workItem}</p>
                      {c.applicationContext && <p className="truncate text-xs text-muted-foreground">{c.applicationContext}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.status && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          c.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>{c.status.replace('_', ' ')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.started ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.dateCompleted ?? '—'}</td>
                    <td className="px-4 py-3">
                      {valueList.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {valueList.length} entr{valueList.length === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-xs" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(c) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" aria-label="Delete" onClick={(e) => { e.stopPropagation(); void handleDelete(c.id!) }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={(v) => { if (!v) closeModal() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-xl focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-lg font-semibold">
                {editingId != null ? 'Edit commitment' : 'New commitment'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Close"><X className="h-4 w-4" /></Button>
              </Dialog.Close>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col gap-3 overflow-y-auto px-6 py-4">
                <Field label="Work item *">
                  <Input value={form.workItem} onChange={(e) => setField('workItem', e.target.value)} required />
                </Field>
                <Field label="Application context">
                  <Input value={form.applicationContext ?? ''} onChange={(e) => setField('applicationContext', e.target.value)} />
                </Field>
                <Field label="Description">
                  <Textarea rows={2} value={form.description ?? ''} onChange={(e) => setField('description', e.target.value)} />
                </Field>
                <Field label="Problem / Opportunity">
                  <Textarea rows={2} value={form.problemOpportunity ?? ''} onChange={(e) => setField('problemOpportunity', e.target.value)} />
                </Field>
                <Field label="Who benefited">
                  <Textarea rows={2} value={form.whoBenefited ?? ''} onChange={(e) => setField('whoBenefited', e.target.value)} />
                </Field>
                <Field label="Impact">
                  <Textarea rows={2} value={form.impact ?? ''} onChange={(e) => setField('impact', e.target.value)} />
                </Field>
                <Field label="Alignment">
                  <Input value={form.alignment ?? ''} onChange={(e) => setField('alignment', e.target.value)} />
                </Field>
                <Field label="Status notes">
                  <Textarea rows={2} value={form.statusNotes ?? ''} onChange={(e) => setField('statusNotes', e.target.value)} />
                </Field>
                <Field label="Status">
                  <Select value={form.status ?? 'IN_PROGRESS'} onValueChange={(v) => setField('status', v as BusinessCommitmentOneFormState['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {StatusMap.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date started">
                    <Input type="date" value={form.started ?? ''} onChange={(e) => setField('started', e.target.value)} />
                  </Field>
                  <Field label="Date completed">
                    <Input type="date" value={form.dateCompleted ?? ''} onChange={(e) => setField('dateCompleted', e.target.value)} />
                  </Field>
                </div>

                {/* Value entries */}
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">Value entries</span>
                  {(form.valueEntryList ?? []).map((ve, i) => (
                    <div key={i} className="flex items-center gap-2 rounded bg-muted/40 px-3 py-1.5 text-sm">
                      <span className="font-medium">{ve.label}:</span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-muted-foreground">{ve.value}</span>
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeValueEntry(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Select value={valueEntry.label} onValueChange={(v) => setValueEntry((p) => ({ ...p, label: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALUE_CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea rows={2} placeholder="Describe the accomplishment and impact" value={valueEntry.value} onChange={(e) => setValueEntry((p) => ({ ...p, value: e.target.value }))} />
                  <Button type="button" variant="outline" size="sm" className="self-end" onClick={addValueEntry}>
                    <Plus className="h-4 w-4" />Add entry
                  </Button>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex items-center gap-2 border-t border-border px-6 py-4">
                {editingId != null && (
                  <Button type="button" variant="destructive" size="sm" disabled={loading} onClick={() => void handleDelete(editingId)}>
                    <Trash2 className="h-4 w-4" />Delete
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={loading}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{editingId != null ? 'Save changes' : 'Add commitment'}</Button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
