/**
 * Ctrl+P command palette overlay. Provides quick navigation to any
 * section (Dashboard, Business Commitments, Action Items, Flashcards,
 * etc.) and vault files. Fuzzy-matches the query against labels.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Sparkles,
  FileText,
  Users,
  CheckSquare,
  Layers,
  Network,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { useVault } from '@/lib/vault-context'

// ─── Command definitions ────────────────────────────────────────────────────

interface Command {
  id: string
  label: string
  group: string
  icon: LucideIcon
  action: 'navigate' | 'open-file'
  href?: string
  filePath?: string
}

const staticCommands: Command[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview', icon: LayoutDashboard, action: 'navigate', href: '/dashboard' },
  { id: 'bcomm', label: 'Business Partner Impact', group: 'Business', icon: ClipboardList, action: 'navigate', href: '/dashboard/business-commitments' },
  { id: 'dcomm1', label: 'Development Commitment', group: 'Development', icon: BookOpen, action: 'navigate', href: '/dashboard/development-commitments-one' },
  { id: 'skills', label: 'Skills', group: 'Development', icon: Sparkles, action: 'navigate', href: '/dashboard/skills' },
  { id: 'resume', label: 'Resume', group: 'Development', icon: FileText, action: 'navigate', href: '/dashboard/resume' },
  { id: '1on1', label: 'One on One Documents', group: 'Other', icon: Users, action: 'navigate', href: '/dashboard/one-on-one' },
  { id: 'actions', label: 'Action Items', group: 'Other', icon: CheckSquare, action: 'navigate', href: '/dashboard/action-items' },
]

/** Map file extension to an icon. */
function fileIcon(name: string): LucideIcon {
  if (name.endsWith('.diagram')) return Network
  if (name.endsWith('.deck')) return Layers
  return FileText
}

// ─── Fuzzy match ────────────────────────────────────────────────────────────

/** Simple substring match, case-insensitive. Returns true if every word in query appears in text. */
function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  return query.toLowerCase().split(/\s+/).every((word) => lower.includes(word))
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Command palette overlay triggered by Ctrl+P. Renders a search input
 * with filtered results for quick navigation.
 * @returns The rendered command palette (or null when closed).
 */
export function CommandPalette(): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [vaultFiles, setVaultFiles] = useState<Command[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { openFile, deactivateFile } = useVault()

  // Load vault files when palette opens
  const loadVaultFiles = useCallback(async (): Promise<void> => {
    try {
      const results = await window.api.vault.search('', 100)
      const cmds: Command[] = results
        .filter((r) => r.type !== 'directory')
        .map((r) => ({
          id: `file:${r.path}`,
          label: r.name,
          group: 'Vault Files',
          icon: fileIcon(r.name),
          action: 'open-file' as const,
          filePath: r.path,
        }))
      setVaultFiles(cmds)
    } catch {
      setVaultFiles([])
    }
  }, [])

  /** Open the palette, resetting query and loading vault files. */
  const openPalette = useCallback((): void => {
    setQuery('')
    setSelectedIndex(0)
    setOpen(true)
    void loadVaultFiles()
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [loadVaultFiles])

  // Keyboard shortcut: Ctrl+P / Cmd+P
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        if (open) {
          setOpen(false)
        } else {
          openPalette()
        }
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, openPalette])

  if (!open) return null

  // Build filtered list
  const allCommands = [...staticCommands, ...vaultFiles]
  const filtered = query ? allCommands.filter((c) => fuzzyMatch(c.label, query)) : allCommands

  // Group filtered results
  const groups = new Map<string, Command[]>()
  for (const cmd of filtered) {
    const list = groups.get(cmd.group) ?? []
    list.push(cmd)
    groups.set(cmd.group, list)
  }

  // Flat list for keyboard nav
  const flatList = Array.from(groups.values()).flat()

  /** Execute the selected command. */
  function execute(cmd: Command): void {
    setOpen(false)
    if (cmd.action === 'navigate' && cmd.href) {
      deactivateFile()
      navigate(cmd.href)
    } else if (cmd.action === 'open-file' && cmd.filePath) {
      openFile(cmd.filePath)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1))
      scrollToSelected(selectedIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
      scrollToSelected(selectedIndex - 1)
    } else if (e.key === 'Enter' && flatList[selectedIndex]) {
      e.preventDefault()
      execute(flatList[selectedIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  function scrollToSelected(index: number): void {
    const container = listRef.current
    if (!container) return
    const items = container.querySelectorAll('[data-cmd-item]')
    const target = items[index]
    if (target) {
      target.scrollIntoView({ block: 'nearest' })
    }
  }

  let flatIndex = 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-white/10 bg-[#1e1e2e] shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="Go to section or file…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-auto px-2 py-2">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </p>
          )}

          {Array.from(groups.entries()).map(([groupName, items]) => (
            <div key={groupName} className="mb-1">
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {groupName}
              </p>
              {items.map((cmd) => {
                const Icon = cmd.icon
                const idx = flatIndex++
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-cmd-item
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-foreground hover:bg-white/6'
                    }`}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{cmd.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-muted-foreground/50">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </>
  )
}
