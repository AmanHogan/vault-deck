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
 * Check whether a markdown string is an Obsidian Excalidraw file by
 * looking for the `excalidraw-plugin` frontmatter key.
 * @param content The raw markdown text.
 * @returns True if this is an Obsidian Excalidraw `.md` file.
 */
export function isObsidianExcalidraw(content: string): boolean {
  // Quick check before doing any parsing
  if (!content.includes('excalidraw-plugin')) return false

  // Check YAML frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) return false

  return /excalidraw-plugin:\s*(parsed|raw)/.test(fmMatch[1])
}

/**
 * Extract and decompress the Excalidraw JSON data from an Obsidian
 * Excalidraw `.md` file.
 * @param content The raw markdown text.
 * @returns The parsed Excalidraw scene data, or null if extraction fails.
 */
export function parseObsidianExcalidraw(content: string): Record<string, unknown> | null {
  // Extract the compressed-json code block
  const compressedMatch = content.match(/```compressed-json\s*\n([\s\S]*?)\n```/)
  if (!compressedMatch) {
    // Try raw JSON (older format without compression)
    const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }

  // Decompress the LZ-string base64 data
  const compressed = compressedMatch[1].trim()
  try {
    const decompressed = decompressFromBase64(compressed)
    if (!decompressed) return null
    return JSON.parse(decompressed) as Record<string, unknown>
  } catch (err) {
    console.error('Failed to decompress Obsidian Excalidraw data:', err)
    return null
  }
}

/**
 * Extract the text elements section from an Obsidian Excalidraw file.
 * These are listed between `## Text Elements` and the `%%` Drawing block.
 * @param content The raw markdown text.
 * @returns Array of text element strings, or empty array.
 */
export function extractTextElements(content: string): string[] {
  const match = content.match(/## Text Elements\s*\n([\s\S]*?)\n%%/)
  if (!match) return []

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('^'))
}
