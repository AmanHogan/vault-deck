/**
 * CodeMirror 6 markdown editor component. Mounts a CM EditorView into a
 * div ref, syncs content via `value` / `onChange`, and applies a theme
 * derived from the app's CSS variables so it matches dark/light mode.
 */

import { useRef, useEffect, useCallback } from 'react'
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

/** Syntax highlighting colours for markdown and fenced code blocks. */
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.5em' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.3em' },
  { tag: tags.heading3, fontWeight: '700', fontSize: '1.15em' },
  { tag: tags.heading4, fontWeight: '600' },
  { tag: tags.heading5, fontWeight: '600' },
  { tag: tags.heading6, fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: '#60a5fa', textDecoration: 'underline' },
  { tag: tags.url, color: '#60a5fa' },
  { tag: tags.monospace, color: '#a78bfa', fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
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
 * Toggle a symmetric inline marker (e.g. `**` for bold, `*` for italic)
 * around the current selection. If the selection is already wrapped, the
 * markers are removed; otherwise they are added.
 * @param view The CodeMirror EditorView.
 * @param marker The marker string (e.g. "**" or "*").
 * @returns true (handled).
 */
function toggleInlineMarker(view: EditorView, marker: string): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  const len = marker.length

  // Check if the selection is already wrapped
  const before = doc.slice(Math.max(0, from - len), from)
  const after = doc.slice(to, to + len)

  if (before === marker && after === marker) {
    // Remove the markers
    view.dispatch({
      changes: [
        { from: from - len, to: from, insert: '' },
        { from: to, to: to + len, insert: '' },
      ],
      selection: { anchor: from - len, head: to - len },
    })
  } else {
    // Wrap selection in markers
    view.dispatch({
      changes: [
        { from, insert: marker },
        { from: to, insert: marker },
      ],
      selection: { anchor: from + len, head: to + len },
    })
  }
  return true
}

// ─── Extensions ─────────────────────────────────────────────────────────────

/**
 * Build the full set of CodeMirror extensions for the markdown editor.
 * @param onChange Called whenever the document content changes.
 * @param onSave Called when the user presses Cmd/Ctrl+S.
 * @returns The extension array.
 */
function buildExtensions(onChange: (value: string) => void, onSave: () => void): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    drawSelection(),
    rectangularSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    foldGutter(),
    highlightSelectionMatches(),
    history(),
    editorTheme,
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
}

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
}

/**
 * A CodeMirror 6 editor configured for markdown editing with syntax
 * highlighting, line numbers, code folding, and search.
 * @param props Editor props: value, onChange, onSave, className.
 * @returns The rendered editor container.
 */
export function CodeMirrorEditor({ value, onChange, onSave, className }: CodeMirrorEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)

  // Keep callback refs current without recreating the view
  onChangeRef.current = onChange
  onSaveRef.current = onSave

  // Create the editor once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: buildExtensions(
        (v) => onChangeRef.current(v),
        () => onSaveRef.current(),
      ),
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is only used for initial state
  }, [])

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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: '100%', overflow: 'hidden' }}
    />
  )
}
