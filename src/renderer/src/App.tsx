import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppSidebar } from './components/app-sidebar'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { VaultProvider, useVault } from './lib/vault-context'
import { EditorThemeProvider } from './lib/editor-theme-context'
import { CommandPalette } from './components/command-palette'
import { FileTab } from './components/file-tab'

// ── Lazy-loaded pages (code-split so only the visible page loads) ───────────
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BusinessCommitmentsPage = lazy(() => import('./pages/BusinessCommitmentsPage'))
const DevelopmentCommitmentsOnePage = lazy(() => import('./pages/DevelopmentCommitmentsOnePage'))
const SkillsPage = lazy(() => import('./pages/SkillsPage'))
const ResumePage = lazy(() => import('./pages/ResumePage'))
const OneOnOnePage = lazy(() => import('./pages/OneOnOnePage'))
const ActionItemsPage = lazy(() => import('./pages/ActionItemsPage'))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'))
const VaultPickerPage = lazy(() => import('./pages/VaultPickerPage'))
const VaultFilePage = lazy(() => import('./pages/VaultFilePage'))

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
    return <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}><VaultPickerPage /></Suspense>
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <CommandPalette />
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <FileTab />
        {openFilePath ? (
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
            <VaultFilePage key={openFilePath} />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
            <div className="flex-1 overflow-auto p-6">{children}</div>
          </Suspense>
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
