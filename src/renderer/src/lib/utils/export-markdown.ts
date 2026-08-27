import type {
  BusinessCommitmentOne,
  DevelopmentCommitmentOne,
  ActionItem,
  Skill,
} from "@/types/types"
import { getModulesForItem } from "@/lib/actions"

// Stubs for removed features (TDP Program Impact, Innovation Commitments)
// These types and functions are kept for backward compatibility with existing
// export functions that may still be called from other code paths.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BusinessCommitmentTwo = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DevelopmentCommitmentTwo = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDcomm2SubEvents = (_eventId: number): Promise<any[]> => Promise.resolve([])
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSubEventsForBcomm2 = (_eventId: number): Promise<any[]> => Promise.resolve([])

function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function stamp(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function row(label: string, value: string | number | boolean | null | undefined): string {
  if (value == null || value === "" || value === false) return ""
  const display = value === true ? "Yes" : String(value)
  return `- **${label}:** ${display}\n`
}

function slug(value: string | undefined): string {
  return (value ?? "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled"
}

// ─── Business Commitments 1 ──────────────────────────────────────────────────

// Renders every field of a single business commitment (shared by the bulk and
// the one-by-one exports so they always stay in sync).
function bcomm1Fields(c: BusinessCommitmentOne): string {
  const lines: string[] = []
  lines.push(row("Application Context", c.applicationContext))
  lines.push(row("Date Started", c.started))
  lines.push(row("Date Completed", c.dateCompleted))
  lines.push(row("Description", c.description))
  lines.push(row("Problem / Opportunity", c.problemOpportunity))
  lines.push(row("Who Benefited", c.whoBenefited))
  lines.push(row("Impact", c.impact))
  lines.push(row("Alignment", c.alignment))
  lines.push(row("Status Notes", c.statusNotes))

  if (c.valueCategories && c.valueCategories.length > 0) {
    lines.push(row("Value Categories", c.valueCategories.join(", ")))
  }

  const valueEntries: { label: string; value: string | undefined }[] = [
    { label: "Improved outcomes", value: c.improvedOutcomes ? c.improvedOutcomesText : undefined },
    { label: "Increased efficiency", value: c.increasedEfficiency ? c.increasedEfficiencyText : undefined },
    { label: "Reduced risk/cost", value: c.reducedRiskCost ? c.reducedRiskCostText : undefined },
    {
      label: "Enhanced customer experience",
      value: c.enhancedCustomerExperience ? c.enhancedCustomerExperienceText : undefined,
    },
    {
      label: "Enhanced employee experience",
      value: c.enhancedEmployeeExperience ? c.enhancedEmployeeExperienceText : undefined,
    },
  ].filter((e) => e.value)
  if (valueEntries.length > 0) {
    lines.push("- **Value Entries:**\n")
    valueEntries.forEach((ve) => lines.push(`  - ${ve.label}: ${ve.value}\n`))
  }
  return lines.join("")
}

export function exportBcomm1ToMarkdown(commitments: BusinessCommitmentOne[]): void {
  const lines: string[] = [`# Business Commitments\n\nGenerated: ${stamp()}\n\n---\n`]

  commitments.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.workItem ?? "(untitled)"}\n`)
    lines.push(bcomm1Fields(c))
    lines.push("\n---\n")
  })

  downloadMarkdown(lines.join(""), "business-commitments.md")
}

// Export a single business commitment to its own markdown file.
export function exportSingleBcomm1ToMarkdown(c: BusinessCommitmentOne): void {
  const lines: string[] = [`# ${c.workItem ?? "(untitled)"}\n\nGenerated: ${stamp()}\n\n---\n`]
  lines.push(bcomm1Fields(c))
  lines.push("\n")
  downloadMarkdown(lines.join(""), `business-commitment-${slug(c.workItem)}.md`)
}

// One click → each commitment downloads as its own separate markdown file.
export async function exportEachBcomm1ToMarkdown(commitments: BusinessCommitmentOne[]): Promise<void> {
  for (const c of commitments) {
    exportSingleBcomm1ToMarkdown(c)
    // Stagger downloads slightly so the browser doesn't drop/merge them.
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

// ─── Business Commitments 2 (TDP Program Impact) ─────────────────────────────

function bcomm2Fields(ev: BusinessCommitmentTwo, subEvents?: { subEventName: string; description?: string; started?: string; finished?: string; done?: boolean }[]): string {
  const lines: string[] = []
  lines.push(row("Type", ev.type))
  lines.push(row("Application Context", ev.applicationContext))
  lines.push(row("Description", ev.description))
  lines.push(row("Impact", ev.impact))
  lines.push(row("Date Started", ev.started))
  lines.push(row("Date Finished", ev.finished))
  lines.push(row("Done", ev.done))
  lines.push(row("Required", ev.required))
  if (subEvents && subEvents.length > 0) {
    lines.push("\n### Sub-events\n")
    subEvents.forEach((s, j) => {
      lines.push(`#### ${j + 1}. ${s.subEventName ?? "(untitled)"}\n`)
      lines.push(row("Description", s.description))
      lines.push(row("Date Started", s.started))
      lines.push(row("Date Finished", s.finished))
      lines.push(row("Done", s.done))
      lines.push("\n")
    })
  }
  return lines.join("")
}

export function exportSingleBcomm2ToMarkdown(ev: BusinessCommitmentTwo, subEvents?: Parameters<typeof bcomm2Fields>[1]): void {
  const lines: string[] = [`# ${ev.eventName ?? "(untitled)"}\n\nGenerated: ${stamp()}\n\n---\n`]
  lines.push(bcomm2Fields(ev, subEvents))
  lines.push("\n")
  downloadMarkdown(lines.join(""), `tdp-program-impact-${slug(ev.eventName)}.md`)
}

export async function exportEachBcomm2ToMarkdown(events: BusinessCommitmentTwo[]): Promise<void> {
  for (const ev of events) {
    const subEvents = ev.id != null ? await getSubEventsForBcomm2(ev.id) : []
    exportSingleBcomm2ToMarkdown(ev, subEvents)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

export async function exportBcomm2ToMarkdown(events: BusinessCommitmentTwo[]): Promise<void> {
  const lines: string[] = [`# TDP Program Impact\n\nGenerated: ${stamp()}\n\n---\n`]
  const subEventLists = await Promise.all(
    events.map((ev) => (ev.id != null ? getSubEventsForBcomm2(ev.id) : Promise.resolve([])))
  )
  events.forEach((ev, i) => {
    lines.push(`## ${i + 1}. ${ev.eventName ?? "(untitled)"}\n`)
    lines.push(bcomm2Fields(ev, subEventLists[i]))
    lines.push("\n---\n")
  })
  downloadMarkdown(lines.join(""), "tdp-program-impact.md")
}

// ─── Development Commitments 1 ───────────────────────────────────────────────

type ModuleRecord = { moduleName?: string; type?: string; hours?: number; dateStarted?: string; dateFinished?: string; finished?: boolean; required?: boolean; description?: string }

function dcomm1Fields(item: DevelopmentCommitmentOne, modules: ModuleRecord[]): string {
  const lines: string[] = []
  lines.push(row("Item Date", item.itemDate))
  lines.push(row("Description", item.description))
  lines.push(row("Done", item.done))
  // Total hours: summed from modules when present, otherwise the manual value.
  const totalHours = modules.length > 0
    ? modules.reduce((sum, m) => sum + (m.hours ?? 0), 0)
    : (item.hours ?? 0)
  if (totalHours > 0) lines.push(row("Total Hours", totalHours))
  if (modules.length > 0) {
    lines.push("\n### Modules\n")
    modules.forEach((m, j) => {
      lines.push(`#### ${j + 1}. ${m.moduleName ?? "(untitled)"}\n`)
      lines.push(row("Type", m.type))
      lines.push(row("Hours", m.hours))
      lines.push(row("Date Started", m.dateStarted))
      lines.push(row("Date Finished", m.dateFinished))
      lines.push(row("Finished", m.finished))
      lines.push(row("Required", m.required))
      lines.push(row("Description", m.description))
      lines.push("\n")
    })
  }
  return lines.join("")
}

export async function exportSingleDcomm1ToMarkdown(item: DevelopmentCommitmentOne): Promise<void> {
  const modules = item.id != null ? await getModulesForItem(item.id) : []
  const lines: string[] = [`# ${item.itemName ?? "(untitled)"}\n\nGenerated: ${stamp()}\n\n---\n`]
  lines.push(dcomm1Fields(item, modules))
  lines.push("\n")
  downloadMarkdown(lines.join(""), `dev-commitment-${slug(item.itemName)}.md`)
}

export async function exportEachDcomm1ToMarkdown(items: DevelopmentCommitmentOne[]): Promise<void> {
  for (const item of items) {
    await exportSingleDcomm1ToMarkdown(item)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

export async function exportDcomm1ToMarkdown(items: DevelopmentCommitmentOne[]): Promise<void> {
  const lines: string[] = [`# Development Commitment — Learning Items\n\nGenerated: ${stamp()}\n\n---\n`]
  const moduleLists = await Promise.all(
    items.map((item) => (item.id != null ? getModulesForItem(item.id) : Promise.resolve([])))
  )
  items.forEach((item, i) => {
    lines.push(`## ${i + 1}. ${item.itemName ?? "(untitled)"}\n`)
    lines.push(dcomm1Fields(item, moduleLists[i] ?? []))
    lines.push("\n---\n")
  })
  downloadMarkdown(lines.join(""), "development-commitment.md")
}

// ─── Development Commitments 2 (Innovation) ──────────────────────────────────

type SubEventRecord = { subEventName?: string; description?: string; started?: string; finished?: string; done?: boolean }

function dcomm2Fields(ev: DevelopmentCommitmentTwo, subEvents: SubEventRecord[]): string {
  const lines: string[] = []
  lines.push(row("Type", ev.type))
  lines.push(row("Application Context", ev.applicationContext))
  lines.push(row("Description", ev.description))
  lines.push(row("Impact", ev.impact))
  lines.push(row("Date Started", ev.started))
  lines.push(row("Date Finished", ev.finished))
  lines.push(row("Done", ev.done))
  lines.push(row("Required", ev.required))
  if (subEvents.length > 0) {
    lines.push("\n### Sub-items\n")
    subEvents.forEach((s, j) => {
      lines.push(`#### ${j + 1}. ${s.subEventName ?? "(untitled)"}\n`)
      lines.push(row("Description", s.description))
      lines.push(row("Date Started", s.started))
      lines.push(row("Date Finished", s.finished))
      lines.push(row("Done", s.done))
      lines.push("\n")
    })
  }
  return lines.join("")
}

export async function exportSingleDcomm2ToMarkdown(ev: DevelopmentCommitmentTwo): Promise<void> {
  const subEvents = ev.id != null ? await getDcomm2SubEvents(ev.id) : []
  const lines: string[] = [`# ${ev.eventName ?? "(untitled)"}\n\nGenerated: ${stamp()}\n\n---\n`]
  lines.push(dcomm2Fields(ev, subEvents))
  lines.push("\n")
  downloadMarkdown(lines.join(""), `innovation-commitment-${slug(ev.eventName)}.md`)
}

export async function exportEachDcomm2ToMarkdown(events: DevelopmentCommitmentTwo[]): Promise<void> {
  for (const ev of events) {
    await exportSingleDcomm2ToMarkdown(ev)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}

export async function exportDcomm2ToMarkdown(events: DevelopmentCommitmentTwo[]): Promise<void> {
  const lines: string[] = [`# Innovation Commitment — Events\n\nGenerated: ${stamp()}\n\n---\n`]
  const subEventLists = await Promise.all(
    events.map((ev) => (ev.id != null ? getDcomm2SubEvents(ev.id) : Promise.resolve([])))
  )
  events.forEach((ev, i) => {
    lines.push(`## ${i + 1}. ${ev.eventName ?? "(untitled)"}\n`)
    lines.push(dcomm2Fields(ev, subEventLists[i] ?? []))
    lines.push("\n---\n")
  })
  downloadMarkdown(lines.join(""), "innovation-commitment.md")
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export function exportActionItemsToMarkdown(items: ActionItem[]): void {
  const lines: string[] = [`# Action Items\n\nGenerated: ${stamp()}\n\n---\n`]

  items.forEach((item, i) => {
    lines.push(`## ${i + 1}. ${item.name ?? "(untitled)"}\n`)
    lines.push(row("Description", item.description))
    lines.push(row("Criticality", item.criticality))
    lines.push(row("Completed", item.completed))
    lines.push(row("Date Started", item.dateStarted))
    lines.push(row("Date Finished", item.dateFinished))
    lines.push("\n---\n")
  })

  downloadMarkdown(lines.join(""), "action-items.md")
}

// ─── Skills ──────────────────────────────────────────────────────────────────

const PROFICIENCY_LABEL: Record<number, string> = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
}

export function exportSkillsToMarkdown(skills: Skill[]): void {
  const lines: string[] = [`# Skills\n\nGenerated: ${stamp()}\n`]

  const groups = [5, 4, 3, 2, 1]
    .map((level) => ({
      level,
      items: skills.filter((s) => s.proficiency === level),
    }))
    .filter(({ items }) => items.length > 0)

  for (const { level, items } of groups) {
    lines.push(`\n## ${level} — ${PROFICIENCY_LABEL[level]}\n`)
    lines.push(items.map((s) => `- ${s.name}${s.date ? ` (${s.date})` : ""}`).join("\n"))
    lines.push("")
  }

  downloadMarkdown(lines.join("\n"), "skills.md")
}
