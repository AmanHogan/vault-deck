/**
 * Vault search panel for the sidebar. Searches file names, file contents,
 * .deck card terms/definitions, and .diagram node labels. Also has a
 * tag browser that extracts #hashtags from vault files (Obsidian-style).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVault } from '@/lib/vault-context'
import {
  Search, FileText, Folder, Network, Layers, Tag, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  path: string
  name: string
  type: 'file' | 'directory' | 'deck' | 'diagram'
  snippet: string
}

interface TagInfo {
  tag: string
  files: string[]
  count: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return the right icon component for a search result type / extension. */
function ResultIcon({ result }: { result: SearchResult }): React.JSX.Element {
  if (result.type === 'directory') return <Folder className="h-4 w-4 shrink-0 text-amber-500" />
  if (result.type === 'deck') return <Layers className="h-4 w-4 shrink-0 text-purple-400" />
  if (result.type === 'diagram') return <Network className="h-4 w-4 shrink-0 text-blue-400" />
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
}

/** Highlight matching substring in text. */
function Highlight({ text, query }: { text: string; query: string }): React.JSX.Element {
  if (!query) return <>{text}</>
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-yellow-300/40 px-0.5 text-foreground">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

const DEBOUNCE_MS = 250

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Search panel rendered in the sidebar content area. Provides a search
 * input for vault-wide search and a collapsible tag browser.
 * @returns The rendered search panel.
 */
export function SearchPanel(): React.JSX.Element {
  const { openFile } = useVault()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [tags, setTags] = useState<TagInfo[]>([])
  const [tagsLoaded, setTagsLoaded] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [tagFiles, setTagFiles] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await window.api.vault.search(q, 50)
        setResults(res as SearchResult[])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, DEBOUNCE_MS)
  }, [])

  function handleQueryChange(value: string): void {
    setQuery(value)
    doSearch(value)
  }

  // Load tags when tag browser is opened
  useEffect(() => {
    if (!showTags || tagsLoaded) return
    void (async () => {
      try {
        const t = await window.api.vault.getTags()
        setTags(t as TagInfo[])
      } catch {
        setTags([])
      }
      setTagsLoaded(true)
    })()
  }, [showTags, tagsLoaded])

  function handleSelectTag(tag: TagInfo): void {
    if (selectedTag === tag.tag) {
      setSelectedTag(null)
      setTagFiles([])
    } else {
      setSelectedTag(tag.tag)
      setTagFiles(tag.files)
    }
  }

  function handleClickResult(result: SearchResult): void {
    if (result.type === 'directory') return // Can't open a directory
    openFile(result.path)
  }

  function handleClickTagFile(path: string): void {
    openFile(path)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search input */}
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            placeholder="Search files, cards, nodes…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => { setQuery(''); setResults([]) }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {searching && (
          <p className="px-3 py-4 text-xs text-muted-foreground">Searching…</p>
        )}

        {!searching && query && results.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
        )}

        {!searching && results.length > 0 && (
          <div className="px-1 py-1">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((r) => (
              <button
                key={r.path}
                type="button"
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/6',
                  r.type === 'directory' && 'opacity-70',
                )}
                onClick={() => handleClickResult(r)}
                disabled={r.type === 'directory'}
              >
                <ResultIcon result={r} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-snug">
                    <Highlight text={r.name} query={query} />
                  </p>
                  {r.snippet && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      <Highlight text={r.snippet} query={query} />
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground/50">{r.path}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tag browser toggle */}
        <div className="border-t border-white/10 px-1 py-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
            onClick={() => setShowTags(!showTags)}
          >
            <Tag className="h-4 w-4" />
            <span>Tags</span>
            <span className={cn(
              'ml-auto text-xs transition-transform',
              showTags && 'rotate-180',
            )}>▾</span>
          </button>

          {showTags && (
            <div className="mt-1 space-y-0.5 px-1">
              {!tagsLoaded && (
                <p className="px-2 py-2 text-xs text-muted-foreground">Loading tags…</p>
              )}
              {tagsLoaded && tags.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  No tags found. Add <code className="rounded bg-white/10 px-1">#tag</code> in any file.
                </p>
              )}
              {tags.map((t) => (
                <div key={t.tag}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-white/6',
                      selectedTag === t.tag ? 'bg-blue-600/20 text-blue-300' : 'text-muted-foreground',
                    )}
                    onClick={() => handleSelectTag(t)}
                  >
                    <span className="text-blue-400">#</span>
                    <span className="flex-1 truncate text-left">{t.tag}</span>
                    <span className="text-xs text-muted-foreground/60">{t.count}</span>
                  </button>
                  {selectedTag === t.tag && tagFiles.length > 0 && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                      {tagFiles.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/6 hover:text-foreground"
                          onClick={() => handleClickTagFile(f)}
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{f.split('/').pop()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
