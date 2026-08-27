/**
 * Obsidian-style dual-panel sidebar.
 *
 * Left: narrow icon rail (~48px) with section icons.
 * Right: content panel (~240px) that shows nav items or vault file tree
 * depending on which rail icon is selected.
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Sparkles,
  FileText,
  Users,
  CheckSquare,
  FolderOpen,
  Folder,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { VaultFileTree } from '@/components/vault-file-tree'
import { SearchPanel } from '@/components/search-panel'
import { useVault } from '@/lib/vault-context'
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
      { label: 'Business Partner Impact', href: '/dashboard/business-commitments', icon: ClipboardList },
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

// ─── SettingsPanel placeholder ────────────────────────────────────────────────

function SettingsPanel(): React.JSX.Element {
  return (
    <div className="px-4 py-6 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Settings</p>
      <p className="mt-1 text-xs">Coming soon.</p>
    </div>
  )
}

// ─── Main sidebar ────────────────────────────────────────────────────────────

/**
 * Obsidian-style sidebar with an icon rail and a content panel.
 * @returns The rendered sidebar.
 */
export function AppSidebar(): React.JSX.Element {
  const [activePanel, setActivePanel] = useState<PanelId>('files')

  return (
    <div className="flex h-full">
      {/* ── Icon rail ───────────────────────────────────────────────── */}
      <div className="flex w-12 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar pt-2">
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

      {/* ── Content panel ───────────────────────────────────────────── */}
      <div className="flex w-56 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
        <div className="flex-1 overflow-auto">
          {activePanel === 'files' && <FilesPanel />}
          {activePanel === 'search' && <SearchPanel />}
          {activePanel === 'dashboard' && <NavPanel groups={dashboardNav} />}
          {activePanel === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  )
}
