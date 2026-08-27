import type {
  Progression,
  PeriodicReview,
  StarEntry,
  DevelopmentEntry,
} from '@/types/types'

// ─── Shared read-only document model ──────────────────────────────────────────
// A ViewerDoc is a simple, flat list of blocks that both the on-screen viewer
// and the markdown exporter render from — so they always stay in sync.

export type ViewerBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'field'; label: string; value: string }
  | { type: 'paragraph'; text: string }
  | { type: 'empty'; text: string } // muted "no response" placeholder (viewer only)

export type ViewerDoc = {
  title: string
  subtitle?: string
  blocks: ViewerBlock[]
}

function has(v: string | undefined | null): v is string {
  return !!v && v.trim().length > 0
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function starBlocks(entries: StarEntry[]): ViewerBlock[] {
  const out: ViewerBlock[] = []
  entries.forEach((e, i) => {
    out.push({ type: 'heading', level: 3, text: e.title?.trim() || `Entry ${i + 1}` })
    if (has(e.situation)) out.push({ type: 'field', label: 'Situation', value: e.situation })
    if (has(e.task)) out.push({ type: 'field', label: 'Task', value: e.task })
    if (has(e.action)) out.push({ type: 'field', label: 'Action', value: e.action })
    if (has(e.result)) out.push({ type: 'field', label: 'Result', value: e.result })
  })
  return out
}

function devBlocks(entries: DevelopmentEntry[]): ViewerBlock[] {
  const out: ViewerBlock[] = []
  entries.forEach((e, i) => {
    out.push({ type: 'heading', level: 3, text: e.title?.trim() || `Entry ${i + 1}` })
    if (e.hours != null) out.push({ type: 'field', label: 'Hours', value: String(e.hours) })
    if (has(e.body)) out.push({ type: 'paragraph', text: e.body })
  })
  return out
}

export function buildProgressionDoc(p: Progression): ViewerDoc {
  const blocks: ViewerBlock[] = []

  blocks.push({ type: 'heading', level: 2, text: 'Business Impact' })
  if (p.businessEntries?.length) blocks.push(...starBlocks(p.businessEntries))
  else blocks.push({ type: 'empty', text: 'No business entries.' })

  blocks.push({ type: 'heading', level: 2, text: 'Program Impact' })
  if (p.programEntries?.length) blocks.push(...starBlocks(p.programEntries))
  else blocks.push({ type: 'empty', text: 'No program entries.' })

  blocks.push({ type: 'heading', level: 2, text: 'Development' })
  if (p.developmentEntries?.length) blocks.push(...devBlocks(p.developmentEntries))
  else blocks.push({ type: 'empty', text: 'No development entries.' })

  return { title: p.title || 'Progression', blocks }
}

/**
 * Build a ViewerDoc from a generalized periodic review.
 * @param r The periodic review record.
 * @returns A ViewerDoc with the review sections.
 */
export function buildPeriodicReviewDoc(r: PeriodicReview): ViewerDoc {
  const sections: { heading: string; value: string }[] = [
    { heading: 'Top Accomplishments', value: r.accomplishments },
    { heading: 'Development Progress', value: r.developmentProgress },
    { heading: 'Future Priorities & Alignment', value: r.futurePriorities },
  ]
  if (has(r.additionalNotes)) {
    sections.push({ heading: 'Additional Notes', value: r.additionalNotes })
  }
  const blocks: ViewerBlock[] = []
  for (const s of sections) {
    blocks.push({ type: 'heading', level: 2, text: s.heading })
    if (has(s.value)) blocks.push({ type: 'paragraph', text: s.value })
    else blocks.push({ type: 'empty', text: 'No response yet.' })
  }
  const typeLabel = r.reviewType === 'midyear' ? 'Midyear Check-In' : 'End-of-Year Review'
  return { title: r.title || typeLabel, subtitle: typeLabel, blocks }
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function stamp(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function docToMarkdown(doc: ViewerDoc): string {
  const lines: string[] = [`# ${doc.title}`, '', `Generated: ${stamp()}`, '', '---', '']
  for (const b of doc.blocks) {
    switch (b.type) {
      case 'heading':
        lines.push(b.level === 2 ? `## ${b.text}` : `### ${b.text}`, '')
        break
      case 'field':
        lines.push(`**${b.label}:** ${b.value}`, '')
        break
      case 'paragraph':
        lines.push(b.text, '')
        break
      case 'empty':
        // Skip placeholders in the exported markdown.
        break
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

function slug(value: string): string {
  return (value || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document'
}

export function downloadDocMarkdown(doc: ViewerDoc): void {
  const blob = new Blob([docToMarkdown(doc)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(doc.title)}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
