/**
 * App-wide colour theme presets. Each preset defines the full set of
 * CSS custom properties used by shadcn/ui, the sidebar, and the editor.
 * Selecting a theme applies all these variables to `:root`.
 */

export interface AppTheme {
  /** Human-readable name shown in the picker. */
  label: string
  /** Short description. */
  description: string
  /** CSS custom properties — keys are property names WITHOUT the `--` prefix. */
  vars: Record<string, string>
  /** Editor syntax colours (override EditorThemeSettings defaults). */
  editor: {
    h1: string
    h2: string
    h3: string
    h4: string
    h5: string
    h6: string
    bold: string
    italic: string
    link: string
    code: string
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const APP_THEMES: Record<string, AppTheme> = {
  'tokyo-night': {
    label: 'Tokyo Night',
    description: 'Blue-tinted dark — inspired by the Tokyo skyline',
    vars: {
      background: '#1a1b26',
      foreground: '#c0caf5',
      card: '#1f2335',
      'card-foreground': '#c0caf5',
      popover: '#1f2335',
      'popover-foreground': '#c0caf5',
      primary: '#7aa2f7',
      'primary-foreground': '#1a1b26',
      secondary: '#292e42',
      'secondary-foreground': '#c0caf5',
      muted: '#292e42',
      'muted-foreground': '#565f89',
      accent: '#292e42',
      'accent-foreground': '#c0caf5',
      destructive: '#f7768e',
      border: '#292e42',
      input: '#3b4261',
      ring: '#7aa2f7',
      sidebar: '#1f2335',
      'sidebar-foreground': '#a9b1d6',
      'sidebar-primary': '#7aa2f7',
      'sidebar-primary-foreground': '#1a1b26',
      'sidebar-accent': 'rgba(122, 162, 247, 0.1)',
      'sidebar-accent-foreground': '#7aa2f7',
      'sidebar-border': '#292e42',
      'sidebar-ring': '#7aa2f7'
    },
    editor: {
      h1: '#7aa2f7',
      h2: '#bb9af7',
      h3: '#9ece6a',
      h4: '#e0af68',
      h5: '#f7768e',
      h6: '#565f89',
      bold: '#c0caf5',
      italic: '#c0caf5',
      link: '#7aa2f7',
      code: '#ff9e64'
    }
  },

  'tokyo-night-storm': {
    label: 'Tokyo Night Storm',
    description: 'Lighter variant with more contrast',
    vars: {
      background: '#24283b',
      foreground: '#c0caf5',
      card: '#1f2335',
      'card-foreground': '#c0caf5',
      popover: '#1f2335',
      'popover-foreground': '#c0caf5',
      primary: '#7aa2f7',
      'primary-foreground': '#1a1b26',
      secondary: '#343b58',
      'secondary-foreground': '#c0caf5',
      muted: '#343b58',
      'muted-foreground': '#565f89',
      accent: '#343b58',
      'accent-foreground': '#c0caf5',
      destructive: '#f7768e',
      border: '#343b58',
      input: '#3b4261',
      ring: '#7aa2f7',
      sidebar: '#1f2335',
      'sidebar-foreground': '#a9b1d6',
      'sidebar-primary': '#7aa2f7',
      'sidebar-primary-foreground': '#1a1b26',
      'sidebar-accent': 'rgba(122, 162, 247, 0.1)',
      'sidebar-accent-foreground': '#7aa2f7',
      'sidebar-border': '#343b58',
      'sidebar-ring': '#7aa2f7'
    },
    editor: {
      h1: '#7aa2f7',
      h2: '#bb9af7',
      h3: '#9ece6a',
      h4: '#e0af68',
      h5: '#f7768e',
      h6: '#565f89',
      bold: '#c0caf5',
      italic: '#c0caf5',
      link: '#7aa2f7',
      code: '#ff9e64'
    }
  },

  midnight: {
    label: 'Midnight',
    description: 'Pure black with blue accent — the original',
    vars: {
      background: '#0a0a0a',
      foreground: '#fafafa',
      card: '#171717',
      'card-foreground': '#fafafa',
      popover: '#262626',
      'popover-foreground': '#fafafa',
      primary: '#3b82f6',
      'primary-foreground': '#ffffff',
      secondary: '#262626',
      'secondary-foreground': '#fafafa',
      muted: '#262626',
      'muted-foreground': '#a1a1a1',
      accent: '#404040',
      'accent-foreground': '#fafafa',
      destructive: '#ff6467',
      border: 'rgba(255, 255, 255, 0.11)',
      input: 'rgba(255, 255, 255, 0.14)',
      ring: '#3b82f6',
      sidebar: '#171717',
      'sidebar-foreground': '#e8e8e8',
      'sidebar-primary': '#3b82f6',
      'sidebar-primary-foreground': '#ffffff',
      'sidebar-accent': 'rgba(59, 130, 246, 0.1)',
      'sidebar-accent-foreground': '#60a5fa',
      'sidebar-border': 'rgba(255, 255, 255, 0.09)',
      'sidebar-ring': '#3b82f6'
    },
    editor: {
      h1: '#60a5fa',
      h2: '#a78bfa',
      h3: '#34d399',
      h4: '#fbbf24',
      h5: '#f472b6',
      h6: '#94a3b8',
      bold: '#fafafa',
      italic: '#e2e8f0',
      link: '#3b82f6',
      code: '#fb923c'
    }
  },

  dracula: {
    label: 'Dracula',
    description: 'Purple-tinted dark with vivid accents',
    vars: {
      background: '#282a36',
      foreground: '#f8f8f2',
      card: '#21222c',
      'card-foreground': '#f8f8f2',
      popover: '#21222c',
      'popover-foreground': '#f8f8f2',
      primary: '#bd93f9',
      'primary-foreground': '#282a36',
      secondary: '#44475a',
      'secondary-foreground': '#f8f8f2',
      muted: '#44475a',
      'muted-foreground': '#6272a4',
      accent: '#44475a',
      'accent-foreground': '#f8f8f2',
      destructive: '#ff5555',
      border: '#44475a',
      input: '#44475a',
      ring: '#bd93f9',
      sidebar: '#21222c',
      'sidebar-foreground': '#f8f8f2',
      'sidebar-primary': '#bd93f9',
      'sidebar-primary-foreground': '#282a36',
      'sidebar-accent': 'rgba(189, 147, 249, 0.1)',
      'sidebar-accent-foreground': '#bd93f9',
      'sidebar-border': '#44475a',
      'sidebar-ring': '#bd93f9'
    },
    editor: {
      h1: '#bd93f9',
      h2: '#ff79c6',
      h3: '#50fa7b',
      h4: '#f1fa8c',
      h5: '#8be9fd',
      h6: '#6272a4',
      bold: '#f8f8f2',
      italic: '#f8f8f2',
      link: '#8be9fd',
      code: '#ffb86c'
    }
  },

  nord: {
    label: 'Nord',
    description: 'Arctic, blue-grey palette',
    vars: {
      background: '#2e3440',
      foreground: '#eceff4',
      card: '#3b4252',
      'card-foreground': '#eceff4',
      popover: '#3b4252',
      'popover-foreground': '#eceff4',
      primary: '#88c0d0',
      'primary-foreground': '#2e3440',
      secondary: '#434c5e',
      'secondary-foreground': '#eceff4',
      muted: '#434c5e',
      'muted-foreground': '#7b88a1',
      accent: '#434c5e',
      'accent-foreground': '#eceff4',
      destructive: '#bf616a',
      border: '#434c5e',
      input: '#4c566a',
      ring: '#88c0d0',
      sidebar: '#3b4252',
      'sidebar-foreground': '#d8dee9',
      'sidebar-primary': '#88c0d0',
      'sidebar-primary-foreground': '#2e3440',
      'sidebar-accent': 'rgba(136, 192, 208, 0.1)',
      'sidebar-accent-foreground': '#88c0d0',
      'sidebar-border': '#434c5e',
      'sidebar-ring': '#88c0d0'
    },
    editor: {
      h1: '#88c0d0',
      h2: '#81a1c1',
      h3: '#a3be8c',
      h4: '#ebcb8b',
      h5: '#b48ead',
      h6: '#7b88a1',
      bold: '#eceff4',
      italic: '#d8dee9',
      link: '#88c0d0',
      code: '#d08770'
    }
  },

  'github-dark': {
    label: 'GitHub Dark',
    description: 'GitHub\'s dark default theme',
    vars: {
      background: '#0d1117',
      foreground: '#e6edf3',
      card: '#161b22',
      'card-foreground': '#e6edf3',
      popover: '#161b22',
      'popover-foreground': '#e6edf3',
      primary: '#58a6ff',
      'primary-foreground': '#0d1117',
      secondary: '#21262d',
      'secondary-foreground': '#e6edf3',
      muted: '#21262d',
      'muted-foreground': '#8b949e',
      accent: '#21262d',
      'accent-foreground': '#e6edf3',
      destructive: '#f85149',
      border: '#30363d',
      input: '#30363d',
      ring: '#58a6ff',
      sidebar: '#161b22',
      'sidebar-foreground': '#c9d1d9',
      'sidebar-primary': '#58a6ff',
      'sidebar-primary-foreground': '#0d1117',
      'sidebar-accent': 'rgba(88, 166, 255, 0.1)',
      'sidebar-accent-foreground': '#58a6ff',
      'sidebar-border': '#30363d',
      'sidebar-ring': '#58a6ff'
    },
    editor: {
      h1: '#58a6ff',
      h2: '#d2a8ff',
      h3: '#7ee787',
      h4: '#d29922',
      h5: '#f778ba',
      h6: '#8b949e',
      bold: '#e6edf3',
      italic: '#c9d1d9',
      link: '#58a6ff',
      code: '#ffa657'
    }
  },

  catppuccin: {
    label: 'Catppuccin Mocha',
    description: 'Warm, pastel dark theme',
    vars: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      card: '#181825',
      'card-foreground': '#cdd6f4',
      popover: '#181825',
      'popover-foreground': '#cdd6f4',
      primary: '#89b4fa',
      'primary-foreground': '#1e1e2e',
      secondary: '#313244',
      'secondary-foreground': '#cdd6f4',
      muted: '#313244',
      'muted-foreground': '#6c7086',
      accent: '#313244',
      'accent-foreground': '#cdd6f4',
      destructive: '#f38ba8',
      border: '#313244',
      input: '#45475a',
      ring: '#89b4fa',
      sidebar: '#181825',
      'sidebar-foreground': '#bac2de',
      'sidebar-primary': '#89b4fa',
      'sidebar-primary-foreground': '#1e1e2e',
      'sidebar-accent': 'rgba(137, 180, 250, 0.1)',
      'sidebar-accent-foreground': '#89b4fa',
      'sidebar-border': '#313244',
      'sidebar-ring': '#89b4fa'
    },
    editor: {
      h1: '#89b4fa',
      h2: '#cba6f7',
      h3: '#a6e3a1',
      h4: '#f9e2af',
      h5: '#f38ba8',
      h6: '#6c7086',
      bold: '#cdd6f4',
      italic: '#bac2de',
      link: '#89b4fa',
      code: '#fab387'
    }
  }
}

/** Ordered list of theme keys for the picker UI. */
export const THEME_ORDER: string[] = [
  'tokyo-night',
  'tokyo-night-storm',
  'catppuccin',
  'dracula',
  'nord',
  'github-dark',
  'midnight'
]

export const DEFAULT_THEME = 'tokyo-night'

/**
 * Apply an app theme's CSS variables to the document root.
 * @param themeId The theme key from APP_THEMES.
 */
export function applyAppTheme(themeId: string): void {
  const theme = APP_THEMES[themeId]
  if (!theme) return

  const root = document.documentElement

  // Apply all CSS custom properties
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(`--${prop}`, value)
  }

  // Apply editor syntax colours
  root.style.setProperty('--editor-h1', theme.editor.h1)
  root.style.setProperty('--editor-h2', theme.editor.h2)
  root.style.setProperty('--editor-h3', theme.editor.h3)
  root.style.setProperty('--editor-h4', theme.editor.h4)
  root.style.setProperty('--editor-h5', theme.editor.h5)
  root.style.setProperty('--editor-h6', theme.editor.h6)
  root.style.setProperty('--editor-bold', theme.editor.bold)
  root.style.setProperty('--editor-italic', theme.editor.italic)
  root.style.setProperty('--editor-link', theme.editor.link)
  root.style.setProperty('--editor-code', theme.editor.code)
}
