/**
 * Inline XLSX/XLS preview component. Uses SheetJS (xlsx) to parse a
 * spreadsheet and render it as HTML tables. Supports multiple sheets
 * with a tab switcher.
 */

import { useEffect, useState } from 'react'
import { read, utils } from 'xlsx'
import { ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface XlsxViewerProps {
  /** Relative vault path to the .xlsx/.xls/.csv file. */
  filePath: string
}

/**
 * Render a spreadsheet file inline as HTML tables.
 * @param props The file path to render.
 * @returns The rendered spreadsheet viewer.
 */
export function XlsxViewer({ filePath }: XlsxViewerProps): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetHtml, setSheetHtml] = useState<Record<string, string>>({})
  const [activeSheet, setActiveSheet] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const buffer = await window.api.vault.readFileBinary(filePath)
        const workbook = read(buffer, { type: 'array' })
        const names = workbook.SheetNames
        const html: Record<string, string> = {}
        for (const name of names) {
          const sheet = workbook.Sheets[name]
          html[name] = utils.sheet_to_html(sheet, { editable: false })
        }
        setSheetNames(names)
        setSheetHtml(html)
        setActiveSheet(names[0] ?? '')
      } catch (err) {
        console.error('Failed to render spreadsheet:', err)
        setError('Failed to render spreadsheet')
      }
      setLoading(false)
    })()
  }, [filePath])

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-border/60 bg-card p-10 text-center">
          <p className="text-lg font-semibold">{filePath.split('/').pop()}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => void window.api.vault.openInDefaultApp(filePath)}
          >
            <ExternalLink className="h-4 w-4" />
            Open in default app
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar: sheet tabs + open externally */}
      <div className="flex items-center border-b border-border">
        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto px-2 py-1">
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              className={cn(
                'shrink-0 rounded-md px-3 py-1 text-xs transition-colors',
                activeSheet === name
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              onClick={() => setActiveSheet(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => void window.api.vault.openInDefaultApp(filePath)}
          title="Open in default app"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Excel
        </button>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Parsing spreadsheet…
        </div>
      )}

      {!loading && activeSheet && sheetHtml[activeSheet] && (
        <div
          className="xlsx-preview flex-1 overflow-auto bg-white p-4"
          dangerouslySetInnerHTML={{ __html: sheetHtml[activeSheet] }}
        />
      )}
    </div>
  )
}
