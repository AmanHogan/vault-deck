/**
 * Excalidraw editor component. Loads `.excalidraw` JSON files from
 * the vault, renders the Excalidraw canvas, and auto-saves on change.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

/** Debounce delay for auto-save (ms). */
const AUTOSAVE_DELAY = 1200

interface ExcalidrawEditorProps {
  filePath: string
  /**
   * Pre-parsed Excalidraw data (used for Obsidian Excalidraw `.md` files
   * where the drawing is decompressed before reaching this component).
   * When provided, skips reading from the filesystem on initial load.
   */
  preloadedData?: Record<string, unknown>
}

/**
 * Wrapper around the Excalidraw React component that loads/saves
 * `.excalidraw` JSON files from the vault filesystem.
 * @param props The vault-relative file path.
 * @returns The rendered Excalidraw editor.
 */
export function ExcalidrawEditor({
  filePath,
  preloadedData
}: ExcalidrawEditorProps): React.JSX.Element {
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filePathRef = useRef(filePath)

  // Keep ref in sync so the timer callback sees the latest path
  useEffect(() => {
    filePathRef.current = filePath
  }, [filePath])

  // Load file content on mount / path change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false)
    setError(null)
    setInitialData(null)

    // If we received pre-parsed data (e.g. from an Obsidian Excalidraw .md
    // file), use it directly instead of reading from the filesystem.
    if (preloadedData) {
      setInitialData(preloadedData)
      setLoaded(true)
      return () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      }
    }

    void (async () => {
      try {
        const raw = await window.api.vault.readFile(filePath)
        if (raw.trim()) {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          setInitialData(parsed)
        } else {
          // Empty file — start with blank canvas
          setInitialData({})
        }
      } catch (err) {
        console.error('Failed to load .excalidraw file:', err)
        setError(String(err))
        setInitialData({})
      }
      setLoaded(true)
    })()

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [filePath, preloadedData])

  /** Save current state to the vault file. */
  const save = useCallback(async () => {
    const api = apiRef.current
    if (!api) return
    try {
      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const files = api.getFiles()

      const data = {
        type: 'excalidraw',
        version: 2,
        source: 'commitments-app',
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize ?? null
        },
        files
      }

      await window.api.vault.writeFile(filePathRef.current, JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('Excalidraw autosave failed:', err)
    }
  }, [])

  /** Debounced change handler. */
  const handleChange = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      void save()
    }, AUTOSAVE_DELAY)
  }, [save])

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading drawing…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load: {error}
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api
        }}
        initialData={initialData ?? undefined}
        onChange={handleChange}
        theme="dark"
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: { saveFileToDisk: true }
          }
        }}
      />
    </div>
  )
}
