/**
 * Vault file editor/viewer page. Dispatches to the right editor or
 * preview based on file extension:
 *
 * - `.md` / `.txt` — CodeMirror editor with optional live Markdown preview
 * - `.diagram` — full diagram canvas
 * - `.deck` — flashcard deck editor with study mode
 * - `.pdf` — inline PDF viewer (Electron's Chromium PDF renderer)
 * - `.png/.jpg/.gif/.svg/.webp` — image preview
 * - `.docx` — inline preview via docx-preview
 * - `.xlsx/.xls` — inline spreadsheet preview via SheetJS
 * - `.pptx` — info card with "Open in default app" button
 * - Other text files (.json, .csv, etc.) — CodeMirror editor
 *
 * Auto-saves on change (debounced) and on Cmd/Ctrl+S.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVault } from '@/lib/vault-context'
import { CodeMirrorEditor } from '@/components/codemirror-editor'
import { DiagramCanvas } from '@/components/diagram/diagram-canvas'
import { DeckEditor } from '@/components/deck-editor'
import { Markdown } from '@/components/markdown'
import { DocxViewer } from '@/components/docx-viewer'
import { XlsxViewer } from '@/components/xlsx-viewer'
import { Save, Eye, EyeOff, ExternalLink } from 'lucide-react'

/** Debounce delay for auto-save (ms). */
const AUTOSAVE_DELAY = 1000

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'])
const SPREADSHEET_EXTS = new Set(['.xlsx', '.xls', '.csv'])

/**
 * Full-featured file editor page rendered when a vault file is open.
 * @returns The rendered editor, or null when no file is open.
 */
export default function VaultFilePage(): React.JSX.Element | null {
  const { openFilePath } = useVault()
  const [content, setContent] = useState('')
  const [diskContent, setDiskContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ext = openFilePath ? '.' + (openFilePath.split('.').pop()?.toLowerCase() ?? '') : ''
  const isMarkdown = ext === '.md' || ext === '.txt'
  const isDiagram = ext === '.diagram'
  const isDeck = ext === '.deck'
  const isPdf = ext === '.pdf'
  const isImage = IMAGE_EXTS.has(ext)
  const isDocx = ext === '.docx'
  const isSpreadsheet = SPREADSHEET_EXTS.has(ext)
  const isPptx = ext === '.pptx'
  /** Binary file types that don't need text content loading. */
  const isBinaryPreview = isPdf || isImage || isDocx || isSpreadsheet || isPptx

  /** Build a vault-file:// protocol URL for embedding PDFs and images. */
  const vaultFileUrl = openFilePath ? `vault-file://host/${encodeURIComponent(openFilePath)}` : null

  // Load file content when openFilePath changes
  useEffect(() => {
    if (!openFilePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContent('')
      setDiskContent('')
      setLoaded(false)
      setAbsolutePath(null)
      return
    }
    setLoaded(false)
    setDirty(false)
    setAbsolutePath(null)
    void (async () => {
      try {
        // Only read text content for editable files (not binary previews)
        if (!isBinaryPreview) {
          const text = await window.api.vault.readFile(openFilePath)
          setContent(text)
          setDiskContent(text)
        }
      } catch (err) {
        console.error('Failed to read file:', err)
        setContent('')
        setDiskContent('')
      }
      setLoaded(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFilePath])

  // Listen for external file changes (from watcher)
  useEffect(() => {
    if (!openFilePath || isBinaryPreview) return
    const unsub = window.api.vault.onFileChanged((changedPath: string) => {
      if (changedPath === openFilePath && !dirty) {
        void window.api.vault.readFile(openFilePath).then((text) => {
          setContent(text)
          setDiskContent(text)
        })
      }
    })
    return unsub
  }, [openFilePath, dirty, isBinaryPreview])

  const save = useCallback(async () => {
    if (!openFilePath || !dirty) return
    setSaving(true)
    try {
      await window.api.vault.writeFile(openFilePath, content)
      setDiskContent(content)
      setDirty(false)
    } catch (err) {
      console.error('Failed to save:', err)
    }
    setSaving(false)
  }, [openFilePath, content, dirty])

  /**
   * Handle content changes from the editor — mark dirty and schedule
   * an auto-save after the debounce delay.
   */
  const handleChange = useCallback((newContent: string) => {
    setContent(newContent)
    setDirty(true)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      setSaving(true)
      void (async () => {
        try {
          if (openFilePath) {
            await window.api.vault.writeFile(openFilePath, newContent)
            setDiskContent(newContent)
            setDirty(false)
          }
        } catch (err) {
          console.error('Autosave failed:', err)
        }
        setSaving(false)
      })()
    }, AUTOSAVE_DELAY)
  }, [openFilePath])

  // Clean up autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  if (!openFilePath) return null

  // ── Diagram ──
  if (isDiagram) {
    return (
      <div className="flex-1 overflow-hidden">
        <DiagramCanvas filePath={openFilePath} />
      </div>
    )
  }

  // ── Deck ──
  if (isDeck) {
    return (
      <div className="flex-1 overflow-hidden">
        <DeckEditor filePath={openFilePath} />
      </div>
    )
  }

  // ── PDF viewer ──
  if (isPdf && vaultFileUrl) {
    return (
      <div className="flex-1 overflow-hidden">
        <iframe
          src={vaultFileUrl}
          className="h-full w-full border-0"
          title={openFilePath}
        />
      </div>
    )
  }

  // ── Image preview ──
  if (isImage && vaultFileUrl) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-auto bg-black/20 p-8">
        <img
          src={vaultFileUrl}
          alt={openFilePath.split('/').pop() ?? ''}
          className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
        />
      </div>
    )
  }

  // ── DOCX — inline preview via docx-preview ──
  if (isDocx) {
    return <DocxViewer filePath={openFilePath} />
  }

  // ── Spreadsheet (XLSX/XLS/CSV) — inline preview via SheetJS ──
  if (isSpreadsheet) {
    return <XlsxViewer filePath={openFilePath} />
  }

  // ── PPTX — no inline renderer, offer to open externally ──
  if (isPptx) {
    const pptxName = openFilePath.split('/').pop() ?? openFilePath
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-border/60 bg-card p-10 text-center">
          <p className="text-lg font-semibold">{pptxName}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            PowerPoint files can&rsquo;t be previewed inline. Open it in Keynote or PowerPoint to view or edit.
          </p>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => void window.api.vault.openInDefaultApp(openFilePath)}
          >
            <ExternalLink className="h-4 w-4" />
            Open in default app
          </button>
        </div>
      </div>
    )
  }

  // ── Text editor (MD, TXT, JSON, CSV, etc.) ──
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar row — preview toggle + save indicator */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
        <div className="flex-1" />

        {isMarkdown && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            Preview
          </button>
        )}

        {dirty && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => void save()}
            disabled={saving}
          >
            <Save className="h-3 w-3" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {dirty && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="Unsaved changes" />}
        {saving && !dirty && <span className="text-xs text-muted-foreground">Saved</span>}
      </div>

      {loaded ? (
        <div className="flex flex-1 overflow-hidden">
          <div className={isMarkdown && showPreview ? 'w-1/2 border-r' : 'w-full'}>
            <CodeMirrorEditor
              value={diskContent}
              onChange={handleChange}
              onSave={() => void save()}
              className="h-full"
            />
          </div>
          {isMarkdown && showPreview && (
            <div className="w-1/2 overflow-auto p-6">
              <Markdown>{content}</Markdown>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}
    </div>
  )
}
