
import { useState, useMemo } from "react"
import type {
  OneOnOne,
  CreateOneOnOneDTO,
  BusinessCommitmentOne,
  DevelopmentCommitmentOne,
  Skill,
} from "@/types/types"
import { createOneOnOne, updateOneOnOne, deleteOneOnOne } from "@/lib/actions"
import { getAllCommitmentsOne } from "@/lib/actions"
import { getAllDevelopmentCommitmentsOne, getModulesForItem } from "@/lib/actions"
import { getAllSkills } from "@/lib/actions"

// Stubs for removed features (TDP Program Impact, Innovation Commitments)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DevelopmentCommitmentTwo = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BusinessCommitmentTwo = any
const getAllDevelopmentCommitmentsTwo = (): Promise<DevelopmentCommitmentTwo[]> => Promise.resolve([])
const getAllBusinessCommitmentsTwo = (): Promise<BusinessCommitmentTwo[]> => Promise.resolve([])
import { exportToMarkdown, exportToPdf, exportToDocx } from "@/lib/utils/one-on-one-export"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "./ui/card"

// ─── Date-range helpers (shared with import modal) ───────────────────────────

type Preset = 'this-month' | 'last-month' | '3-months' | '6-months' | 'this-year' | 'all' | 'custom'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'this-month',  label: 'This Month' },
  { value: 'last-month',  label: 'Last Month' },
  { value: '3-months',    label: 'Last 3 Months' },
  { value: '6-months',    label: 'Last 6 Months' },
  { value: 'this-year',   label: 'This Year' },
  { value: 'all',         label: 'All Time' },
  { value: 'custom',      label: 'Custom Range' },
]

function presetRange(preset: Preset): { from: Date | null; to: Date | null } {
  const now = new Date()
  const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  if (preset === 'all')         return { from: null, to: null }
  if (preset === 'this-month')  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: eod }
  if (preset === 'last-month') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59) }
  }
  if (preset === '3-months') return { from: new Date(now.getFullYear(), now.getMonth() - 3, 1), to: eod }
  if (preset === '6-months') return { from: new Date(now.getFullYear(), now.getMonth() - 6, 1), to: eod }
  if (preset === 'this-year')   return { from: new Date(now.getFullYear(), 0, 1), to: eod }
  return { from: null, to: null }
}

function inRange(dateStr: string | undefined, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true
  if (!dateStr) return true
  const d = new Date(dateStr)
  if (from && d < from) return false
  if (to   && d > to)   return false
  return true
}

// Which field label to show in the modal header
const IMPORT_SOURCE_LABELS: Record<ImportField, string> = {
  businessPartnerWork: 'Business Partner Impact',
  tdpContributions:    'TDP Program Impact',
  trainingSkills:      'Development Commitment',
  innovationEvents:    'Innovation Commitment',
  additionalItems:     'Skills',
}

type ImportField =
  | "businessPartnerWork"
  | "tdpContributions"
  | "trainingSkills"
  | "innovationEvents"
  | "additionalItems"

const DISCUSSION_FIELDS: [keyof CreateOneOnOneDTO, string][] = [
  ["accomplishments", "Accomplishments"],
  ["challenges", "Challenges"],
  ["goals", "Goals"],
  ["questions", "Questions"],
  ["receivingSupport", "Receiving support"],
  ["outOfOfficePlans", "Out of office plans"],
]

type Props = {
  initialDocs: OneOnOne[]
}

const emptyForm = (): CreateOneOnOneDTO => ({
  documentDate: "",
  businessPartnerWork: "",
  workloadConcerns: "",
  tdpContributions: "",
  utilizationPercentage: undefined,
  trainingSkills: "",
  pursuingDegrees: "",
  compliancePercentage: undefined,
  ehsTrainingPercentage: undefined,
  growthHubProgress: "",
  successPathwaysUpdated: false,
  contingencyTrainingPercentage: undefined,
  innovationEvents: "",
  accomplishments: "",
  challenges: "",
  goals: "",
  questions: "",
  receivingSupport: "",
  additionalItems: "",
  outOfOfficePlans: "",
})

export default function OneOnOnePage({ initialDocs }: Props) {
  const [docs, setDocs] = useState<OneOnOne[]>(initialDocs)
  const [form, setForm] = useState<CreateOneOnOneDTO>(emptyForm())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [importingField, setImportingField] = useState<ImportField | null>(null)
  const [importModalField, setImportModalField] = useState<ImportField | null>(null)
  const [importPreset, setImportPreset] = useState<Preset>('all')
  const [importCustomFrom, setImportCustomFrom] = useState('')
  const [importCustomTo, setImportCustomTo] = useState('')
  const [exportingId, setExportingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleField(field: keyof CreateOneOnOneDTO, val: string | boolean | number | undefined) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  function handleNumberField(field: keyof CreateOneOnOneDTO, val: string) {
    handleField(field, val === "" ? undefined : parseFloat(val))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setImportingField(null)
    try {
      if (editingId) {
        const updated = await updateOneOnOne(editingId, form)
        setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        setEditingId(null)
      } else {
        const created = await createOneOnOne(form)
        setDocs((prev) => [...prev, created])
      }
      setForm(emptyForm())
      setShowForm(false)
    } catch {
      setError(editingId ? "Failed to update document" : "Failed to create document")
    } finally {
      setLoading(false)
    }
  }

  function startEdit(doc: OneOnOne) {
    setEditingId(doc.id!)
    setForm({
      documentDate: doc.documentDate,
      businessPartnerWork: doc.businessPartnerWork ?? "",
      workloadConcerns: doc.workloadConcerns ?? "",
      tdpContributions: doc.tdpContributions ?? "",
      utilizationPercentage: doc.utilizationPercentage,
      trainingSkills: doc.trainingSkills ?? "",
      pursuingDegrees: doc.pursuingDegrees ?? "",
      compliancePercentage: doc.compliancePercentage,
      ehsTrainingPercentage: doc.ehsTrainingPercentage,
      growthHubProgress: doc.growthHubProgress ?? "",
      successPathwaysUpdated: normalizeBoolean(doc.successPathwaysUpdated),
      contingencyTrainingPercentage: doc.contingencyTrainingPercentage,
      innovationEvents: doc.innovationEvents ?? "",
      accomplishments: doc.accomplishments ?? "",
      challenges: doc.challenges ?? "",
      goals: doc.goals ?? "",
      questions: doc.questions ?? "",
      receivingSupport: doc.receivingSupport ?? "",
      additionalItems: doc.additionalItems ?? "",
      outOfOfficePlans: doc.outOfOfficePlans ?? "",
    })
    setImportingField(null)
    setShowForm(true)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setImportingField(null)
    setShowForm(false)
  }

  function normalizeBoolean(value: boolean | string | undefined): boolean {
    return value === true || value === "true"
  }

  async function handleDelete(id: number) {
    try {
      await deleteOneOnOne(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch {
      setError("Failed to delete document")
    }
  } // ─── Import ────────────────────────────────────────────────────────────────

  function formatBusinessCommitmentOne(items: BusinessCommitmentOne[]): string {
    return items
      .map((c) => {
        const lines = [`Work Item: ${c.workItem}`]
        if (c.started) lines.push(`Started: ${c.started}`)
        if (c.dateCompleted) lines.push(`Completed: ${c.dateCompleted}`)
        if (c.applicationContext) lines.push(`Application Context: ${c.applicationContext}`)
        if (c.description) lines.push(`Description: ${c.description}`)
        if (c.problemOpportunity) lines.push(`Problem: ${c.problemOpportunity}`)
        if (c.whoBenefited) lines.push(`Who Benefited: ${c.whoBenefited}`)
        if (c.impact) lines.push(`Impact: ${c.impact}`)
        if (c.alignment) lines.push(`Alignment: ${c.alignment}`)
        if (c.statusNotes) lines.push(`Status Notes: ${c.statusNotes}`)
        const valueEntries = [
          c.improvedOutcomes ? `Improved outcomes: ${c.improvedOutcomesText}` : null,
          c.increasedEfficiency ? `Increased efficiency: ${c.increasedEfficiencyText}` : null,
          c.reducedRiskCost ? `Reduced risk/cost: ${c.reducedRiskCostText}` : null,
          c.enhancedCustomerExperience ? `Enhanced customer experience: ${c.enhancedCustomerExperienceText}` : null,
          c.enhancedEmployeeExperience ? `Enhanced employee experience: ${c.enhancedEmployeeExperienceText}` : null,
        ].filter(Boolean)
        if (valueEntries.length) lines.push(`Values: ${valueEntries.join(", ")}`)
        return lines.join("\n")
      })
      .join("\n\n---\n\n")
  }

  function formatDevelopmentCommitmentOne(items: DevelopmentCommitmentOne[]): string {
    return items
      .map((item) => {
        const lines = [`Learning Item: ${item.itemName}`]
        if (item.modules && item.modules.length > 0) {
          item.modules.forEach((m) => {
            lines.push(`- Module: ${m.moduleName}`)
            if (m.type) lines.push(`  Type: ${m.type}`)
            if (m.hours) lines.push(`  Hours: ${m.hours}`)
            if (m.dateStarted) lines.push(`  Started: ${m.dateStarted}`)
            if (m.dateFinished) lines.push(`  Finished: ${m.dateFinished}`)
            if (m.description) lines.push(`  Description: ${m.description}`)
          })
        }
        return lines.join("\n")
      })
      .join("\n\n---\n\n")
  }

  function formatSkills(items: Skill[]): string {
    const LABELS: Record<number, string> = { 1: "Beginner", 2: "Basic", 3: "Intermediate", 4: "Advanced", 5: "Expert" }
    return [5, 4, 3, 2, 1]
      .flatMap((level) => {
        const group = items.filter((s) => s.proficiency === level)
        if (group.length === 0) return []
        return [`${LABELS[level]}: ${group.map((s) => s.name).join(", ")}`]
      })
      .join("\n")
  }

  function formatDevelopmentCommitmentTwo(items: DevelopmentCommitmentTwo[]): string {
    return items
      .map((e) => {
        const lines = [`Event: ${e.eventName}`]
        if (e.type) lines.push(`Type: ${e.type}`)
        if (e.description) lines.push(`Description: ${e.description}`)
        if (e.started) lines.push(`Started: ${e.started}`)
        if (e.finished) lines.push(`Finished: ${e.finished}`)
        if (e.done != null) lines.push(`Done: ${e.done ? "Yes" : "No"}`)
        if (e.required != null) lines.push(`Required: ${e.required ? "Yes" : "No"}`)
        return lines.join("\n")
      })
      .join("\n\n---\n\n")
  }

  function formatBusinessCommitmentTwo(items: BusinessCommitmentTwo[]): string {
    return items
      .map((e) => {
        const lines = [`Event: ${e.eventName}`]
        if (e.type) lines.push(`Type: ${e.type}`)
        if (e.description) lines.push(`Description: ${e.description}`)
        if (e.started) lines.push(`Started: ${e.started}`)
        if (e.finished) lines.push(`Finished: ${e.finished}`)
        if (e.done != null) lines.push(`Done: ${e.done ? "Yes" : "No"}`)
        if (e.required != null) lines.push(`Required: ${e.required ? "Yes" : "No"}`)
        return lines.join("\n")
      })
      .join("\n\n---\n\n")
  }

  async function handleImport(field: ImportField, from: Date | null, to: Date | null) {
    setImportModalField(null)
    setImportingField(field)
    setError(null)
    try {
      let text = ""
      if (field === "businessPartnerWork") {
        const data = (await getAllCommitmentsOne()).filter(c =>
          inRange(c.started ?? c.dateCompleted, from, to)
        )
        text = formatBusinessCommitmentOne(data)
      } else if (field === "tdpContributions") {
        const data = (await getAllBusinessCommitmentsTwo()).filter(c =>
          inRange(c.started ?? c.finished, from, to)
        )
        text = formatBusinessCommitmentTwo(data)
      } else if (field === "trainingSkills") {
        const items = (await getAllDevelopmentCommitmentsOne()).filter(i =>
          inRange(i.itemDate ?? i.createdAt, from, to)
        )
        const itemsWithModules = await Promise.all(
          items.map(async (item) => {
            if (item.id != null) {
              const modules = await getModulesForItem(item.id)
              return { ...item, modules }
            }
            return item
          })
        )
        text = formatDevelopmentCommitmentOne(itemsWithModules)
        const skills = await getAllSkills()
        if (skills.length > 0) {
          text += "\n\n---\n\nSkills:\n" + formatSkills(skills)
        }
      } else if (field === "additionalItems") {
        const data = await getAllSkills()
        text = formatSkills(data)
      } else if (field === "innovationEvents") {
        const data = (await getAllDevelopmentCommitmentsTwo()).filter(e =>
          inRange(e.started ?? e.finished, from, to)
        )
        text = formatDevelopmentCommitmentTwo(data)
      }
      handleField(field, text)
    } catch {
      setError("Failed to import data")
    } finally {
      setImportingField(null)
    }
  }

  // Resolve the current modal's from/to dates
  const importRange = useMemo(() => {
    if (importPreset === 'custom') {
      return {
        from: importCustomFrom ? new Date(importCustomFrom) : null,
        to:   importCustomTo   ? new Date(importCustomTo + 'T23:59:59') : null,
      }
    }
    return presetRange(importPreset)
  }, [importPreset, importCustomFrom, importCustomTo]) // ─── Export ────────────────────────────────────────────────────────────────

  async function handleExport(doc: OneOnOne, format: "md" | "pdf" | "docx") {
    setExportingId(doc.id!)
    setError(null)
    try {
      if (format === "md") exportToMarkdown(doc)
      else if (format === "pdf") await exportToPdf(doc)
      else await exportToDocx(doc)
    } catch {
      setError("Export failed")
    } finally {
      setExportingId(null)
    }
  }

  function importBtn(field: ImportField, sourceLabel: string) {
    const noFilter = field === 'additionalItems'
    return (
      <button
        type="button"
        onClick={() => {
          if (noFilter) {
            handleImport(field, null, null)
          } else {
            setImportPreset('all')
            setImportCustomFrom('')
            setImportCustomTo('')
            setImportModalField(field)
          }
        }}
        disabled={importingField === field}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
      >
        {importingField === field ? "Importing..." : `Import from ${sourceLabel}`}
      </button>
    )
  }

  return (
    <div className="space-y-8">
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>+ New 1-on-1 Document</Button>
      )}

      {showForm && (
        <Card className="p-0">
          <form onSubmit={handleSave} className="flex flex-col">
            <CardHeader className="pt-4">
              <CardTitle>{editingId ? "Edit Document" : "New 1-on-1 Document"}</CardTitle>
              <CardDescription>
                Capture 1-on-1 notes with consistent styling and import data from related commitments.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* Date */}
              <div>
                <Label>Document date *</Label>
                <Input
                  required
                  type="date"
                  value={form.documentDate}
                  onChange={(e) => handleField("documentDate", e.target.value)}
                />
              </div>
              {/* Work section */}
              <fieldset className="space-y-2 rounded border p-3">
                <legend className="px-1 text-sm font-semibold">Work</legend>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Business partner work</Label>
                    {importBtn("businessPartnerWork", "Business Commitments 1")}
                  </div>

                  <Textarea
                    value={form.businessPartnerWork ?? ""}
                    onChange={(e) => handleField("businessPartnerWork", e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-xs">Workload concerns</Label>
                  <Textarea
                    value={form.workloadConcerns ?? ""}
                    onChange={(e) => handleField("workloadConcerns", e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">TDP contributions</Label>
                    {importBtn("tdpContributions", "Business Commitments 2")}
                  </div>

                  <Textarea
                    value={form.tdpContributions ?? ""}
                    onChange={(e) => handleField("tdpContributions", e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Label className="text-xs">Utilization %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.utilizationPercentage ?? ""}
                    onChange={(e) => handleNumberField("utilizationPercentage", e.target.value)}
                  />
                </div>
              </fieldset>
              {/* Training & Development */}
              <fieldset className="space-y-2 rounded border p-3">
                <legend className="px-1 text-sm font-semibold">Training &amp; Development</legend>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Training skills</Label>
                    {importBtn("trainingSkills", "Development Commitments 1")}
                  </div>

                  <Textarea
                    value={form.trainingSkills ?? ""}
                    onChange={(e) => handleField("trainingSkills", e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-xs">Pursuing degrees</Label>
                  <Input
                    value={form.pursuingDegrees ?? ""}
                    onChange={(e) => handleField("pursuingDegrees", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs">Growth Hub progress</Label>
                  <Input
                    value={form.growthHubProgress ?? ""}
                    onChange={(e) => handleField("growthHubProgress", e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={normalizeBoolean(form.successPathwaysUpdated)}
                    onChange={(e) => handleField("successPathwaysUpdated", e.target.checked)}
                  />
                  Success pathways updated
                </label>
              </fieldset>
              {/* Compliance */}
              <fieldset className="space-y-2 rounded border p-3">
                <legend className="px-1 text-sm font-semibold">Compliance</legend>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Compliance %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.compliancePercentage ?? ""}
                      onChange={(e) => handleNumberField("compliancePercentage", e.target.value)}
                    />
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">EHS Training %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.ehsTrainingPercentage ?? ""}
                      onChange={(e) => handleNumberField("ehsTrainingPercentage", e.target.value)}
                    />
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Contingency Training %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.contingencyTrainingPercentage ?? ""}
                      onChange={(e) => handleNumberField("contingencyTrainingPercentage", e.target.value)}
                    />
                  </div>
                </div>
              </fieldset>
              {/* Discussion */}
              <fieldset className="space-y-2 rounded border p-3">
                <legend className="px-1 text-sm font-semibold">Discussion</legend>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Innovation events</Label>
                    {importBtn("innovationEvents", "Development Commitments 2")}
                  </div>

                  <Textarea
                    value={form.innovationEvents ?? ""}
                    onChange={(e) => handleField("innovationEvents", e.target.value)}
                    rows={3}
                  />
                </div>

                {DISCUSSION_FIELDS.map(([field, label]) => (
                  <div key={field}>
                    <Label className="text-xs">{label}</Label>
                    <Textarea
                      value={(form[field] as string) ?? ""}
                      onChange={(e) => handleField(field, e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Additional items</Label>
                    {importBtn("additionalItems", "Skills")}
                  </div>

                  <Textarea
                    value={form.additionalItems ?? ""}
                    onChange={(e) => handleField("additionalItems", e.target.value)}
                    rows={2}
                  />
                </div>
              </fieldset>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>

            <CardFooter>
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {loading ? "Saving..." : editingId ? "Update" : "Create Document"}
                </button>

                <button type="button" onClick={cancelEdit} className="rounded border px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
      {/* Import date-range modal */}
      {importModalField && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setImportModalField(null)}
        >
          <div
            className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Import from {IMPORT_SOURCE_LABELS[importModalField]}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filter records by date before importing.
                </p>
              </div>
              <button
                className="p-1 rounded hover:bg-accent text-muted-foreground"
                onClick={() => setImportModalField(null)}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setImportPreset(p.value)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors
                    ${importPreset === p.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent/50'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {importPreset === 'custom' && (
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={importCustomFrom}
                    onChange={e => setImportCustomFrom(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={importCustomTo}
                    onChange={e => setImportCustomTo(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {importPreset === 'all'
                ? 'All records will be imported.'
                : 'Only records whose start date falls in this range will be imported.'}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportModalField(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleImport(importModalField, importRange.from, importRange.to)}
              >
                Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      <ul className="space-y-3">
        {docs.map((doc) => (
          <li key={doc.id}>
            <Card className="shadow-sm">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">Document: {doc.documentDate}</p>
                    {doc.accomplishments && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Accomplishments:</span>
                        {doc.accomplishments}
                      </p>
                    )}

                    {doc.goals && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Goals:</span> {doc.goals}
                      </p>
                    )}

                    {doc.challenges && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Challenges:</span> {doc.challenges}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <button onClick={() => startEdit(doc)} className="rounded border px-3 py-1 text-sm hover:bg-accent">
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(doc.id!)}
                      className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Export</p>
                {exportingId === doc.id ? (
                  <p className="text-xs text-muted-foreground">Exporting...</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => handleExport(doc, "md")}
                      className="rounded border px-3 py-1 text-xs hover:bg-accent"
                    >
                      Markdown
                    </button>

                    <button
                      onClick={() => handleExport(doc, "pdf")}
                      className="rounded border px-3 py-1 text-xs hover:bg-accent"
                    >
                      PDF
                    </button>

                    <button
                      onClick={() => handleExport(doc, "docx")}
                      className="rounded border px-3 py-1 text-xs hover:bg-accent"
                    >
                      Word (.docx)
                    </button>
                  </div>
                )}
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
