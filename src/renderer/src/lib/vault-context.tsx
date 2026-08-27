/**
 * React context that manages vault state: the current vault path, the live
 * file tree, and multiple open file tabs (like a browser). Wraps the IPC
 * vault API so components just call context methods.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { VaultEntry } from '@/types/types'

interface VaultContextValue {
  /** Absolute path to the vault directory, or null if none is open */
  vaultPath: string | null
  /** Whether the vault has been checked (false during initial load) */
  ready: boolean
  /** The live file tree */
  tree: VaultEntry[]

  // ── Tab management (browser-style) ──
  /** All open tabs (relative paths), in order */
  openTabs: string[]
  /** The currently active tab (relative path), or null */
  openFilePath: string | null
  /** Open a file — adds a tab if not already open, switches to it */
  openFile: (relPath: string) => void
  /** Close a specific tab by path */
  closeTab: (relPath: string) => void
  /** Close all open tabs */
  closeAllTabs: () => void
  /** Close the currently active tab (legacy alias) */
  closeFile: () => void
  /** Deactivate the current tab without closing it (show page content) */
  deactivateFile: () => void
  /** Switch to a specific tab */
  switchTab: (relPath: string) => void

  // ── Vault operations ──
  openVault: (path: string) => Promise<void>
  pickAndOpenVault: () => Promise<void>
  refreshTree: () => Promise<void>
  createFile: (relPath: string, content?: string) => Promise<string>
  createDirectory: (relPath: string) => Promise<void>
  copyFile: (relPath: string) => Promise<string>
  deleteFile: (relPath: string) => Promise<void>
  deleteDirectory: (relPath: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<string>
}

const VaultContext = createContext<VaultContextValue | null>(null)

/**
 * Hook to access the vault context. Throws if used outside VaultProvider.
 * @returns The vault context value.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>')
  return ctx
}

/**
 * Provider that loads the stored vault path on mount, subscribes to tree
 * changes from the main process, and exposes vault operations to children.
 * Manages multiple open file tabs like a browser.
 * @param props The children to wrap.
 * @returns The provider element.
 */
export function VaultProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [tree, setTree] = useState<VaultEntry[]>([])
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  // On mount: check if a vault is already stored
  useEffect(() => {
    void (async () => {
      const stored = await window.api.vault.getPath()
      if (stored) {
        setVaultPath(stored)
        const t = (await window.api.vault.getTree()) as VaultEntry[]
        setTree(t)
      }
      setReady(true)
    })()
  }, [])

  // Subscribe to live tree updates from the file watcher
  useEffect(() => {
    const unsub = window.api.vault.onTreeChanged((newTree: unknown[]) => {
      setTree(newTree as VaultEntry[])
    })
    return unsub
  }, [])

  const refreshTree = useCallback(async () => {
    const t = (await window.api.vault.getTree()) as VaultEntry[]
    setTree(t)
  }, [])

  const openVault = useCallback(async (path: string) => {
    await window.api.vault.open(path)
    setVaultPath(path)
    await refreshTree()
  }, [refreshTree])

  const pickAndOpenVault = useCallback(async () => {
    const picked = await window.api.vault.pick()
    if (picked) await openVault(picked)
  }, [openVault])

  /** Open a file — add to tabs if not there, switch to it. */
  const openFile = useCallback((relPath: string) => {
    setOpenTabs((prev) => {
      if (prev.includes(relPath)) return prev
      return [...prev, relPath]
    })
    setActiveTab(relPath)
  }, [])

  /** Close a tab by path. Switch to the nearest remaining tab. */
  const closeTab = useCallback((relPath: string) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(relPath)
      const next = prev.filter((p) => p !== relPath)
      // If we're closing the active tab, switch to an adjacent one
      setActiveTab((current) => {
        if (current !== relPath) return current
        if (next.length === 0) return null
        // Prefer the tab to the left, or the first one
        return next[Math.min(idx, next.length - 1)]
      })
      return next
    })
  }, [])

  /** Close all open tabs. */
  const closeAllTabs = useCallback(() => {
    setOpenTabs([])
    setActiveTab(null)
  }, [])

  /** Close the active tab (legacy alias for components that just call closeFile). */
  const closeFile = useCallback(() => {
    if (activeTab) closeTab(activeTab)
  }, [activeTab, closeTab])

  /** Deactivate the file view without closing the tab (navigate to page). */
  const deactivateFile = useCallback(() => {
    setActiveTab(null)
  }, [])

  /** Switch to a specific tab. */
  const switchTab = useCallback((relPath: string) => {
    setActiveTab(relPath)
  }, [])

  const createFile = useCallback(async (relPath: string, content?: string) => {
    const actual = await window.api.vault.createFile(relPath, content)
    await refreshTree()
    return actual
  }, [refreshTree])

  const createDirectory = useCallback(async (relPath: string) => {
    await window.api.vault.createDirectory(relPath)
    await refreshTree()
  }, [refreshTree])

  const copyFile = useCallback(async (relPath: string) => {
    const actual = await window.api.vault.copyFile(relPath)
    await refreshTree()
    return actual
  }, [refreshTree])

  const deleteFile = useCallback(async (relPath: string) => {
    await window.api.vault.deleteFile(relPath)
    // Close the tab if it's open
    closeTab(relPath)
    await refreshTree()
  }, [closeTab, refreshTree])

  const deleteDirectory = useCallback(async (relPath: string) => {
    await window.api.vault.deleteDirectory(relPath)
    // Close any tabs inside this directory
    setOpenTabs((prev) => {
      const remaining = prev.filter((p) => !p.startsWith(relPath + '/'))
      setActiveTab((current) => {
        if (current && current.startsWith(relPath + '/')) {
          return remaining.length > 0 ? remaining[remaining.length - 1] : null
        }
        return current
      })
      return remaining
    })
    await refreshTree()
  }, [refreshTree])

  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    const actual = await window.api.vault.renameFile(oldPath, newPath)
    // Update tabs to point to the new path
    setOpenTabs((prev) => prev.map((p) => (p === oldPath ? actual : p)))
    setActiveTab((current) => (current === oldPath ? actual : current))
    await refreshTree()
    return actual
  }, [refreshTree])

  return (
    <VaultContext.Provider
      value={{
        vaultPath,
        ready,
        tree,
        openTabs,
        openFilePath: activeTab,
        openFile,
        closeTab,
        closeAllTabs,
        closeFile,
        deactivateFile,
        switchTab,
        openVault,
        pickAndOpenVault,
        refreshTree,
        createFile,
        createDirectory,
        copyFile,
        deleteFile,
        deleteDirectory,
        renameFile,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}
