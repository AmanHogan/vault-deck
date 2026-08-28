/**
 * CodeMirror 6 "live preview" extension for markdown — Obsidian-style
 * inline rendering. On non-active lines, markdown syntax (# headings,
 * **bold**, *italic*, ~~strike~~, `code`, etc.) is visually hidden and
 * the content is rendered with proper styling. When the cursor moves
 * to a line, the raw syntax reappears for editing.
 *
 * Uses the lezer markdown syntax tree to locate nodes and applies
 * CM6 Decorations to hide/style them.
 */

import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  WidgetType,
  EditorView,
  type ViewUpdate
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { type Range } from '@codemirror/state'

// ─── Widgets ──────────────────────────────────────────────────────────────────

/** Visual horizontal-rule widget replacing `---` / `***` / `___`. */
class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const el = document.createElement('hr')
    el.className = 'cm-hr-widget'
    return el
  }
}

/** Bullet widget replacing `- ` / `* ` / `+ `. */
class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-bullet-widget'
    span.textContent = '•'
    return span
  }
}

/** Checkbox widget replacing `[ ]` / `[x]`. */
class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super()
  }

  eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked
  }

  toDOM(): HTMLElement {
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = this.checked
    cb.className = 'cm-task-checkbox'
    cb.setAttribute('aria-label', this.checked ? 'Completed task' : 'Incomplete task')
    return cb
  }
}

// ─── Decoration builders ──────────────────────────────────────────────────────

const headingLine: Record<number, Decoration> = {}
for (let i = 1; i <= 6; i++) {
  headingLine[i] = Decoration.line({ class: `cm-live-h${i}` })
}

const hideMark = Decoration.replace({})

const markBold = Decoration.mark({ class: 'cm-live-bold' })
const markItalic = Decoration.mark({ class: 'cm-live-italic' })
const markStrike = Decoration.mark({ class: 'cm-live-strike' })
const markInlineCode = Decoration.mark({ class: 'cm-live-code' })
const markBlockquoteLine = Decoration.line({ class: 'cm-live-blockquote' })

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Check whether a document line number overlaps the editor selection.
 * When the cursor is on a line, we show raw markdown syntax for editing.
 */
function isLineActive(
  view: EditorView,
  lineNumber: number
): boolean {
  for (const range of view.state.selection.ranges) {
    const fromLine = view.state.doc.lineAt(range.from).number
    const toLine = view.state.doc.lineAt(range.to).number
    if (lineNumber >= fromLine && lineNumber <= toLine) return true
  }
  return false
}

/**
 * Walk the visible syntax tree and produce decorations that hide
 * markdown syntax on non-cursor lines and apply rendered styles.
 */
function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const doc = view.state.doc

  syntaxTree(view.state).iterate({
    enter(node) {
      const lineNum = doc.lineAt(node.from).number
      const active = isLineActive(view, lineNum)

      switch (node.type.name) {
        // ── Headings ────────────────────────────────────────────────
        case 'ATXHeading1':
        case 'ATXHeading2':
        case 'ATXHeading3':
        case 'ATXHeading4':
        case 'ATXHeading5':
        case 'ATXHeading6': {
          const level = Number(node.type.name.slice(-1))
          const line = doc.lineAt(node.from)
          decorations.push(headingLine[level].range(line.from))
          break
        }

        case 'HeaderMark': {
          if (!active) {
            // Hide the # characters + trailing space
            let end = node.to
            if (end < doc.length && doc.sliceString(end, end + 1) === ' ') {
              end += 1
            }
            decorations.push(hideMark.range(node.from, end))
          }
          break
        }

        // ── Bold / Italic ───────────────────────────────────────────
        case 'StrongEmphasis': {
          if (!active) {
            decorations.push(markBold.range(node.from, node.to))
          }
          break
        }

        case 'Emphasis': {
          if (!active) {
            decorations.push(markItalic.range(node.from, node.to))
          }
          break
        }

        case 'EmphasisMark': {
          if (!active) {
            decorations.push(hideMark.range(node.from, node.to))
          }
          break
        }

        // ── Strikethrough ───────────────────────────────────────────
        case 'Strikethrough': {
          if (!active) {
            decorations.push(markStrike.range(node.from, node.to))
          }
          break
        }

        case 'StrikethroughMark': {
          if (!active) {
            decorations.push(hideMark.range(node.from, node.to))
          }
          break
        }

        // ── Inline code ─────────────────────────────────────────────
        case 'InlineCode': {
          if (!active) {
            decorations.push(markInlineCode.range(node.from, node.to))
          }
          break
        }

        case 'CodeMark': {
          if (!active) {
            decorations.push(hideMark.range(node.from, node.to))
          }
          break
        }

        // ── Horizontal rule ─────────────────────────────────────────
        case 'HorizontalRule': {
          if (!active) {
            decorations.push(
              Decoration.replace({ widget: new HorizontalRuleWidget() }).range(
                node.from,
                node.to
              )
            )
          }
          break
        }

        // ── Blockquote ──────────────────────────────────────────────
        case 'Blockquote': {
          // Apply blockquote style to every line in the block
          if (!active) {
            const startLine = doc.lineAt(node.from).number
            const endLine = doc.lineAt(node.to).number
            for (let ln = startLine; ln <= endLine; ln++) {
              decorations.push(markBlockquoteLine.range(doc.line(ln).from))
            }
          }
          break
        }

        case 'QuoteMark': {
          if (!active) {
            // Hide the `>` and trailing space
            let end = node.to
            if (end < doc.length && doc.sliceString(end, end + 1) === ' ') {
              end += 1
            }
            decorations.push(hideMark.range(node.from, end))
          }
          break
        }

        // ── Bullet list marks ───────────────────────────────────────
        case 'ListMark': {
          if (!active) {
            const markText = doc.sliceString(node.from, node.to).trim()
            // Only replace unordered list marks (-, *, +)
            if (markText === '-' || markText === '*' || markText === '+') {
              decorations.push(
                Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to)
              )
            }
          }
          break
        }

        // ── Task checkboxes ─────────────────────────────────────────
        case 'TaskMarker': {
          if (!active) {
            const text = doc.sliceString(node.from, node.to)
            const checked = text.includes('x') || text.includes('X')
            decorations.push(
              Decoration.replace({ widget: new CheckboxWidget(checked) }).range(
                node.from,
                node.to
              )
            )
          }
          break
        }

        // ── Links — hide [, ](url) but keep text ───────────────────
        case 'Link': {
          // We handle link sub-nodes; skip the container
          break
        }

        case 'LinkMark': {
          // Hide [ ] ( ) markers
          if (!active) {
            decorations.push(hideMark.range(node.from, node.to))
          }
          break
        }

        case 'URL': {
          // Inside a link: hide the URL (and surrounding parens handled by LinkMark)
          if (!active) {
            decorations.push(hideMark.range(node.from, node.to))
          }
          break
        }

        default:
          break
      }
    }
  })

  // Decoration.set requires sorted ranges
  return Decoration.set(decorations, true)
}

// ─── ViewPlugin ───────────────────────────────────────────────────────────────

/**
 * The live-preview ViewPlugin. Rebuilds decorations on doc change,
 * viewport scroll, and cursor movement so syntax toggles on/off
 * as the user navigates.
 */
const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

// ─── Theme ────────────────────────────────────────────────────────────────────

/**
 * Editor theme additions for live-preview mode. Uses proportional
 * font for body text and monospace only for inline code.
 */
const livePreviewTheme = EditorView.theme({
  '&': {
    height: '100%'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '.cm-scroller': {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '16px',
    lineHeight: '1.75',
    overflow: 'auto'
  },
  '.cm-content': {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 16px',
    caretColor: 'var(--foreground, #e4e4e7)'
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--foreground, #e4e4e7)'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-gutters': {
    display: 'none'
  },

  // ── Headings ──
  '.cm-live-h1': {
    fontSize: '2em',
    fontWeight: '700',
    lineHeight: '1.3',
    padding: '0.4em 0 0.15em'
  },
  '.cm-live-h2': {
    fontSize: '1.5em',
    fontWeight: '700',
    lineHeight: '1.3',
    padding: '0.35em 0 0.1em',
    borderBottom: '1px solid var(--border, #27272a)'
  },
  '.cm-live-h3': {
    fontSize: '1.25em',
    fontWeight: '600',
    lineHeight: '1.35',
    padding: '0.25em 0 0.05em'
  },
  '.cm-live-h4': {
    fontSize: '1.1em',
    fontWeight: '600',
    lineHeight: '1.4'
  },
  '.cm-live-h5': {
    fontSize: '1.05em',
    fontWeight: '600'
  },
  '.cm-live-h6': {
    fontSize: '1em',
    fontWeight: '600',
    color: 'var(--muted-foreground, #71717a)'
  },

  // ── Inline styles ──
  '.cm-live-bold': {
    fontWeight: '700'
  },
  '.cm-live-italic': {
    fontStyle: 'italic'
  },
  '.cm-live-strike': {
    textDecoration: 'line-through',
    opacity: '0.6'
  },
  '.cm-live-code': {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '0.9em',
    backgroundColor: 'var(--accent, rgba(255,255,255,0.06))',
    borderRadius: '3px',
    padding: '1px 4px'
  },

  // ── Blockquote ──
  '.cm-live-blockquote': {
    borderLeft: '3px solid var(--border, #3f3f46)',
    paddingLeft: '1em',
    color: 'var(--muted-foreground, #a1a1aa)'
  },

  // ── HR ──
  '.cm-hr-widget': {
    border: 'none',
    borderTop: '1px solid var(--border, #3f3f46)',
    margin: '1.5em 0'
  },

  // ── Bullets ──
  '.cm-bullet-widget': {
    color: 'var(--primary, #3b82f6)',
    fontWeight: '700',
    marginRight: '2px'
  },

  // ── Checkboxes ──
  '.cm-task-checkbox': {
    appearance: 'none',
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    border: '2px solid var(--muted-foreground, #71717a)',
    verticalAlign: 'middle',
    marginRight: '4px',
    position: 'relative',
    cursor: 'default'
  },
  '.cm-task-checkbox:checked': {
    backgroundColor: 'var(--primary, #3b82f6)',
    borderColor: 'var(--primary, #3b82f6)'
  },
  '.cm-task-checkbox:checked::after': {
    content: '""',
    position: 'absolute',
    left: '3px',
    top: '0px',
    width: '5px',
    height: '9px',
    border: 'solid white',
    borderWidth: '0 2px 2px 0',
    transform: 'rotate(45deg)'
  }
})

// ─── Public extension ─────────────────────────────────────────────────────────

/**
 * Complete live-preview extension bundle. Add this to a CodeMirror
 * EditorState to get Obsidian-style inline markdown rendering.
 */
export const livePreview = [livePreviewPlugin, livePreviewTheme]
