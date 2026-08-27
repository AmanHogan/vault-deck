/**
 * Types for the JSON Canvas (`.canvas`) file format.
 * Spec: https://jsoncanvas.org/
 */

// ─── Node types ─────────────────────────────────────────────────────────────

export interface CanvasNodeBase {
  id: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export interface CanvasTextNode extends CanvasNodeBase {
  type: 'text'
  text: string
}

export interface CanvasFileNode extends CanvasNodeBase {
  type: 'file'
  file: string
  subpath?: string
}

export interface CanvasLinkNode extends CanvasNodeBase {
  type: 'link'
  url: string
}

export interface CanvasGroupNode extends CanvasNodeBase {
  type: 'group'
  label?: string
  background?: string
  backgroundStyle?: 'cover' | 'ratio' | 'repeat'
}

export type CanvasNode = CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode

// ─── Edge types ─────────────────────────────────────────────────────────────

export type EdgeSide = 'top' | 'right' | 'bottom' | 'left'
export type EdgeEnd = 'none' | 'arrow'

export interface CanvasEdge {
  id: string
  fromNode: string
  fromSide?: EdgeSide
  fromEnd?: EdgeEnd
  toNode: string
  toSide?: EdgeSide
  toEnd?: EdgeEnd
  color?: string
  label?: string
}

// ─── Document ───────────────────────────────────────────────────────────────

export interface CanvasDocument {
  nodes?: CanvasNode[]
  edges?: CanvasEdge[]
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_TEXT_NODE: Omit<CanvasTextNode, 'id' | 'x' | 'y'> = {
  type: 'text',
  width: 260,
  height: 120,
  text: '',
}

export const DEFAULT_FILE_NODE: Omit<CanvasFileNode, 'id' | 'x' | 'y' | 'file'> = {
  type: 'file',
  width: 300,
  height: 200,
}

export const DEFAULT_LINK_NODE: Omit<CanvasLinkNode, 'id' | 'x' | 'y' | 'url'> = {
  type: 'link',
  width: 300,
  height: 160,
}

export const DEFAULT_GROUP_NODE: Omit<CanvasGroupNode, 'id' | 'x' | 'y'> = {
  type: 'group',
  width: 400,
  height: 300,
  label: '',
}

// ─── Colors (Obsidian canvas palette) ───────────────────────────────────────

export const CANVAS_COLORS: Record<string, string> = {
  '1': '#fb464c', // red
  '2': '#e9973f', // orange
  '3': '#e0de71', // yellow
  '4': '#44cf6e', // green
  '5': '#53dfdd', // cyan
  '6': '#a882ff', // purple
}
