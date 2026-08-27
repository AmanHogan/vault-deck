import { useCallback, useRef, useState } from 'react'

interface UseResizableWidthResult {
  width: number
  onPointerDown: (event: React.PointerEvent) => void
}

/**
 * Drag-to-resize width state for a side panel. The handle should sit on
 * `edge` of the panel; dragging it grows the panel toward the opposite edge.
 * @param initial Starting width in pixels.
 * @param min Minimum allowed width.
 * @param max Maximum allowed width.
 * @param edge Which edge of the panel the drag handle is on.
 * @returns The current width and a pointer-down handler for the drag handle.
 */
export function useResizableWidth(
  initial: number,
  min: number,
  max: number,
  edge: 'left' | 'right',
): UseResizableWidthResult {
  const [width, setWidth] = useState(initial)
  const startRef = useRef<{ x: number; width: number } | null>(null)

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      startRef.current = { x: event.clientX, width }
      const onMove = (e: PointerEvent): void => {
        if (!startRef.current) return
        const delta = e.clientX - startRef.current.x
        const next = edge === 'right' ? startRef.current.width + delta : startRef.current.width - delta
        setWidth(Math.min(max, Math.max(min, next)))
      }
      const onUp = (): void => {
        startRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [width, max, min, edge],
  )

  return { width, onPointerDown }
}
