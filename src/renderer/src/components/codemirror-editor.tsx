/**
 * CodeMirror 6 markdown editor component. Mounts a CM EditorView into a
 * div ref, syncs content via `value` / `onChange`, and applies a theme
 * derived from the app's CSS variables so it matches dark/light mode.
 */

import { useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Link as LinkIcon, Underline,
} from 'lucide-react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { livePreview as livePreviewExt } from '@/lib/codemirror-live-preview'

// ─── Theme ──────────────────────────────────────────────────────────────────

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '14px',
    height: '100%',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    lineHeight: '1.6',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: 'var(--foreground, #e4e4e7)',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: 'none',
    color: 'var(--muted-foreground, #71717a)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--foreground, #e4e4e7)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--accent, rgba(255,255,255,0.04))',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--foreground, #e4e4e7)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--ring, #3b82f6) !important',
    opacity: '0.25',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--ring, #3b82f6) !important',
    opacity: '0.3',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--accent, rgba(255,255,255,0.04))',
    border: 'none',
    color: 'var(--muted-foreground, #71717a)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--popover, #18181b)',
    border: '1px solid var(--border, #27272a)',
    color: 'var(--foreground, #e4e4e7)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
})

/**
 * Syntax highlighting colours for markdown and fenced code blocks.
 * Heading, bold, italic, link and code colours read from CSS custom
 * properties set by EditorThemeProvider, so the user can customise them
 * from the Settings panel.
 */
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.5em', color: 'var(--editor-h1, #60a5fa)' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.3em', color: 'var(--editor-h2, #a78bfa)' },
  { tag: tags.heading3, fontWeight: '700', fontSize: '1.15em', color: 'var(--editor-h3, #34d399)' },
  { tag: tags.heading4, fontWeight: '600', color: 'var(--editor-h4, #fbbf24)' },
  { tag: tags.heading5, fontWeight: '600', color: 'var(--editor-h5, #f472b6)' },
  { tag: tags.heading6, fontWeight: '600', color: 'var(--editor-h6, #94a3b8)' },
  { tag: tags.strong, fontWeight: '700', color: 'var(--editor-bold, #fafafa)' },
  { tag: tags.emphasis, fontStyle: 'italic', color: 'var(--editor-italic, #e2e8f0)' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--editor-link, #60a5fa)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--editor-link, #60a5fa)' },
  { tag: tags.monospace, color: 'var(--editor-code, #fb923c)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
  { tag: tags.quote, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.meta, color: '#71717a' },
  { tag: tags.comment, color: '#52525b' },
  { tag: tags.keyword, color: '#f472b6' },
  { tag: tags.string, color: '#4ade80' },
  { tag: tags.number, color: '#fb923c' },
  { tag: tags.bool, color: '#fb923c' },
  { tag: tags.variableName, color: '#60a5fa' },
  { tag: tags.definition(tags.variableName), color: '#60a5fa' },
  { tag: tags.function(tags.variableName), color: '#c084fc' },
  { tag: tags.typeName, color: '#38bdf8' },
  { tag: tags.className, color: '#38bdf8' },
  { tag: tags.propertyName, color: '#60a5fa' },
  { tag: tags.operator, color: '#94a3b8' },
  { tag: tags.punctuation, color: '#71717a' },
  { tag: tags.bracket, color: '#71717a' },
  { tag: tags.processingInstruction, color: '#71717a' },
])

// ─── Markdown formatting helpers ────────────────────────────────────────────

/**
 * Toggle an inline marker around the current selection. Supports symmetric
 * markers (`**`, `*`, `` ` ``, `~~`) and asymmetric pairs (`<u>` / `</u>`).
 * If the selection is already wrapped, the markers are removed; otherwise added.
 * @param view The CodeMirror EditorView.
 * @param open The opening marker string.
 * @param close The closing marker string (defaults to `open` for symmetric markers).
 * @returns true (handled).
 */
function toggleInlineMarker(view: EditorView, open: string, close?: string): boolean {
  const end = close ?? open
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  const openLen = open.length
  const closeLen = end.length

  // Check if the selection is already wrapped
  const before = doc.slice(Math.max(0, from - openLen), from)
  const after = doc.slice(to, to + closeLen)

  if (before === open && after === end) {
    // Remove the markers
    view.dispatch({
      changes: [
        { from: from - openLen, to: from, insert: '' },
        { from: to, to: to + closeLen, insert: '' },
      ],
      selection: { anchor: from - openLen, head: to - openLen },
    })
  } else {
    // Wrap selection in markers
    view.dispatch({
      changes: [
        { from, insert: open },
        { from: to, insert: end },
      ],
      selection: { anchor: from + openLen, head: to + openLen },
    })
  }
  return true
}

// ─── Extensions ─────────────────────────────────────────────────────────────

/**
 * Build the full set of CodeMirror extensions for the editor.
 * @param onChange Called whenever the document content changes.
 * @param onSave Called when the user presses Cmd/Ctrl+S.
 * @param useLivePreview When true, enable Obsidian-style inline rendering.
 * @returns The extension array.
 */
function buildExtensions(
  onChange: (value: string) => void,
  onSave: () => void,
  useLivePreview: boolean
): Extension[] {
  const base: Extension[] = [
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    history(),
    syntaxHighlighting(markdownHighlightStyle),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    cmPlaceholder('Start writing…'),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...foldKeymap,
      ...closeBracketsKeymap,
      indentWithTab,
      {
        key: 'Mod-s',
        run: () => { onSave(); return true },
      },
      {
        key: 'Mod-b',
        run: (v) => toggleInlineMarker(v, '**'),
      },
      {
        key: 'Mod-i',
        run: (v) => toggleInlineMarker(v, '*'),
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString())
      }
    }),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: 'true', autocorrect: 'on' }),
  ]

  if (useLivePreview) {
    // Obsidian-style: proportional font, no line numbers, just blinking cursor
    base.push(...livePreviewExt)
  } else {
    // Source mode: monospace, line numbers, code-editor look
    base.push(
      editorTheme,
      highlightActiveLine(),
      drawSelection(),
      rectangularSelection(),
      lineNumbers(),
      highlightActiveLineGutter(),
      foldGutter()
    )
  }

  return base
}

// ─── Line-prefix helpers ───────────────────────────────────────────────────

/**
 * Toggle a markdown line prefix (e.g. "# ", "- ", "> ") on the current line.
 * If the line already starts with the prefix, remove it; otherwise add it.
 * For numbered lists, inserts "1. " and removes any "N. " prefix.
 * @param view The EditorView instance.
 * @param prefix The prefix string to toggle.
 * @returns True (consumed the event).
 */
function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const text = line.text

  if (prefix === '1. ') {
    // Numbered list — match any "N. " prefix
    const match = text.match(/^\d+\.\s/)
    if (match) {
      view.dispatch({ changes: { from: line.from, to: line.from + match[0].length, insert: '' } })
    } else {
      // Strip any existing prefix (bullet, heading, quote) then add "1. "
      const stripped = text.replace(/^(#{1,6}\s|[-*+]\s|>\s)/, '')
      view.dispatch({ changes: { from: line.from, to: line.from + text.length, insert: `1. ${stripped}` } })
    }
  } else if (text.startsWith(prefix)) {
    view.dispatch({ changes: { from: line.from, to: line.from + prefix.length, insert: '' } })
  } else {
    // Strip any existing block prefix before adding the new one
    const stripped = text.replace(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)/, '')
    view.dispatch({ changes: { from: line.from, to: line.from + text.length, insert: `${prefix}${stripped}` } })
  }
  return true
}

/**
 * Insert a horizontal rule below the current line.
 * @param view The EditorView instance.
 * @returns True (consumed the event).
 */
function insertHorizontalRule(view: EditorView): boolean {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  view.dispatch({
    changes: { from: line.to, insert: '\n\n---\n\n' },
    selection: { anchor: line.to + 6 },
  })
  return true
}

/**
 * Wrap the selection in a markdown link `[text](url)`.
 * @param view The EditorView instance.
 * @returns True (consumed the event).
 */
function insertLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const replacement = selected ? `[${selected}](url)` : '[link text](url)'
  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: { anchor: from + (selected ? selected.length + 3 : 12), head: from + (selected ? selected.length + 6 : 15) },
  })
  return true
}

// ─── Toolbar ──────────────────────────────────────────────────────────────

interface ToolbarAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: (view: EditorView) => boolean
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'Bold (Ctrl+B)', icon: Bold, action: (v) => toggleInlineMarker(v, '**') },
  { label: 'Italic (Ctrl+I)', icon: Italic, action: (v) => toggleInlineMarker(v, '*') },
  { label: 'Underline', icon: Underline, action: (v) => toggleInlineMarker(v, '<u>', '</u>') },
  { label: 'Strikethrough', icon: Strikethrough, action: (v) => toggleInlineMarker(v, '~~') },
  { label: 'Inline Code', icon: Code, action: (v) => toggleInlineMarker(v, '`') },
  { label: 'Heading 1', icon: Heading1, action: (v) => toggleLinePrefix(v, '# ') },
  { label: 'Heading 2', icon: Heading2, action: (v) => toggleLinePrefix(v, '## ') },
  { label: 'Heading 3', icon: Heading3, action: (v) => toggleLinePrefix(v, '### ') },
  { label: 'Bullet List', icon: List, action: (v) => toggleLinePrefix(v, '- ') },
  { label: 'Numbered List', icon: ListOrdered, action: (v) => toggleLinePrefix(v, '1. ') },
  { label: 'Blockquote', icon: Quote, action: (v) => toggleLinePrefix(v, '> ') },
  { label: 'Horizontal Rule', icon: Minus, action: (v) => insertHorizontalRule(v) },
  { label: 'Link', icon: LinkIcon, action: (v) => insertLink(v) },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface CodeMirrorEditorProps {
  /** The document content. Only used for initial load and external resets. */
  value: string
  /** Called on every keystroke with the new document text. */
  onChange: (value: string) => void
  /** Called when Cmd/Ctrl+S is pressed. */
  onSave: () => void
  /** Optional CSS class for the wrapper div. */
  className?: string
  /** Enable Obsidian-style live preview (inline rendered markdown). */
  livePreview?: boolean
}

/**
 * A CodeMirror 6 editor configured for markdown editing with syntax
 * highlighting, line numbers, code folding, and search. When
 * `livePreview` is true, uses Obsidian-style inline rendering.
 * @param props Editor props: value, onChange, onSave, className, livePreview.
 * @returns The rendered editor container.
 */
export function CodeMirrorEditor({ value, onChange, onSave, className, livePreview = false }: CodeMirrorEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)

  // Keep callback refs current without recreating the view
  onChangeRef.current = onChange
  onSaveRef.current = onSave

  // Memoize the livePreview flag so the effect only re-runs when it changes
  const lp = useMemo(() => livePreview, [livePreview])

  // Create the editor on mount and recreate when livePreview toggles
  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: viewRef.current?.state.doc.toString() ?? value,
      extensions: buildExtensions(
        (v) => onChangeRef.current(v),
        () => onSaveRef.current(),
        lp,
      ),
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is only used for initial state; lp triggers rebuild
  }, [lp])

  // When the external value changes (file switch), replace the editor content
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  /** Run a toolbar action on the editor view. */
  const runAction = useCallback((action: (view: EditorView) => boolean) => {
    const view = viewRef.current
    if (!view) return
    action(view)
    view.focus()
  }, [])

  return (
    <div className={className} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Formatting toolbar — hidden in live preview mode */}
      {!livePreview && (
        <div className="flex items-center gap-0.5 border-b border-border bg-card/50 px-2 py-1 flex-shrink-0 overflow-x-auto">
          {TOOLBAR_ACTIONS.map(({ label, icon: Icon, action }, i) => {
            // Add visual separators between groups
            const showSep = i === 4 || i === 7 || i === 10
            return (
              <span key={label} className="contents">
                {showSep && <span className="mx-1 h-5 w-px bg-border/60" />}
                <button
                  type="button"
                  title={label}
                  onClick={() => runAction(action)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Editor */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden' }}
      />
    </div>
  )
}
