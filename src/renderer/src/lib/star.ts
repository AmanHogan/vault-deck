import type { BusinessCommitmentOne, BusinessCommitmentTwo, DevelopmentCommitmentTwo, StarEntry } from '@/types/types'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `star_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function joinParts(parts: Array<string | null | undefined>, sep = '\n\n'): string {
  return parts
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0)
    .join(sep)
}

/** Pre-fill a STAR draft from a Work Impact commitment. */
export function businessToStar(c: BusinessCommitmentOne): StarEntry {
  const result = joinParts([
    c.impact ?? null,
    c.valueCategories && c.valueCategories.length > 0
      ? c.valueCategories.map((v) => `• ${v}`).join('\n')
      : null,
    c.alignment ? `Alignment: ${c.alignment}` : null,
  ])
  return {
    id: newId(),
    sourceType: 'bcomm1',
    sourceId: c.id,
    title: c.workItem,
    situation: joinParts([
      c.problemOpportunity ?? null,
      c.whoBenefited ? `Who benefited: ${c.whoBenefited}` : null,
    ]),
    task: c.applicationContext ?? '',
    action: c.description ?? '',
    result,
  }
}

/** Pre-fill a STAR draft from a TDP Program Impact (bcomm2) event. */
export function bcomm2ToStar(e: BusinessCommitmentTwo): StarEntry {
  const delivered =
    e.subEvents && e.subEvents.length > 0
      ? `Delivered: ${e.subEvents.map((s) => s.subEventName).filter((n) => n.trim().length > 0).join(', ')}`
      : ''
  return {
    id: newId(),
    sourceType: 'bcomm2',
    sourceId: e.id,
    title: e.eventName,
    situation: joinParts([e.applicationContext, e.description]),
    task: e.type ? `Role / type: ${e.type}` : '',
    action: e.description ?? '',
    result: joinParts([e.impact, delivered]),
  }
}

/** Pre-fill a STAR draft from an Innovation Commitment (dcomm2) event. */
export function dcomm2ToStar(e: DevelopmentCommitmentTwo): StarEntry {
  return {
    id: newId(),
    sourceType: 'dcomm2',
    sourceId: e.id,
    title: e.eventName,
    situation: joinParts([e.applicationContext, e.description]),
    task: e.type ? `Role / type: ${e.type}` : '',
    action: e.description ?? '',
    result: e.impact ?? '',
  }
}

/** Create a blank manual STAR entry. */
export function newManualStar(title = ''): StarEntry {
  return { id: newId(), sourceType: 'manual', title, situation: '', task: '', action: '', result: '' }
}

/** Render a STAR entry as a flowing paragraph. */
export function starToParagraph(entry: StarEntry): string {
  return joinParts([entry.situation, entry.task, entry.action, entry.result], ' ')
}

/** Character count of the rendered paragraph. */
export function starCharCount(entry: StarEntry): number {
  return starToParagraph(entry).length
}
