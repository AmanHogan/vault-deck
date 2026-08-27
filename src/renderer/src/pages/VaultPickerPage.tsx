/**
 * Full-screen first-run page shown when no vault is configured yet.
 * Offers two options: create a new vault or open an existing folder.
 */

import { FolderOpen, FolderPlus } from 'lucide-react'
import { useVault } from '@/lib/vault-context'


/**
 * Vault picker landing page — lets the user select or create their workspace vault.
 * @returns The rendered picker page.
 */
export default function VaultPickerPage(): React.JSX.Element {
  const { pickAndOpenVault } = useVault()

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Workspace</h1>
        <p className="max-w-md text-muted-foreground">
          Choose a folder to use as your vault. All your notes, diagrams, and flashcard decks
          will be stored as real files you can browse, back up, and sync however you like.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void pickAndOpenVault()}
          className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-8 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="rounded-lg bg-blue-500/15 p-3 text-blue-500">
            <FolderPlus className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-semibold group-hover:underline">Create or open vault</p>
            <p className="text-sm text-muted-foreground">
              Pick an empty folder for a fresh vault, or point to an existing one.
            </p>
          </div>
        </button>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 p-8">
          <div className="rounded-lg bg-muted p-3 text-muted-foreground">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-semibold text-muted-foreground">Recent vaults</p>
            <p className="text-sm text-muted-foreground">
              No recent vaults yet. Your previously opened vaults will appear here.
            </p>
          </div>
        </div>
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Supported file types: <code>.md</code> <code>.diagram</code> <code>.deck</code> and more.
        You can change your vault folder later.
      </p>
    </div>
  )
}
