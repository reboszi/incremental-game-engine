import { PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type WindowState = Point & Size & { collapsed: boolean }
type WindowId = 'toolbox' | 'project' | 'inspector'

type Panel = Point & {
  id: string
  title: string
}

type WindowConfig = {
  id: WindowId
  title: string
  initial: WindowState
  minWidth: number
  minHeight: number
  children: ReactNode
}

const STORAGE_KEY = 'ige-editor-windows-v1'

const DEFAULT_WINDOWS: Record<WindowId, WindowState> = {
  toolbox: { x: 24, y: 72, width: 230, height: 360, collapsed: false },
  project: { x: 24, y: 450, width: 280, height: 300, collapsed: false },
  inspector: { x: 0, y: 72, width: 320, height: 520, collapsed: false },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function loadWindowState(): Record<WindowId, WindowState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_WINDOWS
    return { ...DEFAULT_WINDOWS, ...JSON.parse(saved) }
  } catch {
    return DEFAULT_WINDOWS
  }
}

function FloatingWindow({
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
    const maxY = Math.max(48, window.innerHeight - 42)
    const x = clamp(dragStart.current.window.x + event.clientX - dragStart.current.pointer.x, 0, maxX)
    const y = clamp(dragStart.current.window.y + event.clientY - dragStart.current.pointer.y, 48, maxY)
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

function Toolbox({ onCreatePanel }: { onCreatePanel: () => void }) {
  const tools = ['Panel', 'Resource', 'Action / Task', 'State / Unlock', 'Story Event', 'Directive']
  return (
    <div className="tool-list">
      {tools.map((tool) => (
        <button type="button" className="tool-button" key={tool} onClick={tool === 'Panel' ? onCreatePanel : undefined}>
          <span className="tool-plus">+</span>
          <span>{tool}</span>
        </button>
      ))}
    </div>
  )
}

function ProjectPanel({ panels }: { panels: Panel[] }) {
  return (
    <div className="project-tree">
      <div className="tree-row tree-root">▾ Test Game</div>
      <div className="tree-row tree-child muted">Panels</div>

      {panels.map((panel) => (
        <div className="tree-row tree-grandchild" key={panel.id}>
          {panel.title}
        </div>
      ))}

      <div className="tree-row tree-child muted">Resources</div>
      <div className="tree-row tree-child muted">Actions</div>
      <div className="tree-row tree-child muted">Story</div>
      <div className="tree-row tree-child muted">Directives</div>
    </div>
  )
}

function Inspector({
  panel,
  onUpdatePanel,
}: {
  panel: Panel | null
  onUpdatePanel: (id: string, changes: Partial<Panel>) => void
}) {
  if (!panel) {
    return (
      <div className="inspector-empty">
        <div className="inspector-icon">◇</div>
        <strong>Nothing selected</strong>
        <span>Select an element on the canvas to edit its properties.</span>
      </div>
    )
  }

  return (
    <div>
      <input
        value={panel.title}
        onChange={(event) =>
          onUpdatePanel(panel.id, { title: event.target.value })
        }
      />
      <div>ID: {panel.id}</div>
      <div>X: {panel.x}</div>
      <div>Y: {panel.y}</div>
    </div>
  )
}

function App() {
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(() => {
    const loaded = loadWindowState()
    return {
      ...loaded,
      inspector: {
        ...loaded.inspector,
        x: loaded.inspector.x || Math.max(24, window.innerWidth - loaded.inspector.width - 24),
      },
    }
  })
  const [stack, setStack] = useState<WindowId[]>(['toolbox', 'project', 'inspector'])
  const [panels, setPanels] = useState<Panel[]>([])
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows))
  }, [windows])

  useEffect(() => {
    const keepOnScreen = () => {
      setWindows((current) => {
        const next = { ...current }
        ;(Object.keys(next) as WindowId[]).forEach((id) => {
          const win = next[id]
          next[id] = {
            ...win,
            x: clamp(win.x, 0, Math.max(0, window.innerWidth - win.width)),
            y: clamp(win.y, 48, Math.max(48, window.innerHeight - 42)),
          }
        })
        return next
      })
    }
    window.addEventListener('resize', keepOnScreen)
    return () => window.removeEventListener('resize', keepOnScreen)
  }, [])

  const createPanel = useCallback(() => {
    const newPanel: Panel = {
      id: crypto.randomUUID(),
      title: 'New Panel',
      x: 400,
      y: 200,
    }

    setPanels((current) => [...current, newPanel])
  }, [])

  const updatePanel = useCallback((id: string, changes: Partial<Panel>) => {
    setPanels((current) =>
      current.map((panel) =>
        panel.id === id
          ? { ...panel, ...changes }
          : panel
      )
    )
  }, [])

  const selectedPanel =
    panels.find((panel) => panel.id === selectedPanelId) ?? null

  const windowConfigs = useMemo<WindowConfig[]>(
    () => [
      {
        id: 'toolbox',
        title: 'TOOLBOX',
        initial: DEFAULT_WINDOWS.toolbox,
        minWidth: 190,
        minHeight: 210,
        children: <Toolbox onCreatePanel={createPanel} />,
      },
      {
        id: 'project',
        title: 'PROJECT',
        initial: DEFAULT_WINDOWS.project,
        minWidth: 220,
        minHeight: 180,
        children: <ProjectPanel panels={panels} />,
      },
      {
        id: 'inspector',
        title: 'PROPERTIES',
        initial: DEFAULT_WINDOWS.inspector,
        minWidth: 270,
        minHeight: 240,
        children: (
          <Inspector
            panel={selectedPanel}
            onUpdatePanel={updatePanel}
          />
        ),
      },
    ],
    [createPanel, panels, selectedPanel, updatePanel],
  )

  const focusWindow = (id: WindowId) => {
    setStack((current) => [...current.filter((item) => item !== id), id])
  }

  const updateWindow = (id: WindowId, next: WindowState) => {
    setWindows((current) => ({ ...current, [id]: next }))
  }

  const resetLayout = () => {
    setWindows({
      ...DEFAULT_WINDOWS,
      inspector: {
        ...DEFAULT_WINDOWS.inspector,
        x: Math.max(24, window.innerWidth - DEFAULT_WINDOWS.inspector.width - 24),
      },
    })
    setStack(['toolbox', 'project', 'inspector'])
  }

  return (
    <main className="editor-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">IGE</span>
          <span>Incremental Game Engine</span>
          <span className="version">v0.1</span>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={resetLayout}>Reset layout</button>
          <button type="button" className="play-button">▶ Preview</button>
        </div>
      </header>

      <section className="canvas" aria-label="Game flow canvas" onClick={() => setSelectedPanelId(null)}>
        <div className="canvas-center-message">
          <div className="canvas-title">GAME FLOW</div>
          <div>Use the floating editor windows to build your game.</div>
        </div>

        {panels.map((panel) => (
          <div
            key={panel.id}
            className={`game-panel ${selectedPanelId === panel.id ? 'selected' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              setSelectedPanelId(panel.id)
            }}
            style={{
              left: panel.x,
              top: panel.y,
            }}
          >
            {panel.title}
          </div>
        ))}
      </section>

      {windowConfigs.map((config) => (
        <FloatingWindow
          key={config.id}
          id={config.id}
          title={config.title}
          state={windows[config.id]}
          minWidth={config.minWidth}
          minHeight={config.minHeight}
          zIndex={20 + stack.indexOf(config.id)}
          onFocus={focusWindow}
          onChange={updateWindow}
        >
          {config.children}
        </FloatingWindow>
      ))}
    </main>
  )
}

export default App
