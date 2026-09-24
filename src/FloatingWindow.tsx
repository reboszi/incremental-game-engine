import { PointerEvent as ReactPointerEvent, type ReactNode, useRef } from 'react'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
export type WindowState = Point & Size & { collapsed: boolean }
export type WindowId = 'menu' | 'toolbox' | 'project' | 'inspector' | 'settings' | 'projects'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function FloatingWindow({
  id,
  title,
  state,
  minWidth,
  minHeight,
  zIndex,
  onFocus,
  onChange,
  children,
}: {
  id: WindowId
  title: string
  state: WindowState
  minWidth: number
  minHeight: number
  zIndex: number
  onFocus: (id: WindowId) => void
  onChange: (id: WindowId, next: WindowState) => void
  children: ReactNode
}) {
  const dragStart = useRef<{ pointer: Point; window: Point } | null>(null)
  const resizeStart = useRef<{ pointer: Point; size: Size } | null>(null)

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    onFocus(id)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = {
      pointer: { x: event.clientX, y: event.clientY },
      window: { x: state.x, y: state.y },
    }
  }

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const maxX = Math.max(0, window.innerWidth - state.width)
    const maxY = Math.max(0, window.innerHeight - 42)
    const x = clamp(dragStart.current.window.x + event.clientX - dragStart.current.pointer.x, 0, maxX)
    const y = clamp(dragStart.current.window.y + event.clientY - dragStart.current.pointer.y, 0, maxY)
    onChange(id, { ...state, x, y })
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current) event.currentTarget.releasePointerCapture(event.pointerId)
    dragStart.current = null
  }

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onFocus(id)
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeStart.current = {
      pointer: { x: event.clientX, y: event.clientY },
      size: { width: state.width, height: state.height },
    }
  }

  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return
    const maxWidth = Math.max(minWidth, window.innerWidth - state.x)
    const maxHeight = Math.max(minHeight, window.innerHeight - state.y)
    const width = clamp(resizeStart.current.size.width + event.clientX - resizeStart.current.pointer.x, minWidth, maxWidth)
    const height = clamp(resizeStart.current.size.height + event.clientY - resizeStart.current.pointer.y, minHeight, maxHeight)
    onChange(id, { ...state, width, height })
  }

  const endResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeStart.current) event.currentTarget.releasePointerCapture(event.pointerId)
    resizeStart.current = null
  }

  return (
    <section
      className={`floating-window ${state.collapsed ? 'collapsed' : ''}`}
      style={{ left: state.x, top: state.y, width: state.width, height: state.collapsed ? 38 : state.height, zIndex }}
      onPointerDown={() => onFocus(id)}
    >
      <div className="window-titlebar" onPointerDown={beginDrag} onPointerMove={drag} onPointerUp={endDrag}>
        <span>{title}</span>
        <button
          className="window-control"
          type="button"
          aria-label={state.collapsed ? `Expand ${title}` : `Collapse ${title}`}
          onClick={() => onChange(id, { ...state, collapsed: !state.collapsed })}
        >
          {state.collapsed ? '▢' : '—'}
        </button>
      </div>

      {!state.collapsed && <div className="window-body">{children}</div>}

      {!state.collapsed && (
        <div
          className="resize-handle"
          onPointerDown={beginResize}
          onPointerMove={resize}
          onPointerUp={endResize}
          aria-hidden="true"
        />
      )}
    </section>
  )
}

