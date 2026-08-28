/**
 * App settings context — stores user profile (display name), the active
 * app colour theme, editor syntax colours, file-icon colours, and
 * accent/highlight colour. All persisted in localStorage. Colours are
 * applied as CSS custom properties on :root so CodeMirror, icons, and
 * other components can read them.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { APP_THEMES, DEFAULT_THEME, THEME_ORDER, applyAppTheme } from '@/lib/app-themes'

// ─── Editor theme defaults ──────────────────────────────────────────────────

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
  // File-icon colours
  folderColor: string
  diagramColor: string
  excalidrawColor: string
  canvasColor: string
  deckColor: string
  imageColor: string
  documentColor: string
  // Accent / highlight
  accentColor: string
}

/**
 * Build editor theme defaults from the active app theme's editor colours.
 * @param themeId The active app theme key.
 * @returns Editor theme defaults.
 */
function editorDefaultsForTheme(themeId: string): EditorThemeSettings {
  const t = APP_THEMES[themeId] ?? APP_THEMES[DEFAULT_THEME]
  return {
    h1Color: t.editor.h1,
    h2Color: t.editor.h2,
    h3Color: t.editor.h3,
    h4Color: t.editor.h4,
    h5Color: t.editor.h5,
    h6Color: t.editor.h6,
    boldColor: t.editor.bold,
    italicColor: t.editor.italic,
    linkColor: t.editor.link,
    codeColor: t.editor.code,
    // Subtle, monochrome-leaning defaults
    folderColor: '#a1a1aa',
    diagramColor: '#a1a1aa',
    excalidrawColor: '#a1a1aa',
    canvasColor: '#a1a1aa',
    deckColor: '#a1a1aa',
    imageColor: '#a1a1aa',
    documentColor: '#a1a1aa',
    // Accent — match the theme's primary
    accentColor: t.vars.primary ?? '#3b82f6'
  }
}

// ─── User profile ───────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string
}

const PROFILE_DEFAULTS: UserProfile = {
  displayName: 'Aman'
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const THEME_KEY = 'editor-theme-settings'
const PROFILE_KEY = 'user-profile'
const APP_THEME_KEY = 'app-theme'

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppSettingsContextValue {
  // App theme
  appTheme: string
  setAppTheme: (themeId: string) => void
  /** Ordered list of available theme IDs for the picker. */
  availableThemes: string[]
  // Editor theme
  settings: EditorThemeSettings
  updateSetting: (key: keyof EditorThemeSettings, value: string) => void
  resetToDefaults: () => void
  // User profile
  profile: UserProfile
  updateProfile: (key: keyof UserProfile, value: string) => void
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

/**
 * Read the stored app theme ID from localStorage.
 * @returns The theme ID or the default.
 */
function loadAppTheme(): string {
  try {
    const raw = localStorage.getItem(APP_THEME_KEY)
    if (raw && APP_THEMES[raw]) return raw
  } catch { /* ignore */ }
  return DEFAULT_THEME
}

/**
 * Read editor theme from localStorage or fall back to defaults.
 * @param themeId The active app theme key.
 * @returns The editor theme settings.
 */
function loadEditorTheme(themeId: string): EditorThemeSettings {
  const defaults = editorDefaultsForTheme(themeId)
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) as Partial<EditorThemeSettings> }
  } catch { /* ignore */ }
  return { ...defaults }
}

/**
 * Read user profile from localStorage or fall back to defaults.
 * @returns The user profile.
 */
function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) return { ...PROFILE_DEFAULTS, ...JSON.parse(raw) as Partial<UserProfile> }
  } catch { /* ignore */ }
  return { ...PROFILE_DEFAULTS }
}

/**
 * Apply editor-specific settings (icons, accent) as CSS custom
 * properties on :root.
 * @param s The settings object.
 */
function applyEditorToDOM(s: EditorThemeSettings): void {
  const root = document.documentElement
  // Icons
  root.style.setProperty('--icon-folder', s.folderColor)
  root.style.setProperty('--icon-diagram', s.diagramColor)
  root.style.setProperty('--icon-excalidraw', s.excalidrawColor)
  root.style.setProperty('--icon-canvas', s.canvasColor)
  root.style.setProperty('--icon-deck', s.deckColor)
  root.style.setProperty('--icon-image', s.imageColor)
  root.style.setProperty('--icon-document', s.documentColor)
  // Accent
  root.style.setProperty('--icon-accent', s.accentColor)
}

/**
 * Provider that loads/saves all app settings (app theme, editor theme,
 * profile) and applies colours as CSS custom properties.
 * @param props Children.
 * @returns The provider element.
 */
export function EditorThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [appTheme, setAppThemeState] = useState<string>(loadAppTheme)
  const [settings, setSettings] = useState<EditorThemeSettings>(() => loadEditorTheme(loadAppTheme()))
  const [profile, setProfile] = useState<UserProfile>(loadProfile)

  // Apply the full app theme + editor settings on mount and whenever they change
  useEffect(() => {
    // 1. Apply app theme (backgrounds, borders, sidebar, primary, AND editor syntax)
    applyAppTheme(appTheme)
    // 2. Apply editor-only settings (icons, accent — may override theme defaults)
    applyEditorToDOM(settings)
    try { localStorage.setItem(APP_THEME_KEY, appTheme) } catch { /* ignore */ }
    try { localStorage.setItem(THEME_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [appTheme, settings])

  // Persist profile changes
  useEffect(() => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch { /* ignore */ }
  }, [profile])

  /** Switch the app theme and reset editor colours to that theme's defaults. */
  const setAppTheme = useCallback((themeId: string) => {
    if (!APP_THEMES[themeId]) return
    setAppThemeState(themeId)
    // Reset editor colours to the new theme's palette
    setSettings(editorDefaultsForTheme(themeId))
    // Clear stored overrides so the new theme's defaults take effect
    try { localStorage.removeItem(THEME_KEY) } catch { /* ignore */ }
  }, [])

  const updateSetting = useCallback((key: keyof EditorThemeSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setSettings(editorDefaultsForTheme(appTheme))
  }, [appTheme])

  const updateProfile = useCallback((key: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <AppSettingsContext.Provider
      value={{
        appTheme,
        setAppTheme,
        availableThemes: THEME_ORDER,
        settings,
        updateSetting,
        resetToDefaults,
        profile,
        updateProfile
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}

/**
 * Hook to access app settings (theme, profile, icons).
 * @returns The app settings context value.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useEditorTheme(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext)
  if (!ctx) throw new Error('useEditorTheme must be used within EditorThemeProvider')
  return ctx
}
