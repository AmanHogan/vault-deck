import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  bcomm1: {
    getAll: () => ipcRenderer.invoke('bcomm1:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('bcomm1:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('bcomm1:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('bcomm1:delete', id)
  },
  dcomm1: {
    getAll: () => ipcRenderer.invoke('dcomm1:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('dcomm1:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('dcomm1:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('dcomm1:delete', id),
    getModules: (itemId: number) => ipcRenderer.invoke('dcomm1:getModules', itemId),
    createModule: (itemId: number, payload: unknown) =>
      ipcRenderer.invoke('dcomm1:createModule', itemId, payload),
    updateModule: (moduleId: number, payload: unknown) =>
      ipcRenderer.invoke('dcomm1:updateModule', moduleId, payload),
    deleteModule: (moduleId: number) => ipcRenderer.invoke('dcomm1:deleteModule', moduleId)
  },
  oneOnOne: {
    getAll: () => ipcRenderer.invoke('oneOnOne:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('oneOnOne:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('oneOnOne:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('oneOnOne:delete', id)
  },
  actionItems: {
    getAll: () => ipcRenderer.invoke('actionItems:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('actionItems:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('actionItems:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('actionItems:delete', id)
  },
  skills: {
    getAll: () => ipcRenderer.invoke('skills:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('skills:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('skills:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('skills:delete', id)
  },
  fcSets: {
    getAll: () => ipcRenderer.invoke('fcSets:getAll'),
    get: (id: number) => ipcRenderer.invoke('fcSets:get', id),
    create: (payload: unknown) => ipcRenderer.invoke('fcSets:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('fcSets:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('fcSets:delete', id),
    study: (id: number) => ipcRenderer.invoke('fcSets:study', id)
  },
  fcCards: {
    list: (setId: number) => ipcRenderer.invoke('fcCards:list', setId),
    create: (setId: number, payload: unknown) =>
      ipcRenderer.invoke('fcCards:create', setId, payload),
    createBulk: (setId: number, payload: unknown) =>
      ipcRenderer.invoke('fcCards:createBulk', setId, payload),
    update: (setId: number, cardId: number, payload: unknown) =>
      ipcRenderer.invoke('fcCards:update', setId, cardId, payload),
    toggleStar: (setId: number, cardId: number) =>
      ipcRenderer.invoke('fcCards:toggleStar', setId, cardId),
    delete: (setId: number, cardId: number) => ipcRenderer.invoke('fcCards:delete', setId, cardId),
    getStarredGrouped: () => ipcRenderer.invoke('fcCards:getStarredGrouped'),
    groups: (setId: number) => ipcRenderer.invoke('fcCards:groups', setId)
  },
  fcSkills: {
    list: () => ipcRenderer.invoke('fcSkills:list'),
    listBySet: (setId: number) => ipcRenderer.invoke('fcSkills:listBySet', setId),
    create: (payload: unknown) => ipcRenderer.invoke('fcSkills:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('fcSkills:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('fcSkills:delete', id)
  },
  files: {
    save: (sourcePath: string) => ipcRenderer.invoke('files:save', sourcePath),
    delete: (filename: string) => ipcRenderer.invoke('files:delete', filename),
    openDialog: (filters: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('files:openDialog', filters),
    getFileUrl: (filename: string) => ipcRenderer.invoke('files:getFileUrl', filename)
  },
  imageFiles: {
    getAll: () => ipcRenderer.invoke('imageFiles:getAll'),
    create: (filename: string, label?: string) =>
      ipcRenderer.invoke('imageFiles:create', filename, label),
    updateLabel: (id: number, label: string) =>
      ipcRenderer.invoke('imageFiles:updateLabel', id, label),
    delete: (id: number) => ipcRenderer.invoke('imageFiles:delete', id)
  },
  resumeFiles: {
    getAll: () => ipcRenderer.invoke('resumeFiles:getAll'),
    create: (filename: string, label?: string) =>
      ipcRenderer.invoke('resumeFiles:create', filename, label),
    updateLabel: (id: number, label: string) =>
      ipcRenderer.invoke('resumeFiles:updateLabel', id, label),
    delete: (id: number) => ipcRenderer.invoke('resumeFiles:delete', id)
  },
  quickAccomplishments: {
    getAll: () => ipcRenderer.invoke('quickAccomplishments:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('quickAccomplishments:create', payload),
    update: (id: number, payload: unknown) =>
      ipcRenderer.invoke('quickAccomplishments:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('quickAccomplishments:delete', id)
  },
  periodicReviews: {
    getAll: () => ipcRenderer.invoke('periodicReviews:getAll'),
    create: (payload: unknown) => ipcRenderer.invoke('periodicReviews:create', payload),
    update: (id: number, payload: unknown) =>
      ipcRenderer.invoke('periodicReviews:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('periodicReviews:delete', id)
  },
  data: {
    saveJson: (suggestedName: string, content: string) =>
      ipcRenderer.invoke('data:saveJson', suggestedName, content),
    readJson: () => ipcRenderer.invoke('data:readJson')
  },
  notifications: {
    rendererReady: () => ipcRenderer.invoke('notifications:rendererReady'),
    checkNow: () => ipcRenderer.invoke('notifications:checkNow'),
    onReminder: (callback: (data: unknown) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: unknown): void => callback(data)
      ipcRenderer.on('reminder:show', handler)
      return (): void => {
        ipcRenderer.off('reminder:show', handler)
      }
    },
    snooze: (id: number, minutes: number) => ipcRenderer.invoke('reminder:snooze', id, minutes),
    dismiss: (id: number) => ipcRenderer.invoke('reminder:dismiss', id)
  },
  noteGroups: {
    getAll: () => ipcRenderer.invoke('noteGroups:getAll'),
    create: (name: string) => ipcRenderer.invoke('noteGroups:create', name),
    update: (id: number, name: string) => ipcRenderer.invoke('noteGroups:update', id, name),
    delete: (id: number) => ipcRenderer.invoke('noteGroups:delete', id)
  },
  notes: {
    listByGroup: (groupId: number) => ipcRenderer.invoke('notes:listByGroup', groupId),
    create: (groupId: number, title: string) => ipcRenderer.invoke('notes:create', groupId, title),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('notes:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('notes:delete', id),
    exportNote: (title: string, content: string) =>
      ipcRenderer.invoke('notes:exportNote', title, content),
    exportGroup: (groupName: string, noteList: { title: string; content: string }[]) =>
      ipcRenderer.invoke('notes:exportGroup', groupName, noteList),
    importFiles: (groupId: number) => ipcRenderer.invoke('notes:importFiles', groupId)
  },
  window: {
    createFileWindow: (filePath: string, x?: number, y?: number) =>
      ipcRenderer.invoke('window:createFileWindow', filePath, x, y) as Promise<void>
  },
  vault: {
    getPath: () => ipcRenderer.invoke('vault:getPath') as Promise<string | null>,
    pick: () => ipcRenderer.invoke('vault:pick') as Promise<string | null>,
    open: (vaultPath: string) => ipcRenderer.invoke('vault:open', vaultPath) as Promise<void>,
    getTree: () => ipcRenderer.invoke('vault:getTree'),
    getAbsolutePath: (relPath: string) =>
      ipcRenderer.invoke('vault:getAbsolutePath', relPath) as Promise<string>,
    readFile: (relPath: string) => ipcRenderer.invoke('vault:readFile', relPath) as Promise<string>,
    readFileBinary: (relPath: string) =>
      ipcRenderer.invoke('vault:readFileBinary', relPath) as Promise<ArrayBuffer>,
    writeFile: (relPath: string, content: string) =>
      ipcRenderer.invoke('vault:writeFile', relPath, content) as Promise<void>,
    createFile: (relPath: string, content?: string) =>
      ipcRenderer.invoke('vault:createFile', relPath, content) as Promise<string>,
    copyFile: (relPath: string) => ipcRenderer.invoke('vault:copyFile', relPath) as Promise<string>,
    deleteFile: (relPath: string) =>
      ipcRenderer.invoke('vault:deleteFile', relPath) as Promise<void>,
    renameFile: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('vault:renameFile', oldPath, newPath) as Promise<string>,
    createDirectory: (relPath: string) =>
      ipcRenderer.invoke('vault:createDirectory', relPath) as Promise<void>,
    deleteDirectory: (relPath: string) =>
      ipcRenderer.invoke('vault:deleteDirectory', relPath) as Promise<void>,
    search: (query: string, limit?: number) =>
      ipcRenderer.invoke('vault:search', query, limit) as Promise<
        { path: string; name: string; type: string; snippet: string }[]
      >,
    getTags: () =>
      ipcRenderer.invoke('vault:getTags') as Promise<
        { tag: string; files: string[]; count: number }[]
      >,
    showInExplorer: (relPath: string) =>
      ipcRenderer.invoke('vault:showInExplorer', relPath) as Promise<void>,
    openInDefaultApp: (relPath: string) =>
      ipcRenderer.invoke('vault:openInDefaultApp', relPath) as Promise<string>,
    onTreeChanged: (callback: (tree: unknown[]) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, tree: unknown[]): void => callback(tree)
      ipcRenderer.on('vault:tree-changed', handler)
      return (): void => {
        ipcRenderer.off('vault:tree-changed', handler)
      }
    },
    onFileChanged: (callback: (relPath: string) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, relPath: string): void => callback(relPath)
      ipcRenderer.on('vault:file-changed', handler)
      return (): void => {
        ipcRenderer.off('vault:file-changed', handler)
      }
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore -- electron-toolkit fallback for non-isolated contexts
  window.electron = electronAPI
  // @ts-ignore -- electron-toolkit fallback for non-isolated contexts
  window.api = api
}
