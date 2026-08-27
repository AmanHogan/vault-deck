/**
 * App settings context — stores user profile (display name) and
 * editor theme colours. All persisted in localStorage.
 * Colours are applied as CSS custom properties on :root so CodeMirror
 * and the markdown preview can read them.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

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
}

const THEME_DEFAULTS: EditorThemeSettings = {
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

// ─── User profile ───────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string
}

const PROFILE_DEFAULTS: UserProfile = {
  displayName: 'Aman',
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const THEME_KEY = 'editor-theme-settings'
const PROFILE_KEY = 'user-profile'

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppSettingsContextValue {
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
 * Read editor theme from localStorage or fall back to defaults.
 * @returns The editor theme settings.
 */
function loadTheme(): EditorThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw) return { ...THEME_DEFAULTS, ...JSON.parse(raw) as Partial<EditorThemeSettings> }
  } catch { /* ignore */ }
  return { ...THEME_DEFAULTS }
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
 * Apply editor theme settings as CSS custom properties on :root.
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
 * Provider that loads/saves all app settings (profile + editor theme)
 * and applies editor colours as CSS custom properties.
 * @param props Children.
 * @returns The provider element.
 */
export function EditorThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<EditorThemeSettings>(loadTheme)
  const [profile, setProfile] = useState<UserProfile>(loadProfile)

  // Apply theme on mount and whenever settings change
  useEffect(() => {
    applyToDOM(settings)
    try { localStorage.setItem(THEME_KEY, JSON.stringify(settings)) } catch { /* ignore */ }
  }, [settings])

  // Persist profile changes
  useEffect(() => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch { /* ignore */ }
  }, [profile])

  const updateSetting = useCallback((key: keyof EditorThemeSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setSettings({ ...THEME_DEFAULTS })
  }, [])

  const updateProfile = useCallback((key: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <AppSettingsContext.Provider value={{ settings, updateSetting, resetToDefaults, profile, updateProfile }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

/**
 * Hook to access editor theme settings.
 * @returns The editor theme context value.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useEditorTheme(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext)
  if (!ctx) throw new Error('useEditorTheme must be used within EditorThemeProvider')
  return ctx
}
