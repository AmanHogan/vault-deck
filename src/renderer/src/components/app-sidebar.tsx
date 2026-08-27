/**
 * Obsidian-style dual-panel sidebar.
 *
 * Left: narrow icon rail (~48px) with section icons.
 * Right: content panel (~240px) that shows nav items or vault file tree
 * depending on which rail icon is selected.
 */

import { useState, useRef, useCallback, type ChangeEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Sparkles,
  FileText,
  Users,
  CheckSquare,
  CalendarCheck,
  FolderOpen,
  Folder,
  Search,
  Settings,
  FilePlus,
  Network,
  Layers,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { VaultFileTree } from '@/components/vault-file-tree'
import type { VaultEntry } from '@/types/types'
import { SearchPanel } from '@/components/search-panel'
import { useVault } from '@/lib/vault-context'
import { useEditorTheme, type EditorThemeSettings } from '@/lib/editor-theme-context'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Rail section definitions ────────────────────────────────────────────────

type PanelId = 'files' | 'search' | 'dashboard' | 'settings'

interface RailIcon {
  id: PanelId
  label: string
  icon: LucideIcon
}

const railIcons: RailIcon[] = [
  { id: 'files', label: 'Files', icon: Folder },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// ─── Nav items for each panel ────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const dashboardNav: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Work Impact', href: '/dashboard/business-commitments', icon: ClipboardList },
    ],
  },
  {
    title: 'Development',
    items: [
      { label: 'Development Commitment', href: '/dashboard/development-commitments-one', icon: BookOpen },
      { label: 'Skills', href: '/dashboard/skills', icon: Sparkles },
      { label: 'Resume', href: '/dashboard/resume', icon: FileText },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'One on One Documents', href: '/dashboard/one-on-one', icon: Users },
      { label: 'Action Items', href: '/dashboard/action-items', icon: CheckSquare },
      { label: 'Reviews', href: '/dashboard/reviews', icon: CalendarCheck },
    ],
  },
]

// ─── NavPanel: renders grouped nav links ─────────────────────────────────────

function NavPanel({ groups }: { groups: NavGroup[] }): React.JSX.Element {
  const { pathname } = useLocation()
  const { deactivateFile } = useVault()

  return (
    <div className="flex flex-col gap-1 px-2">
      {groups.map(({ title, items }) => (
        <div key={title} className="mb-1">
          <p className="mb-1 px-2 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </p>
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                to={href}
                onClick={deactivateFile}
                className={cn(
                  'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="break-words leading-snug">{label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── FilesPanel: vault file tree ─────────────────────────────────────────────

function FilesPanel(): React.JSX.Element {
  const { vaultPath, pickAndOpenVault } = useVault()
  const vaultName = vaultPath?.split('/').pop() ?? 'Workspace'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <p className="truncate text-sm font-semibold">{vaultName}</p>
        <button
          type="button"
          onClick={() => void pickAndOpenVault()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Switch vault"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto px-1 py-1">
        <VaultFileTree />
      </div>
    </div>
  )
}

// ─── SettingsPanel — editor colour customisation ────────────────────────────

/** Colour setting descriptor for the settings grid. */
interface ColorSetting {
  key: keyof EditorThemeSettings
  label: string
}

const HEADING_COLORS: ColorSetting[] = [
  { key: 'h1Color', label: 'H1' },
  { key: 'h2Color', label: 'H2' },
  { key: 'h3Color', label: 'H3' },
  { key: 'h4Color', label: 'H4' },
  { key: 'h5Color', label: 'H5' },
  { key: 'h6Color', label: 'H6' },
]

const INLINE_COLORS: ColorSetting[] = [
  { key: 'boldColor', label: 'Bold' },
  { key: 'italicColor', label: 'Italic' },
  { key: 'linkColor', label: 'Link' },
  { key: 'codeColor', label: 'Code' },
]

/**
 * Settings panel with Obsidian-style editor colour pickers.
 * @returns The rendered settings panel.
 */
function SettingsPanel(): React.JSX.Element {
  const { settings, updateSetting, resetToDefaults } = useEditorTheme()

  /** Handle a native colour-picker change. */
  const onColorChange = useCallback(
    (key: keyof EditorThemeSettings) => (e: ChangeEvent<HTMLInputElement>) => {
      updateSetting(key, e.target.value)
    },
    [updateSetting],
  )

  return (
    <div className="flex flex-col gap-4 px-3 py-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">Editor Colors</p>
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Reset all colours to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Headings */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Headings
        </p>
        <div className="grid grid-cols-3 gap-2">
          {HEADING_COLORS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="color"
                value={settings[key]}
                onChange={onColorChange(key)}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Inline formatting */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Inline Formatting
        </p>
        <div className="grid grid-cols-2 gap-2">
          {INLINE_COLORS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="color"
                value={settings[key]}
                onChange={onColorChange(key)}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Live preview swatch */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Preview</p>
        <div className="flex flex-col gap-0.5 font-mono text-xs leading-relaxed">
          <span style={{ color: settings.h1Color, fontWeight: 700, fontSize: '1.15em' }}># Heading 1</span>
          <span style={{ color: settings.h2Color, fontWeight: 700, fontSize: '1.05em' }}>## Heading 2</span>
          <span style={{ color: settings.h3Color, fontWeight: 700 }}>### Heading 3</span>
          <span>
            <span style={{ color: settings.boldColor, fontWeight: 700 }}>**bold**</span>
            {' · '}
            <span style={{ color: settings.italicColor, fontStyle: 'italic' }}>*italic*</span>
          </span>
          <span style={{ color: settings.linkColor, textDecoration: 'underline' }}>[link](url)</span>
          <span style={{ color: settings.codeColor }}>`inline code`</span>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively collect all file names in the vault tree. */
function collectNames(entries: VaultEntry[]): Set<string> {
  const names = new Set<string>()
  for (const e of entries) {
    if (e.type === 'file') names.add(e.name)
    else if (e.children) for (const n of collectNames(e.children)) names.add(n)
  }
  return names
}

// ─── Main sidebar ────────────────────────────────────────────────────────────

/**
 * Obsidian-style sidebar with an icon rail and a content panel.
 * @returns The rendered sidebar.
 */
export function AppSidebar(): React.JSX.Element {
  const [activePanel, setActivePanel] = useState<PanelId>('files')
  const { tree, createFile, openFile } = useVault()

  // ── Resizable content panel ─────────────────────────────────────
  const MIN_WIDTH = 160
  const MAX_WIDTH = 480
  const DEFAULT_WIDTH = 224 // w-56 equivalent
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = panelWidth

    const onMove = (ev: MouseEvent): void => {
      if (!dragging.current) return
      const delta = ev.clientX - startX
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + delta)))
    }
    const onUp = (): void => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  /** Create a new Untitled note. */
  async function newNote(): Promise<void> {
    const existing = collectNames(tree)
    let n = 1
    while (existing.has(`Untitled ${n}.md`)) n++
    const actual = await createFile(`Untitled ${n}.md`)
    openFile(actual)
  }

  /** Create a new diagram. */
  async function newDiagram(): Promise<void> {
    const existing = collectNames(tree)
    let n = 1
    while (existing.has(`Untitled ${n}.diagram`)) n++
    const name = `Untitled ${n}.diagram`
    const content = JSON.stringify({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }, null, 2)
    const actual = await createFile(name, content)
    openFile(actual)
  }

  /** Create a new flashcard deck. */
  async function newDeck(): Promise<void> {
    const existing = collectNames(tree)
    let n = 1
    while (existing.has(`Untitled ${n}.deck`)) n++
    const name = `Untitled ${n}.deck`
    const content = JSON.stringify({ title: `Untitled ${n}`, description: '', tags: [], cards: [] }, null, 2)
    const actual = await createFile(name, content)
    openFile(actual)
  }

  return (
    <div className="flex h-full">
      {/* ── Icon rail ───────────────────────────────────────────────── */}
      <div className="flex w-12 flex-col items-center border-r border-sidebar-border bg-sidebar pt-9">
        {/* Quick-create buttons at the top */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void newNote()}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <FilePlus className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={6}>New note</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void newDiagram()}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <Network className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={6}>New diagram</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void newDeck()}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <Layers className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={6}>New flashcard deck</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider between create buttons and navigation */}
        <div className="mb-1 w-6 border-t border-sidebar-border" />

        {/* Panel-switching icons */}
        <div className="flex flex-col items-center gap-1">
          {railIcons.map(({ id, label, icon: Icon }) => {
            const active = activePanel === id
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setActivePanel(id)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                      active
                        ? 'bg-sidebar-accent text-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={6}>
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>

      {/* ── Content panel (resizable) ──────────────────────────────── */}
      <div className="relative flex flex-col overflow-hidden bg-sidebar" style={{ width: panelWidth }}>
        <div className="flex-1 overflow-auto">
          {activePanel === 'files' && <FilesPanel />}
          {activePanel === 'search' && <SearchPanel />}
          {activePanel === 'dashboard' && <NavPanel groups={dashboardNav} />}
          {activePanel === 'settings' && <SettingsPanel />}
        </div>

        {/* Drag handle on the right edge */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={onDragStart}
          className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize border-r border-sidebar-border transition-colors hover:bg-primary/30 active:bg-primary/50"
        />
      </div>
    </div>
  )
}
