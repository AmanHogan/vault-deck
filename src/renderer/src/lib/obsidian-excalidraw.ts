/**
 * Parser for Obsidian Excalidraw plugin files. These are `.md` files that
 * contain compressed Excalidraw JSON inside a `compressed-json` code fence,
 * wrapped in a `%% Drawing` comment block, with YAML frontmatter containing
 * `excalidraw-plugin: parsed`.
 *
 * The compression uses LZ-string's `compressToBase64` / `decompressFromBase64`.
 */

import { decompressFromBase64 } from 'lz-string'

/**
 * Check whether a file path looks like an Obsidian Excalidraw file
 * based on its name (e.g. `drawing.excalidraw.md`).
 * @param filePath The vault-relative file path.
 * @returns True if the filename matches the `.excalidraw.md` pattern.
 */
export function isExcalidrawFilename(filePath: string): boolean {
  return /\.excalidraw\.md$/i.test(filePath)
}

/**
 * Check whether a markdown string is an Obsidian Excalidraw file.
 * Uses multiple detection strategies:
 * 1. `excalidraw-plugin` key in YAML frontmatter (any value)
 * 2. Presence of a `compressed-json` code fence
 * 3. Presence of the `%% Drawing` comment block
 * @param content The raw markdown text.
 * @returns True if this is an Obsidian Excalidraw `.md` file.
 */
export function isObsidianExcalidraw(content: string): boolean {
  // Quick bail-out: must mention excalidraw somewhere
  if (!content.includes('excalidraw')) {
    console.log('[excalidraw] isObsidianExcalidraw: no "excalidraw" substring found')
    return false
  }

  // Strategy 1: check YAML frontmatter for excalidraw-plugin key (any value)
  // Handle both \n and \r\n line endings
  const fmMatch = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---/)
  if (fmMatch && /excalidraw-plugin\s*:/.test(fmMatch[1])) {
    console.log('[excalidraw] isObsidianExcalidraw: detected via frontmatter')
    return true
  }

  // Strategy 2: presence of the compressed-json code fence
  if (/```compressed-json/i.test(content)) {
    console.log('[excalidraw] isObsidianExcalidraw: detected via compressed-json fence')
    return true
  }

  // Strategy 3: the %% Drawing comment block that wraps the data
  if (/^%%\s*\r?\n/.test(content) || /\n%%\s*\r?\n/.test(content)) {
    if (content.includes('Drawing')) {
      console.log('[excalidraw] isObsidianExcalidraw: detected via %% Drawing block')
      return true
    }
  }

  console.log('[excalidraw] isObsidianExcalidraw: no match (has "excalidraw" but no pattern matched)')
  return false
}

/**
 * Extract and decompress the Excalidraw JSON data from an Obsidian
 * Excalidraw `.md` file.
 * @param content The raw markdown text.
 * @returns The parsed Excalidraw scene data, or null if extraction fails.
 */
export function parseObsidianExcalidraw(content: string): Record<string, unknown> | null {
  // Normalise line endings so all regexes can use \n
  const text = content.replace(/\r\n/g, '\n')

  // Try compressed-json code block first (most common modern format)
  const compressedMatch = text.match(/```compressed-json\s*\n([\s\S]*?)\n\s*```/)
  if (compressedMatch) {
    // Strip ALL whitespace — the base64 payload may wrap across multiple
    // lines and lz-string's decompressFromBase64 cannot handle embedded
    // newlines or spaces.
    const compressed = compressedMatch[1].replace(/\s/g, '')
    console.log('[excalidraw] compressed-json block found, length:', compressed.length)
    try {
      const decompressed = decompressFromBase64(compressed)
      if (decompressed) {
        console.log('[excalidraw] decompressed OK, length:', decompressed.length)
        return JSON.parse(decompressed) as Record<string, unknown>
      }
      console.warn('[excalidraw] decompressFromBase64 returned null')
    } catch (err) {
      console.error('[excalidraw] Failed to decompress/parse:', err)
    }
  } else {
    console.log('[excalidraw] no compressed-json block found')
  }

  // Try raw JSON code block (older format without compression)
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>
      // Sanity check: an Excalidraw scene has a "type" field
      if (parsed.type === 'excalidraw' || parsed.elements) return parsed
    } catch {
      // Not valid JSON — fall through
    }
  }

  // Try extracting JSON directly from the %% Drawing block
  const drawingMatch = text.match(/%%\s*\n([\s\S]*?)\n\s*%%/)
  if (drawingMatch) {
    const inner = drawingMatch[1].trim()
    // Might contain a code fence inside, or might be bare JSON/compressed data
    const innerCompressed = inner.match(/```compressed-json\s*\n([\s\S]*?)\n\s*```/)
    if (innerCompressed) {
      try {
        const decompressed = decompressFromBase64(innerCompressed[1].replace(/\s/g, ''))
        if (decompressed) {
          return JSON.parse(decompressed) as Record<string, unknown>
        }
      } catch {
        // fall through
      }
    }
  }

  console.warn('Obsidian Excalidraw file detected but could not parse drawing data')
  return null
}

/**
 * Extract the text elements section from an Obsidian Excalidraw file.
 * These are listed between `## Text Elements` and the `%%` Drawing block.
 * @param content The raw markdown text.
 * @returns Array of text element strings, or empty array.
 */
export function extractTextElements(content: string): string[] {
  const text = content.replace(/\r\n/g, '\n')
  const match = text.match(/## Text Elements\s*\n([\s\S]*?)\n%%/)
  if (!match) return []

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('^'))
}
