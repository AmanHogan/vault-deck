/**
 * Inline DOCX preview component. Uses docx-preview to render a Word
 * document (.docx) as HTML inside a container div. The file is read as
 * binary from the vault and rendered on mount or when the path changes.
 */

import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'
import { ExternalLink, Loader2 } from 'lucide-react'

interface DocxViewerProps {
  /** Relative vault path to the .docx file. */
  filePath: string
}

/**
 * Render a .docx file inline using docx-preview.
 * @param props The file path to render.
 * @returns The rendered preview container.
 */
export function DocxViewer({ filePath }: DocxViewerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const buffer = await window.api.vault.readFileBinary(filePath)
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          await renderAsync(buffer, containerRef.current, undefined, {
            className: 'docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true,
            renderHeaders: true,
            renderFooters: true,
          })
        }
      } catch (err) {
        console.error('Failed to render DOCX:', err)
        setError('Failed to render document')
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
      {/* Toolbar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-1.5">
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => void window.api.vault.openInDefaultApp(filePath)}
          title="Open in default app"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Word
        </button>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Rendering document…
        </div>
      )}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-white ${loading ? 'hidden' : ''}`}
      />
    </div>
  )
}
