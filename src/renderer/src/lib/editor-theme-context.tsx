/**
 * Editor theme settings context — stores user-configurable colors for
 * markdown headings, bold, italic, etc. Persisted in localStorage.
 * Applied as CSS custom properties on :root so both CodeMirror and the
 * markdown preview can read them.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ─── Defaults ────────────────────────────────────────────────────────────────

export interface EditorThemeSettings {
  h1Color: string
  h2Color: string
  h3Color: string
  h4Color: string
  h5Color: string
  h6Color: string
  boldColor: string
  italicColor: string
  linkColor: string
  codeColor: string
}

const DEFAULTS: EditorThemeSettings = {
  h1Color: '#60a5fa',   // blue-400
  h2Color: '#a78bfa',   // violet-400
  h3Color: '#34d399',   // emerald-400
  h4Color: '#fbbf24',   // amber-400
  h5Color: '#f472b6',   // pink-400
  h6Color: '#94a3b8',   // slate-400
  boldColor: '#fafafa',  // foreground
  italicColor: '#e2e8f0', // slate-200
  linkColor: '#3b82f6',  // primary blue
  codeColor: '#fb923c',  // orange-400
}

const STORAGE_KEY = 'editor-theme-settings'

// ─── Context ─────────────────────────────────────────────────────────────────

interface EditorThemeContextValue {
  settings: EditorThemeSettings
  updateSetting: (key: keyof EditorThemeSettings, value: string) => void
  resetToDefaults: () => void
}

const EditorThemeContext = createContext<EditorThemeContextValue | null>(null)

/**
 * Read the stored settings or fall back to defaults.
 * @returns The editor theme settings.
 */
function loadSettings(): EditorThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) as Partial<EditorThemeSettings> }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

/**
 * Apply settings as CSS custom properties on the document root.
 * @param s The settings object.
 */
function applyToDOM(s: EditorThemeSettings): void {
  const root = document.documentElement
  root.style.setProperty('--editor-h1', s.h1Color)
  root.style.setProperty('--editor-h2', s.h2Color)
  root.style.setProperty('--editor-h3', s.h3Color)
  root.style.setProperty('--editor-h4', s.h4Color)
  root.style.setProperty('--editor-h5', s.h5Color)
  root.style.setProperty('--editor-h6', s.h6Color)
  root.style.setProperty('--editor-bold', s.boldColor)
  root.style.setProperty('--editor-italic', s.italicColor)
  root.style.setProperty('--editor-link', s.linkColor)
  root.style.setProperty('--editor-code', s.codeColor)
}

/**
 * Provider that loads/saves editor theme settings and applies them as CSS vars.
 * @param props Children.
 * @returns The provider element.
 */
export function EditorThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<EditorThemeSettings>(loadSettings)

  // Apply on mount and whenever settings change
  useEffect(() => {
    applyToDOM(settings)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings])

  const updateSetting = useCallback((key: keyof EditorThemeSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setSettings({ ...DEFAULTS })
  }, [])

  return (
    <EditorThemeContext.Provider value={{ settings, updateSetting, resetToDefaults }}>
      {children}
    </EditorThemeContext.Provider>
  )
}

/**
 * Hook to access editor theme settings.
 * @returns The editor theme context value.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useEditorTheme(): EditorThemeContextValue {
  const ctx = useContext(EditorThemeContext)
  if (!ctx) throw new Error('useEditorTheme must be used within EditorThemeProvider')
  return ctx
}
