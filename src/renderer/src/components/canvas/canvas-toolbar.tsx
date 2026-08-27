/**
 * Toolbar for the canvas editor — buttons to add text, file, link,
 * and group cards, plus color picker for selected nodes.
 */

import { memo } from 'react'
import {
  Type,
  FileText,
  Globe,
  Square,
  Palette,
  Save,
  MousePointer2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CANVAS_COLORS } from './canvas-types'

export type CanvasTool = 'select' | 'text' | 'file' | 'link' | 'group'

interface CanvasToolbarProps {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  onSave: () => void
  saving: boolean
  dirty: boolean
  selectedColor?: string
  onColorChange?: (color: string | undefined) => void
  hasSelection: boolean
}

const TOOLS: { id: CanvasTool; icon: typeof Type; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'text', icon: Type, label: 'Text card' },
  { id: 'file', icon: FileText, label: 'File card' },
  { id: 'link', icon: Globe, label: 'Link card' },
  { id: 'group', icon: Square, label: 'Group' },
]

/**
 * Floating toolbar for the canvas editor.
 * @param props Toolbar state and callbacks.
 * @returns The rendered toolbar.
 */
export const CanvasToolbar = memo(function CanvasToolbar({
  activeTool,
  onToolChange,
  onSave,
  saving,
  dirty,
  selectedColor,
  onColorChange,
  hasSelection,
}: CanvasToolbarProps): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
      {/* Main tool buttons */}
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-card/95 px-1.5 py-1 shadow-xl backdrop-blur-sm">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onToolChange(id)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              activeTool === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
            dirty
              ? 'text-foreground hover:bg-accent'
              : 'text-muted-foreground/50 cursor-default',
          )}
          title="Save"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {/* Color picker — only shown when something is selected */}
      {hasSelection && onColorChange && (
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-card/95 px-1.5 py-1 shadow-xl backdrop-blur-sm">
          <Palette className="mx-1 h-3.5 w-3.5 text-muted-foreground" />
          {Object.entries(CANVAS_COLORS).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              onClick={() => onColorChange(selectedColor === key ? undefined : key)}
              className={cn(
                'h-5 w-5 rounded-full border-2 transition-transform',
                selectedColor === key ? 'scale-125 border-foreground' : 'border-transparent hover:scale-110',
              )}
              style={{ backgroundColor: hex }}
              title={`Color ${key}`}
            />
          ))}
          {selectedColor && (
            <button
              type="button"
              onClick={() => onColorChange(undefined)}
              className="ml-0.5 text-xs text-muted-foreground hover:text-foreground"
              title="Remove color"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
})
