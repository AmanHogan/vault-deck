import type {
  BusinessCommitmentOne,
  BusinessCommitmentTwo,
  DevelopmentCommitmentOne,
  LearningModule,
  DevelopmentCommitmentTwo,
} from "@/types/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** A thin wrapper so callers don't need to import jsPDF directly. */
type JsPDFInstance = {
  internal: { pageSize: { getWidth(): number; getHeight(): number } }
  setFontSize(size: number): void
  setFont(name: string, style: string): void
  text(text: string | string[], x: number, y: number): void
  splitTextToSize(text: string, maxWidth: number): string[]
  addPage(): void
  setDrawColor(r: number, g: number, b: number): void
  line(x1: number, y1: number, x2: number, y2: number): void
  setFillColor(r: number, g: number, b: number): void
  rect(x: number, y: number, w: number, h: number, style: string): void
  save(filename: string): void
}

interface PdfCtx {
  pdf: JsPDFInstance
  margin: number
  maxW: number
  pageH: number
  y: number
}

function newCtx(pdf: JsPDFInstance): PdfCtx {
  const margin = 50
  return {
    pdf,
    margin,
    maxW: pdf.internal.pageSize.getWidth() - margin * 2,
    pageH: pdf.internal.pageSize.getHeight(),
    y: margin,
  }
}

function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y + needed > ctx.pageH - ctx.margin) {
    ctx.pdf.addPage()
    ctx.y = ctx.margin
  }
}

function addTitle(ctx: PdfCtx, text: string): void {
  ensureSpace(ctx, 40)
  ctx.pdf.setFontSize(20)
  ctx.pdf.setFont("helvetica", "bold")
  ctx.pdf.text(text, ctx.margin, ctx.y)
  ctx.y += 10

  // Underline
  ctx.pdf.setDrawColor(80, 80, 80)
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.maxW, ctx.y)
  ctx.y += 18
}

function addSubtitle(ctx: PdfCtx, _text: string): void {
  ensureSpace(ctx, 30)
  ctx.pdf.setFontSize(8)
  ctx.pdf.setFont("helvetica", "normal")
  ctx.pdf.setDrawColor(160, 160, 160)
  // Grey rule before each sub-heading
  ctx.y += 4
}

function addSectionHeading(ctx: PdfCtx, index: number, text: string): void {
  ctx.y += 8
  ensureSpace(ctx, 34)
  // Light grey background band
  ctx.pdf.setFillColor(240, 240, 240)
  ctx.pdf.rect(ctx.margin, ctx.y - 3, ctx.maxW, 18, "F")
  ctx.pdf.setFontSize(12)
  ctx.pdf.setFont("helvetica", "bold")
  ctx.pdf.text(`${index}. ${text}`, ctx.margin + 4, ctx.y + 10)
  ctx.y += 22
}

function addSubheading(ctx: PdfCtx, text: string, indent = 0): void {
  ctx.y += 4
  ensureSpace(ctx, 22)
  ctx.pdf.setFontSize(10)
  ctx.pdf.setFont("helvetica", "bold")
  ctx.pdf.text(text, ctx.margin + indent, ctx.y)
  ctx.y += 14
}

function addField(ctx: PdfCtx, label: string, value: string | null | undefined, indent = 0): void {
  if (value == null || value === "" || value === "false") return
  const display = value === "true" ? "Yes" : value

  ensureSpace(ctx, 20)
  ctx.pdf.setFontSize(9)
  ctx.pdf.setFont("helvetica", "bold")
  ctx.pdf.text(`${label}:`, ctx.margin + indent, ctx.y)
  ctx.y += 12

  ctx.pdf.setFont("helvetica", "normal")
  const lines = ctx.pdf.splitTextToSize(display, ctx.maxW - indent - 4) as string[]
  ensureSpace(ctx, lines.length * 12 + 4)
  ctx.pdf.text(lines, ctx.margin + indent + 4, ctx.y)
  ctx.y += lines.length * 12 + 4
}

function addBool(ctx: PdfCtx, label: string, value: boolean | null | undefined, indent = 0): void {
  if (!value) return
  addField(ctx, label, "Yes", indent)
}

function addDivider(ctx: PdfCtx): void {
  ctx.y += 6
  ensureSpace(ctx, 10)
  ctx.pdf.setDrawColor(210, 210, 210)
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.maxW, ctx.y)
  ctx.y += 10
}

// ─── Work Impact (bcomm1) ────────────────────────────────────────

export async function exportBcomm1ToPdf(commitments: BusinessCommitmentOne[]): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "letter" }) as unknown as JsPDFInstance
  const ctx = newCtx(pdf)

  addTitle(ctx, "Work Impact")
  addSubtitle(ctx, `Exported ${todayStr()} · ${commitments.length} item${commitments.length !== 1 ? "s" : ""}`)

  commitments.forEach((c, i) => {
    addSectionHeading(ctx, i + 1, c.workItem ?? "(untitled)")
    addField(ctx, "Application Context", c.applicationContext)
    addField(ctx, "Date Started", c.started)
    addField(ctx, "Date Completed", c.dateCompleted)
    addField(ctx, "Description", c.description)
    addField(ctx, "Problem / Opportunity", c.problemOpportunity)
    addField(ctx, "Who Benefited", c.whoBenefited)
    addField(ctx, "Impact", c.impact)
    addField(ctx, "Alignment", c.alignment)
    addField(ctx, "Status Notes", c.statusNotes)

    // Value categories
    const valueEntries: { label: string; text: string | null | undefined }[] = [
      { label: "Improved Outcomes", text: c.improvedOutcomes ? c.improvedOutcomesText : null },
      { label: "Increased Efficiency", text: c.increasedEfficiency ? c.increasedEfficiencyText : null },
      { label: "Reduced Risk / Cost", text: c.reducedRiskCost ? c.reducedRiskCostText : null },
      { label: "Enhanced Customer Experience", text: c.enhancedCustomerExperience ? c.enhancedCustomerExperienceText : null },
      { label: "Enhanced Employee Experience", text: c.enhancedEmployeeExperience ? c.enhancedEmployeeExperienceText : null },
    ].filter((e) => e.text)

    if (valueEntries.length > 0) {
      addSubheading(ctx, "Value Entries")
      for (const ve of valueEntries) {
        addField(ctx, ve.label, ve.text, 12)
      }
    }

    if (i < commitments.length - 1) addDivider(ctx)
  })

  pdf.save(`business-partner-impact-${todayStr()}.pdf`)
}

// ─── TDP Program Impact (bcomm2) ──────────────────────────────────────────────

export async function exportBcomm2ToPdf(events: BusinessCommitmentTwo[]): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "letter" }) as unknown as JsPDFInstance
  const ctx = newCtx(pdf)

  addTitle(ctx, "TDP Program Impact")
  addSubtitle(ctx, `Exported ${todayStr()} · ${events.length} item${events.length !== 1 ? "s" : ""}`)

  events.forEach((ev, i) => {
    addSectionHeading(ctx, i + 1, ev.eventName ?? "(untitled)")
    addField(ctx, "Type", ev.type)
    addField(ctx, "Description", ev.description)
    addField(ctx, "Date Started", ev.started)
    addField(ctx, "Date Finished", ev.finished)
    addBool(ctx, "Done", ev.done)
    addBool(ctx, "Required", ev.required)

    const subEvents = ev.subEvents ?? []
    if (subEvents.length > 0) {
      addSubheading(ctx, `Sub-Events (${subEvents.length})`)
      subEvents.forEach((se, j) => {
        addSubheading(ctx, `${j + 1}. ${se.subEventName ?? "(untitled)"}`, 12)
        addField(ctx, "Description", se.description, 16)
        addField(ctx, "Date Started", se.started, 16)
        addField(ctx, "Date Finished", se.finished, 16)
        addBool(ctx, "Done", se.done, 16)
      })
    }

    if (i < events.length - 1) addDivider(ctx)
  })

  pdf.save(`tdp-program-impact-${todayStr()}.pdf`)
}

// ─── Development Commitment (dcomm1) ─────────────────────────────────────────

export async function exportDcomm1ToPdf(
  items: DevelopmentCommitmentOne[],
  modulesByItem: Record<number, LearningModule[]>
): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "letter" }) as unknown as JsPDFInstance
  const ctx = newCtx(pdf)

  addTitle(ctx, "Development Commitment")
  addSubtitle(ctx, `Exported ${todayStr()} · ${items.length} item${items.length !== 1 ? "s" : ""}`)

  items.forEach((item, i) => {
    addSectionHeading(ctx, i + 1, item.itemName ?? "(untitled)")
    addField(ctx, "Date", item.itemDate)

    const modules = item.id != null ? (modulesByItem[item.id] ?? []) : []
    if (modules.length > 0) {
      addSubheading(ctx, `Learning Modules (${modules.length})`)
      modules.forEach((m, j) => {
        addSubheading(ctx, `${j + 1}. ${m.moduleName ?? "(untitled)"}`, 12)
        addField(ctx, "Type", m.type, 16)
        addField(ctx, "Hours", m.hours != null ? String(m.hours) : null, 16)
        addField(ctx, "Date Started", m.dateStarted, 16)
        addField(ctx, "Date Finished", m.dateFinished, 16)
        addBool(ctx, "Finished", m.finished, 16)
        addBool(ctx, "Required", m.required, 16)
        addField(ctx, "Description", m.description, 16)
      })
    }

    if (i < items.length - 1) addDivider(ctx)
  })

  pdf.save(`development-commitment-${todayStr()}.pdf`)
}

// ─── Innovation Commitment (dcomm2) ──────────────────────────────────────────

export async function exportDcomm2ToPdf(events: DevelopmentCommitmentTwo[]): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "letter" }) as unknown as JsPDFInstance
  const ctx = newCtx(pdf)

  addTitle(ctx, "Innovation Commitment")
  addSubtitle(ctx, `Exported ${todayStr()} · ${events.length} item${events.length !== 1 ? "s" : ""}`)

  events.forEach((ev, i) => {
    addSectionHeading(ctx, i + 1, ev.eventName ?? "(untitled)")
    addField(ctx, "Type", ev.type)
    addField(ctx, "Description", ev.description)
    addField(ctx, "Date Started", ev.started)
    addField(ctx, "Date Finished", ev.finished)
    addBool(ctx, "Done", ev.done)
    addBool(ctx, "Required", ev.required)

    if (i < events.length - 1) addDivider(ctx)
  })

  pdf.save(`innovation-commitment-${todayStr()}.pdf`)
}
