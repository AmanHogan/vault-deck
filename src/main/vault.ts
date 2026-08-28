/**
 * Vault filesystem layer — manages a user-chosen folder of real files
 * (.md, .diagram, .deck, plus any other files the user drops in).
 *
 * The vault path is persisted in SQLite (app_settings table). On open,
 * a chokidar watcher is started so the renderer can receive live
 * file-tree updates.
 */

import { app, BrowserWindow, dialog } from 'electron'
import { join, relative, extname, sep, basename, dirname } from 'path'
import fs from 'fs'
import { watch, type FSWatcher } from 'chokidar'
import Database from 'better-sqlite3'

// ─── Settings DB (shared with database.ts via same file) ────────────────────

const settingsDb = new Database(join(app.getPath('userData'), 'workspace.db'))
settingsDb.pragma('journal_mode = WAL')

settingsDb.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

/**
 * Read an app setting by key.
 * @param key The setting key.
 * @returns The setting value, or null if not set.
 */
function getSetting(key: string): string | null {
  const row = settingsDb.prepare('SELECT value FROM app_settings WHERE key=?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

/**
 * Write an app setting.
 * @param key The setting key.
 * @param value The setting value.
 */
function setSetting(key: string, value: string): void {
  settingsDb
    .prepare(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
    )
    .run(key, value)
}

// ─── File-tree types ────────────────────────────────────────────────────────

/** Describes a file or folder in the vault tree. */
export interface VaultEntry {
  /** Path relative to vault root, using / separators */
  path: string
  name: string
  /** 'file' | 'directory' */
  type: 'file' | 'directory'
  extension: string
  children?: VaultEntry[]
}

/** Recognized workspace file extensions */
const WORKSPACE_EXTENSIONS = new Set(['.md', '.diagram', '.deck', '.excalidraw', '.canvas', '.txt'])

/** Extensions to show in the file tree (workspace files + common media) */
const VISIBLE_EXTENSIONS = new Set([
  ...WORKSPACE_EXTENSIONS,
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.pptx',
  '.docx',
  '.xlsx',
  '.json',
  '.csv'
])

/** Maximum text file size we'll load into the renderer (5 MB). */
const MAX_TEXT_FILE_SIZE = 5 * 1024 * 1024

/** Extensions that are always binary — never read as UTF-8 text. */
const BINARY_EXTENSIONS = new Set([
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.xz',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.node',
  '.wasm',
  '.class',
  '.jar',
  '.war',
  '.ear',
  '.pyc',
  '.pyo',
  '.o',
  '.a',
  '.lib',
  '.obj',
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
  '.sqlite3',
  '.iso',
  '.dmg',
  '.img',
  '.mp3',
  '.mp4',
  '.m4a',
  '.m4v',
  '.avi',
  '.mov',
  '.mkv',
  '.flv',
  '.wmv',
  '.wav',
  '.flac',
  '.ogg',
  '.aac',
  '.wma',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot'
])

// ─── Watcher state ──────────────────────────────────────────────────────────

let watcher: FSWatcher | null = null
let currentVaultPath: string | null = null

/**
 * Recursively read a directory into a sorted VaultEntry tree.
 * Uses async I/O to avoid blocking the main process on slow drives
 * (OneDrive, network mounts). Hidden files/folders and node_modules
 * are excluded; only files with recognised extensions are included.
 * @param dirPath The absolute directory path.
 * @param vaultRoot The vault root for computing relative paths.
 * @returns The sorted tree of entries.
 */
async function readDirTreeAsync(dirPath: string, vaultRoot: string): Promise<VaultEntry[]> {
  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  } catch {
    return []
  }

  const result: VaultEntry[] = []

  for (const entry of entries) {
    // Skip hidden files/dirs and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

    const fullPath = join(dirPath, entry.name)
    const relPath = relative(vaultRoot, fullPath).split(sep).join('/')

    // On Windows + OneDrive, cloud-only placeholders are reparse points
    // that return false for both isFile() and isDirectory(). Fall back to
    // fs.stat (async) to resolve the real type.
    let isDir = entry.isDirectory()
    let isFile = entry.isFile()
    if (!isDir && !isFile) {
      try {
        const stat = await fs.promises.stat(fullPath)
        isDir = stat.isDirectory()
        isFile = stat.isFile()
      } catch {
        /* skip unreadable entries */ continue
      }
    }

    if (isDir) {
      const children = await readDirTreeAsync(fullPath, vaultRoot)
      // Include directory even if empty (user may want to add files)
      result.push({
        path: relPath,
        name: entry.name,
        type: 'directory',
        extension: '',
        children
      })
    } else if (isFile) {
      const ext = extname(entry.name).toLowerCase()
      // Only include files the app can preview or edit — skip binaries
      // like .zip, .exe, .dll, etc. that would just render as garbled text.
      // Files with no extension (README, Makefile) are still shown.
      if (ext !== '' && !VISIBLE_EXTENSIONS.has(ext)) continue
      result.push({
        path: relPath,
        name: entry.name,
        type: 'file',
        extension: ext
      })
    }
  }

  // Sort: directories first, then alphabetical
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return result
}

/**
 * Send a 'vault:tree-changed' event with the fresh tree to all windows.
 * Uses async tree reading to avoid blocking the main process.
 */
function broadcastTreeChange(): void {
  if (!currentVaultPath) return
  const vaultPath = currentVaultPath
  void readDirTreeAsync(vaultPath, vaultPath).then((tree) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('vault:tree-changed', tree)
    }
  })
}

/**
 * Start watching the vault directory with chokidar. Debounces rapid changes
 * and sends tree updates to the renderer.
 * @param vaultPath The absolute vault directory to watch.
 */
function startWatcher(vaultPath: string): void {
  stopWatcher()
  currentVaultPath = vaultPath

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const debouncedBroadcast = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(broadcastTreeChange, 500)
  }

  watcher = watch(vaultPath, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])\../, // hidden files/dirs
      /node_modules/, // node_modules
      // Skip files with unsupported extensions so changes to .zip/.exe/etc.
      // never fire events, never trigger tree rebuilds, and don't consume
      // OS file-handle slots on Windows. Paths without an extension are
      // kept (they're likely directories or extensionless text files).
      (filePath: string) => {
        const ext = extname(filePath).toLowerCase()
        if (ext === '') return false // allow dirs + extensionless files
        return !VISIBLE_EXTENSIONS.has(ext)
      }
    ],
    persistent: true,
    depth: 10,
    // Disable polling — use native OS events (faster, less CPU).
    // chokidar v5 defaults to native watchers but explicit is safer.
    usePolling: false,
    // Wait for writes to finish before firing (helps with OneDrive/Dropbox)
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  })

  watcher.on('add', debouncedBroadcast)
  watcher.on('addDir', debouncedBroadcast)
  watcher.on('unlink', debouncedBroadcast)
  watcher.on('unlinkDir', debouncedBroadcast)
  watcher.on('change', (changedPath: string) => {
    // Notify renderer about individual file changes (for open editors)
    const relPath = relative(vaultPath, changedPath).split(sep).join('/')
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('vault:file-changed', relPath)
    }
  })
}

/**
 * Stop the current chokidar watcher if one is running.
 */
function stopWatcher(): void {
  if (watcher) {
    void watcher.close()
    watcher = null
  }
}

// ─── Public API (called from ipcMain handlers in index.ts) ──────────────────

export const vault = {
  /**
   * Get the stored vault path, or null if none is set.
   * @returns The vault path or null.
   */
  getVaultPath(): string | null {
    return getSetting('vaultPath')
  },

  /**
   * Set the vault path, persist it, and start the file watcher.
   * @param vaultPath The absolute path to the vault directory.
   */
  openVault(vaultPath: string): void {
    // Ensure the directory exists
    fs.mkdirSync(vaultPath, { recursive: true })
    setSetting('vaultPath', vaultPath)
    startWatcher(vaultPath)
  },

  /**
   * Show a native folder-picker dialog and return the chosen path.
   * @returns The chosen directory path, or null if cancelled.
   */
  async pickVaultFolder(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose vault folder'
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  },

  /**
   * Read the full file tree of the current vault (async to avoid
   * blocking the main process on slow drives).
   * @returns The tree, or an empty array if no vault is open.
   */
  async getTree(): Promise<VaultEntry[]> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) return []
    return readDirTreeAsync(vaultPath, vaultPath)
  },

  /**
   * Get the absolute filesystem path for a relative vault path.
   * Useful for rendering PDFs/images via file:// URLs in the renderer.
   * @param relPath The file path relative to vault root.
   * @returns The absolute path.
   */
  getAbsolutePath(relPath: string): string {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    return resolveVaultPath(vaultPath, relPath)
  },

  /**
   * Read a file's content from the vault by its relative path.
   * Refuses to read files larger than MAX_TEXT_FILE_SIZE or files
   * that appear to be binary.
   * @param relPath The file path relative to vault root (/ separators).
   * @returns The file contents as a UTF-8 string.
   */
  async readFile(relPath: string): Promise<string> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const safePath = resolveVaultPath(vaultPath, relPath)

    // Size guard — don't load huge files into the renderer
    const stat = await fs.promises.stat(safePath)
    if (stat.size > MAX_TEXT_FILE_SIZE) {
      throw new Error(
        `File too large to edit (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_TEXT_FILE_SIZE / 1024 / 1024} MB.`
      )
    }

    // Binary guard — check the extension against known binary types
    const ext = extname(safePath).toLowerCase()
    if (BINARY_EXTENSIONS.has(ext)) {
      throw new Error('Binary file — cannot open as text.')
    }

    return fs.promises.readFile(safePath, 'utf-8')
  },

  /**
   * Read a file's binary content from the vault by its relative path.
   * Used for Office documents (docx, xlsx, pptx) that need ArrayBuffer.
   * @param relPath The file path relative to vault root (/ separators).
   * @returns The file contents as a Node Buffer.
   */
  async readFileBinary(relPath: string): Promise<Buffer> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const safePath = resolveVaultPath(vaultPath, relPath)
    return fs.promises.readFile(safePath)
  },

  /**
   * Write content to a file in the vault (creates parent directories).
   * @param relPath The file path relative to vault root.
   * @param content The file content to write.
   */
  async writeFile(relPath: string, content: string): Promise<void> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const safePath = resolveVaultPath(vaultPath, relPath)
    await fs.promises.mkdir(dirname(safePath), { recursive: true })
    await fs.promises.writeFile(safePath, content, 'utf-8')
  },

  /**
   * Create a new file in the vault. If a file already exists at that path,
   * appends a numeric suffix.
   * @param relPath The desired relative path.
   * @param content The initial content (default empty string).
   * @returns The actual relative path of the created file.
   */
  async createFile(relPath: string, content = ''): Promise<string> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    let finalPath = resolveVaultPath(vaultPath, relPath)

    // Deduplicate name if file exists
    if (fs.existsSync(finalPath)) {
      const dir = dirname(finalPath)
      const ext = extname(finalPath)
      const base = basename(finalPath, ext)
      let i = 1
      while (fs.existsSync(join(dir, `${base} ${i}${ext}`))) i++
      finalPath = join(dir, `${base} ${i}${ext}`)
    }

    await fs.promises.mkdir(dirname(finalPath), { recursive: true })
    await fs.promises.writeFile(finalPath, content, 'utf-8')
    return relative(vaultPath, finalPath).split(sep).join('/')
  },

  /**
   * Copy (duplicate) a file within the vault. Automatically appends a
   * numeric suffix to avoid name collisions.
   * @param relPath The relative path of the source file.
   * @returns The relative path of the new copy.
   */
  async copyFile(relPath: string): Promise<string> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const srcPath = resolveVaultPath(vaultPath, relPath)
    const dir = dirname(srcPath)
    const ext = extname(srcPath)
    const base = basename(srcPath, ext)
    let i = 1
    let destPath = join(dir, `${base} copy${ext}`)
    while (fs.existsSync(destPath)) {
      i++
      destPath = join(dir, `${base} copy ${i}${ext}`)
    }
    await fs.promises.copyFile(srcPath, destPath)
    return relative(vaultPath, destPath).split(sep).join('/')
  },

  /**
   * Delete a file from the vault.
   * @param relPath The relative path of the file to delete.
   */
  async deleteFile(relPath: string): Promise<void> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const safePath = resolveVaultPath(vaultPath, relPath)
    await fs.promises.unlink(safePath)
  },

  /**
   * Rename or move a file within the vault.
   * @param oldRelPath The current relative path.
   * @param newRelPath The desired new relative path.
   * @returns The new relative path.
   */
  async renameFile(oldRelPath: string, newRelPath: string): Promise<string> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const oldAbsPath = resolveVaultPath(vaultPath, oldRelPath)
    const newAbsPath = resolveVaultPath(vaultPath, newRelPath)
    await fs.promises.mkdir(dirname(newAbsPath), { recursive: true })
    await fs.promises.rename(oldAbsPath, newAbsPath)
    return relative(vaultPath, newAbsPath).split(sep).join('/')
  },

  /**
   * Create a directory within the vault.
   * @param relPath The relative directory path.
   */
  async createDirectory(relPath: string): Promise<void> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const safePath = resolveVaultPath(vaultPath, relPath)
    await fs.promises.mkdir(safePath, { recursive: true })
  },

  /**
   * Delete a directory and all its contents from the vault.
   * @param relPath The relative directory path.
   */
  async deleteDirectory(relPath: string): Promise<void> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) throw new Error('No vault open')
    const safePath = resolveVaultPath(vaultPath, relPath)
    await fs.promises.rm(safePath, { recursive: true, force: true })
  },

  /**
   * Initialise the watcher if a vault path is already stored (app startup).
   */
  initFromStored(): void {
    const stored = getSetting('vaultPath')
    if (stored && fs.existsSync(stored)) {
      startWatcher(stored)
    }
  },

  /**
   * Search files in the vault by name and content. Returns up to `limit`
   * matches. For `.deck` files, searches card terms/definitions. For
   * `.diagram` files, searches node labels.
   * @param query The search string (case-insensitive).
   * @param limit Maximum results to return (default 50).
   * @returns An array of search results.
   */
  async search(query: string, limit = 50): Promise<SearchResult[]> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath || !query.trim()) return []
    const q = query.toLowerCase()
    const results: SearchResult[] = []

    async function walk(dir: string): Promise<void> {
      let entries: fs.Dirent[]
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (results.length >= limit) return
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const full = join(dir, entry.name)
        const rel = relative(vaultPath!, full).split(sep).join('/')
        if (entry.isDirectory()) {
          // Match folder name
          if (entry.name.toLowerCase().includes(q)) {
            results.push({ path: rel, name: entry.name, type: 'directory', snippet: '' })
          }
          await walk(full)
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase()
          if (!VISIBLE_EXTENSIONS.has(ext) && ext !== '') continue
          // Match file name
          const nameMatch = entry.name.toLowerCase().includes(q)
          // Try content search for text-based files
          if (SEARCHABLE_EXTENSIONS.has(ext)) {
            try {
              const content = await fs.promises.readFile(full, 'utf-8')
              const snippet = searchFileContent(ext, content, q)
              if (nameMatch || snippet) {
                results.push({
                  path: rel,
                  name: entry.name,
                  type: fileTypeForExt(ext),
                  snippet: snippet ?? ''
                })
              }
            } catch {
              if (nameMatch)
                results.push({ path: rel, name: entry.name, type: 'file', snippet: '' })
            }
          } else if (nameMatch) {
            results.push({ path: rel, name: entry.name, type: 'file', snippet: '' })
          }
        }
      }
    }

    await walk(vaultPath)
    return results
  },

  /**
   * Extract all `#tags` found across searchable vault files.
   * @returns A sorted array of unique tag strings (without the # prefix).
   */
  async getTags(): Promise<TagInfo[]> {
    const vaultPath = currentVaultPath ?? getSetting('vaultPath')
    if (!vaultPath) return []
    const tagMap = new Map<string, string[]>()

    async function walk(dir: string): Promise<void> {
      let entries: fs.Dirent[]
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
          continue
        }
        const ext = extname(entry.name).toLowerCase()
        if (!SEARCHABLE_EXTENSIONS.has(ext)) continue
        try {
          const content = await fs.promises.readFile(full, 'utf-8')
          const rel = relative(vaultPath!, full).split(sep).join('/')
          const tags = extractTags(content)
          for (const tag of tags) {
            const files = tagMap.get(tag) ?? []
            if (!files.includes(rel)) files.push(rel)
            tagMap.set(tag, files)
          }
        } catch {
          /* skip unreadable files */
        }
      }
    }

    await walk(vaultPath)
    return Array.from(tagMap.entries())
      .map(([tag, files]) => ({ tag, files, count: files.length }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  },

  /**
   * Clean up watcher on app quit.
   */
  dispose(): void {
    stopWatcher()
  }
}

// ─── Search types & helpers ──────────────────────────────────────────────────

export interface SearchResult {
  path: string
  name: string
  type: 'file' | 'directory' | 'deck' | 'diagram' | 'excalidraw' | 'canvas'
  snippet: string
}

export interface TagInfo {
  tag: string
  files: string[]
  count: number
}

/** Extensions whose content we read for search / tag extraction. */
const SEARCHABLE_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.deck',
  '.diagram',
  '.excalidraw',
  '.canvas',
  '.json',
  '.csv'
])

/** Extract a snippet of surrounding text around the first match. */
function searchTextContent(content: string, query: string): string | null {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(query)
  if (idx === -1) return null
  const start = Math.max(0, idx - 40)
  const end = Math.min(content.length, idx + query.length + 60)
  let snippet = content.slice(start, end).replace(/\n/g, ' ')
  if (start > 0) snippet = '…' + snippet
  if (end < content.length) snippet = snippet + '…'
  return snippet
}

/** Search inside a .deck JSON file's cards for matching terms/definitions. */
function searchDeckContent(content: string, query: string): string | null {
  try {
    const deck = JSON.parse(content) as {
      title?: string
      cards?: { term?: string; definition?: string }[]
    }
    // Check title
    if (deck.title?.toLowerCase().includes(query)) return `Deck: ${deck.title}`
    // Check cards
    for (const card of deck.cards ?? []) {
      if (card.term?.toLowerCase().includes(query)) return `Card term: ${card.term.slice(0, 80)}`
      if (card.definition?.toLowerCase().includes(query))
        return `Card def: ${card.definition.slice(0, 80)}`
    }
  } catch {
    /* not valid JSON */
  }
  // Fallback to plain text search
  return searchTextContent(content, query)
}

/** Search inside a .diagram JSON file's nodes for matching labels. */
function searchDiagramContent(content: string, query: string): string | null {
  try {
    const diagram = JSON.parse(content) as {
      nodes?: { data?: { label?: string; description?: string } }[]
    }
    for (const node of diagram.nodes ?? []) {
      if (node.data?.label?.toLowerCase().includes(query)) return `Node: ${node.data.label}`
      if (node.data?.description?.toLowerCase().includes(query))
        return `Node desc: ${node.data.description.slice(0, 80)}`
    }
  } catch {
    /* not valid JSON */
  }
  return searchTextContent(content, query)
}

/** Search inside a .excalidraw JSON file's elements for matching text. */
function searchExcalidrawContent(content: string, query: string): string | null {
  try {
    const data = JSON.parse(content) as { elements?: { text?: string; type?: string }[] }
    for (const el of data.elements ?? []) {
      if (el.text && el.text.toLowerCase().includes(query)) {
        return `Text: ${el.text.slice(0, 80)}`
      }
    }
  } catch {
    /* not valid JSON */
  }
  return searchTextContent(content, query)
}

/** Search inside a .canvas JSON file's nodes for matching text/labels. */
function searchCanvasContent(content: string, query: string): string | null {
  try {
    const data = JSON.parse(content) as {
      nodes?: { type?: string; text?: string; label?: string; file?: string; url?: string }[]
    }
    for (const node of data.nodes ?? []) {
      if (node.text && node.text.toLowerCase().includes(query))
        return `Card: ${node.text.slice(0, 80)}`
      if (node.label && node.label.toLowerCase().includes(query)) return `Group: ${node.label}`
      if (node.file && node.file.toLowerCase().includes(query)) return `File: ${node.file}`
      if (node.url && node.url.toLowerCase().includes(query))
        return `Link: ${node.url.slice(0, 80)}`
    }
  } catch {
    /* not valid JSON */
  }
  return searchTextContent(content, query)
}

/**
 * Map a file extension to its SearchResult type.
 * @param ext The lowercase extension (e.g. ".deck").
 * @returns The result type string.
 */
function fileTypeForExt(ext: string): SearchResult['type'] {
  switch (ext) {
    case '.deck':
      return 'deck'
    case '.diagram':
      return 'diagram'
    case '.excalidraw':
      return 'excalidraw'
    case '.canvas':
      return 'canvas'
    default:
      return 'file'
  }
}

/**
 * Search inside a file's content using the appropriate strategy for
 * its extension. Returns a snippet on match, or null.
 * @param ext The lowercase file extension.
 * @param content The file's text content.
 * @param query The lowercase search query.
 * @returns A snippet string, or null if no match.
 */
function searchFileContent(ext: string, content: string, query: string): string | null {
  switch (ext) {
    case '.deck':
      return searchDeckContent(content, query)
    case '.diagram':
      return searchDiagramContent(content, query)
    case '.excalidraw':
      return searchExcalidrawContent(content, query)
    case '.canvas':
      return searchCanvasContent(content, query)
    default:
      return searchTextContent(content, query)
  }
}

/** Extract #hashtags from text content. Matches word-boundary #tag patterns. */
function extractTags(content: string): string[] {
  // Match #tag where tag is alphanumeric with hyphens/underscores, at least 2 chars
  const regex = /(?:^|\s)#([a-zA-Z0-9][\w-]{1,})/g
  const tags = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    tags.add(match[1].toLowerCase())
  }
  return Array.from(tags)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve a relative path within the vault, preventing directory traversal.
 * @param vaultRoot The vault root path.
 * @param relPath The relative path to resolve.
 * @returns The absolute path.
 * @throws If the resolved path escapes the vault root.
 */
function resolveVaultPath(vaultRoot: string, relPath: string): string {
  // Normalise separators and resolve
  const normalised = relPath.split('/').join(sep)
  const absolute = join(vaultRoot, normalised)
  // Ensure the resolved path is within the vault
  const rel = relative(vaultRoot, absolute)
  if (rel.startsWith('..') || rel.startsWith(sep)) {
    throw new Error('Path traversal denied')
  }
  return absolute
}
