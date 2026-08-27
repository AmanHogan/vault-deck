/**
 * Periodic Reviews page — generalized midyear and end-of-year reviews.
 *
 * Each review captures:
 *   • Top 3–5 accomplishments
 *   • Development progress against goals
 *   • Future priorities and alignment
 *   • Optional additional notes
 */

import { useEffect, useState } from 'react'
import type { PeriodicReview, CreatePeriodicReviewDTO, PeriodicReviewType } from '@/types/types'
import { emptyPeriodicReviewForm, REVIEW_TYPES } from '@/types/types'
import {
  getAllPeriodicReviews,
  createPeriodicReview,
  updatePeriodicReview,
  deletePeriodicReview,
} from '@/lib/actions'
import { JsonTransferBar } from '@/components/json-transfer-bar'
import { sanitizeForDb } from '@/lib/import-sanitize'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import { Plus, Pencil, Trash2, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'

const TYPE_LABELS: Record<PeriodicReviewType, string> = {
  midyear: 'Midyear Check-In',
  endofyear: 'End-of-Year Review',
}

/**
 * Periodic Reviews page with list and create/edit form.
 * @returns The rendered page.
 */
export default function ReviewsPage(): React.JSX.Element {
  const [reviews, setReviews] = useState<PeriodicReview[]>([])
  const [form, setForm] = useState<CreatePeriodicReviewDTO>(emptyPeriodicReviewForm())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [importKey, setImportKey] = useState(0)

  async function reload(): Promise<void> {
    const data = await getAllPeriodicReviews()
    setReviews(data)
  }

  useEffect(() => { void reload() }, [])

  function handleField(field: keyof CreatePeriodicReviewDTO, val: string): void {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  function startNew(): void {
    setForm(emptyPeriodicReviewForm())
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(review: PeriodicReview): void {
    setForm({
      title: review.title,
      reviewType: review.reviewType,
      reviewDate: review.reviewDate ?? '',
      accomplishments: review.accomplishments,
      developmentProgress: review.developmentProgress,
      futurePriorities: review.futurePriorities,
      additionalNotes: review.additionalNotes,
    })
    setEditingId(review.id ?? null)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingId) {
        await updatePeriodicReview(editingId, form)
        toast.success('Review updated')
      } else {
        await createPeriodicReview(form)
        toast.success('Review created')
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyPeriodicReviewForm())
      await reload()
    } catch (err) {
      toast.error('Failed to save review')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number): Promise<void> {
    if (!confirm('Delete this review?')) return
    await deletePeriodicReview(id)
    toast.success('Review deleted')
    await reload()
  }

  async function handleExport(): Promise<void> {
    const records = await getAllPeriodicReviews()
    const json = JSON.stringify(
      { type: 'periodic-reviews', version: 1, exportedAt: new Date().toISOString(), records },
      null, 2
    )
    await window.api.data.saveJson('periodic-reviews-export.json', json)
  }

  async function handleImport(records: unknown[]): Promise<void> {
    for (const rec of records) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...payload } = rec as Record<string, unknown>
      await createPeriodicReview(sanitizeForDb(payload) as CreatePeriodicReviewDTO)
    }
    await reload()
    setImportKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
          Periodic Reviews
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Midyear check-ins and end-of-year reviews — track accomplishments, development progress, and future priorities.
        </p>
      </div>

      <JsonTransferBar
        key={importKey}
        label="Reviews"
        recordCount={reviews.length}
        dataType="periodic-reviews"
        onExport={() => handleExport()}
        onImport={(recs) => handleImport(recs)}
      />

      {/* ── Create / Edit form ──────────────────────────────────────── */}
      {showForm ? (
        <Card className="border-2 border-primary/30">
          <form onSubmit={(e) => void handleSave(e)}>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Review' : 'New Review'}</CardTitle>
              <CardDescription>
                {editingId
                  ? 'Update the fields below and save.'
                  : 'Fill in the sections to create a new periodic review.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="review-title">Title</Label>
                <Input
                  id="review-title"
                  value={form.title}
                  onChange={(e) => handleField('title', e.target.value)}
                  placeholder="e.g. 2026 Midyear Review"
                  required
                />
              </div>

              {/* Type + Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="review-type">Review Type</Label>
                  <select
                    id="review-type"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.reviewType}
                    onChange={(e) => handleField('reviewType', e.target.value)}
                  >
                    {REVIEW_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="review-date">Date</Label>
                  <Input
                    id="review-date"
                    type="date"
                    value={form.reviewDate}
                    onChange={(e) => handleField('reviewDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Accomplishments */}
              <div>
                <Label htmlFor="review-accomplishments">
                  Top Accomplishments
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(3–5 key accomplishments)</span>
                </Label>
                <Textarea
                  id="review-accomplishments"
                  rows={5}
                  value={form.accomplishments}
                  onChange={(e) => handleField('accomplishments', e.target.value)}
                  placeholder="• Led migration of legacy service to cloud infrastructure&#10;• Delivered feature X ahead of schedule&#10;• Mentored two junior engineers"
                />
              </div>

              {/* Development Progress */}
              <div>
                <Label htmlFor="review-dev-progress">
                  Development Progress
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(progress against goals)</span>
                </Label>
                <Textarea
                  id="review-dev-progress"
                  rows={4}
                  value={form.developmentProgress}
                  onChange={(e) => handleField('developmentProgress', e.target.value)}
                  placeholder="Progress made toward development goals, certifications, training, or skill growth..."
                />
              </div>

              {/* Future Priorities */}
              <div>
                <Label htmlFor="review-priorities">
                  Future Priorities &amp; Alignment
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(going forward)</span>
                </Label>
                <Textarea
                  id="review-priorities"
                  rows={4}
                  value={form.futurePriorities}
                  onChange={(e) => handleField('futurePriorities', e.target.value)}
                  placeholder="Key priorities for the next period, alignment with team/org goals..."
                />
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="review-notes">Additional Notes</Label>
                <Textarea
                  id="review-notes"
                  rows={3}
                  value={form.additionalNotes}
                  onChange={(e) => handleField('additionalNotes', e.target.value)}
                  placeholder="Any other context, feedback, or items to discuss..."
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowForm(false); setEditingId(null) }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.title.trim()}>
                {loading ? 'Saving…' : editingId ? 'Update' : 'Create'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Button onClick={startNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Review
        </Button>
      )}

      {/* ── Review cards ────────────────────────────────────────────── */}
      {reviews.length === 0 && !showForm && (
        <div className="rounded-xl border-2 border-dashed border-border/60 p-10 text-center text-muted-foreground">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Click &quot;New Review&quot; to create your first midyear or end-of-year review.</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card
            key={review.id}
            className="border-2 border-border/60 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{review.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className={
                      review.reviewType === 'midyear'
                        ? 'inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400'
                        : 'inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400'
                    }>
                      {TYPE_LABELS[review.reviewType]}
                    </span>
                    {review.reviewDate && (
                      <span className="text-xs text-muted-foreground">{review.reviewDate}</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(review)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(review.id!)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {review.accomplishments && (
                <Section label="Accomplishments" text={review.accomplishments} />
              )}
              {review.developmentProgress && (
                <Section label="Development Progress" text={review.developmentProgress} />
              )}
              {review.futurePriorities && (
                <Section label="Future Priorities" text={review.futurePriorities} />
              )}
              {review.additionalNotes && (
                <Section label="Additional Notes" text={review.additionalNotes} />
              )}
            </CardContent>
            {review.updatedAt && (
              <CardFooter className="pt-0 text-xs text-muted-foreground">
                Last updated {new Date(review.updatedAt).toLocaleDateString()}
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Small helper ────────────────────────────────────────────────────────────

/**
 * Render a labeled text block with pre-wrapped whitespace.
 * @param props Section label and body text.
 * @returns The rendered section.
 */
function Section({ label, text }: { label: string; text: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
        {label}
      </p>
      <p className="whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
        {text}
      </p>
    </div>
  )
}
