import { ElectronAPI } from '@electron-toolkit/preload'

interface DbApi {
  bcomm1: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  dcomm1: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
    getModules: (itemId: number) => Promise<unknown[]>
    createModule: (itemId: number, payload: unknown) => Promise<unknown>
    updateModule: (moduleId: number, payload: unknown) => Promise<unknown>
    deleteModule: (moduleId: number) => Promise<void>
  }
  oneOnOne: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  actionItems: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  skills: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  fcSets: {
    getAll: () => Promise<unknown[]>
    get: (id: number) => Promise<unknown>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
    study: (id: number) => Promise<unknown>
  }
  fcCards: {
    list: (setId: number) => Promise<unknown[]>
    create: (setId: number, payload: unknown) => Promise<unknown>
    createBulk: (setId: number, payload: unknown) => Promise<unknown[]>
    update: (setId: number, cardId: number, payload: unknown) => Promise<unknown>
    toggleStar: (setId: number, cardId: number) => Promise<unknown>
    delete: (setId: number, cardId: number) => Promise<void>
    getStarredGrouped: () => Promise<unknown[]>
    groups: (setId: number) => Promise<string[]>
  }
  fcSkills: {
    list: () => Promise<unknown[]>
    listBySet: (setId: number) => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  files: {
    save: (sourcePath: string) => Promise<string>
    delete: (filename: string) => Promise<void>
    openDialog: (filters: { name: string; extensions: string[] }[]) => Promise<string[]>
    getFileUrl: (filename: string) => Promise<string>
  }
  imageFiles: {
    getAll: () => Promise<unknown[]>
    create: (filename: string, label?: string) => Promise<unknown>
    updateLabel: (id: number, label: string) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  resumeFiles: {
    getAll: () => Promise<unknown[]>
    create: (filename: string, label?: string) => Promise<unknown>
    updateLabel: (id: number, label: string) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  quickAccomplishments: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  periodicReviews: {
    getAll: () => Promise<unknown[]>
    create: (payload: unknown) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  data: {
    saveJson: (suggestedName: string, content: string) => Promise<boolean>
    readJson: () => Promise<string | null>
  }
  notifications: {
    rendererReady: () => Promise<unknown[]>
    checkNow: () => Promise<void>
    onReminder: (callback: (data: unknown) => void) => () => void
    snooze: (id: number, minutes: number) => Promise<void>
    dismiss: (id: number) => Promise<void>
  }
  noteGroups: {
    getAll: () => Promise<unknown[]>
    create: (name: string) => Promise<unknown>
    update: (id: number, name: string) => Promise<unknown>
    delete: (id: number) => Promise<void>
  }
  notes: {
    listByGroup: (groupId: number) => Promise<unknown[]>
    create: (groupId: number, title: string) => Promise<unknown>
    update: (id: number, payload: unknown) => Promise<unknown>
    delete: (id: number) => Promise<void>
    exportNote: (title: string, content: string) => Promise<boolean>
    exportGroup: (
      groupName: string,
      noteList: { title: string; content: string }[]
    ) => Promise<number>
    importFiles: (groupId: number) => Promise<unknown[]>
  }
  window: {
    createFileWindow: (filePath: string, x?: number, y?: number) => Promise<void>
  }
  vault: {
    getPath: () => Promise<string | null>
    pick: () => Promise<string | null>
    open: (vaultPath: string) => Promise<void>
    getTree: () => Promise<VaultEntry[]>
    getAbsolutePath: (relPath: string) => Promise<string>
    readFile: (relPath: string) => Promise<string>
    readFileBinary: (relPath: string) => Promise<ArrayBuffer>
    writeFile: (relPath: string, content: string) => Promise<void>
    createFile: (relPath: string, content?: string) => Promise<string>
    copyFile: (relPath: string) => Promise<string>
    deleteFile: (relPath: string) => Promise<void>
    renameFile: (oldPath: string, newPath: string) => Promise<string>
    createDirectory: (relPath: string) => Promise<void>
    deleteDirectory: (relPath: string) => Promise<void>
    search: (
      query: string,
      limit?: number
    ) => Promise<{ path: string; name: string; type: string; snippet: string }[]>
    getTags: () => Promise<{ tag: string; files: string[]; count: number }[]>
    showInExplorer: (relPath: string) => Promise<void>
    openInDefaultApp: (relPath: string) => Promise<string>
    onTreeChanged: (callback: (tree: VaultEntry[]) => void) => () => void
    onFileChanged: (callback: (relPath: string) => void) => () => void
  }
}

interface VaultEntry {
  path: string
  name: string
  type: 'file' | 'directory'
  extension: string
  children?: VaultEntry[]
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DbApi
  }
}
