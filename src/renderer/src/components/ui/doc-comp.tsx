import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

type DocCompProps = {
  cardTitle?: string
  cardDescription?: string
  goals?: string
  validationCriteria?: string[]
  tips?: string[]
}

export default function DocComp({
  cardTitle = 'Section Guidance',
  cardDescription,
  goals,
  validationCriteria = [],
  tips = [],
}: DocCompProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold text-foreground truncate">{cardTitle}</span>
          {cardDescription && !open && (
            <span className="hidden sm:block truncate text-sm text-muted-foreground">— {cardDescription}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 text-sm">
          {cardDescription && (
            <p className="mb-3 text-muted-foreground">{cardDescription}</p>
          )}

          {goals && (
            <>
              <p className="mb-1 font-semibold">Goals / Measures</p>
              <p className="mb-3 text-muted-foreground">{goals}</p>
            </>
          )}

          {validationCriteria.length > 0 && (
            <>
              <p className="mb-1 font-semibold">Validation / Completion Criteria</p>
              <ul className="mb-3 ml-4 list-disc space-y-1 text-muted-foreground">
                {validationCriteria.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}

          {tips.length > 0 && (
            <>
              <p className="mb-1 font-semibold">Tips</p>
              <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
