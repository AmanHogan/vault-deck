import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppSidebar } from './components/app-sidebar'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { VaultProvider, useVault } from './lib/vault-context'
import { EditorThemeProvider } from './lib/editor-theme-context'
import DashboardPage from './pages/DashboardPage'
import BusinessCommitmentsPage from './pages/BusinessCommitmentsPage'
import DevelopmentCommitmentsOnePage from './pages/DevelopmentCommitmentsOnePage'
import SkillsPage from './pages/SkillsPage'
import ResumePage from './pages/ResumePage'
import OneOnOnePage from './pages/OneOnOnePage'
import ActionItemsPage from './pages/ActionItemsPage'
import ReviewsPage from './pages/ReviewsPage'
import VaultPickerPage from './pages/VaultPickerPage'
import VaultFilePage from './pages/VaultFilePage'
import { CommandPalette } from './components/command-palette'
import { FileTab } from './components/file-tab'

/**
 * Inner layout that reads vault state and conditionally shows the
 * vault picker or the main workspace.
 * @param props The page children from the router.
 * @returns The rendered layout.
 */
function Layout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { ready, vaultPath, openFilePath } = useVault()

  // Still loading vault state — show nothing briefly
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  // No vault configured — show the picker
  if (!vaultPath) {
    return <VaultPickerPage />
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <CommandPalette />
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <FileTab />
        {openFilePath ? (
          <VaultFilePage />
        ) : (
          <div className="flex-1 overflow-auto p-6">{children}</div>
        )}
      </main>
    </div>
  )
}

/**
 * Root application component with vault provider and routing.
 * @returns The rendered app.
 */
export default function App(): React.JSX.Element {
  return (
    <TooltipProvider>
    <EditorThemeProvider>
    <VaultProvider>
      <Toaster richColors position="bottom-right" />
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/business-commitments" element={<BusinessCommitmentsPage />} />
            <Route path="/dashboard/development-commitments-one" element={<DevelopmentCommitmentsOnePage />} />
            <Route path="/dashboard/skills" element={<SkillsPage />} />
            <Route path="/dashboard/resume" element={<ResumePage />} />
            <Route path="/dashboard/one-on-one" element={<OneOnOnePage />} />
            <Route path="/dashboard/action-items" element={<ActionItemsPage />} />
            <Route path="/dashboard/reviews" element={<ReviewsPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </VaultProvider>
    </EditorThemeProvider>
    </TooltipProvider>
  )
}
