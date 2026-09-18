import { PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameSettings, Panel, PanelSlot } from './types'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type WindowState = Point & Size & { collapsed: boolean }
type WindowId = 'menu' | 'toolbox' | 'project' | 'inspector' | 'settings'

const PANEL_SLOTS = [
  {
    value: 'top',
    label: 'Top',
    rowStart: 1,
    rowSpan: 1,
    columnStart: 1,
    columnSpan: 5,
  },
  {
    value: 'top-inner',
    label: 'Top Inner',
    rowStart: 2,
    rowSpan: 1,
    columnStart: 2,
    columnSpan: 3,
  },
  {
    value: 'left-outer',
    label: 'Left Outer',
    rowStart: 2,
    rowSpan: 4,
    columnStart: 1,
    columnSpan: 1,
  },
  {
    value: 'left-inner',
    label: 'Left Inner',
    rowStart: 3,
    rowSpan: 1,
    columnStart: 2,
    columnSpan: 1,
  },
  {
    value: 'center',
    label: 'Center',
    rowStart: 3,
    rowSpan: 1,
    columnStart: 3,
    columnSpan: 1,
  },
  {
    value: 'right-inner',
    label: 'Right Inner',
    rowStart: 3,
    rowSpan: 1,
    columnStart: 4,
    columnSpan: 1,
  },
  {
    value: 'right-outer',
    label: 'Right Outer',
    rowStart: 2,
    rowSpan: 4,
    columnStart: 5,
    columnSpan: 1,
  },
  {
    value: 'bottom-inner',
    label: 'Bottom Inner',
    rowStart: 4,
    rowSpan: 1,
    columnStart: 2,
    columnSpan: 3,
  },
  {
    value: 'bottom',
    label: 'Bottom',
    rowStart: 5,
    rowSpan: 1,
    columnStart: 2,
    columnSpan: 3,
  },
] as const

type WindowConfig = {
  id: WindowId
  title: string
  minWidth: number
  minHeight: number
  children: ReactNode
}

const DEFAULT_GAME_SETTINGS: GameSettings = {
  defaultPanelBackgroundColor: '#101a12',
  defaultPanelTextColor: '#d9e4d9',
  defaultPanelBorderColor: '#5f7f68',
}

const STORAGE_KEY = 'ige-editor-windows-v1'

const DEFAULT_WINDOWS: Record<WindowId, WindowState> = {
  menu: { x: 20, y: 20, width: 260, height: 180, collapsed: false },
  toolbox: { x: 20, y: 220, width: 230, height: 360, collapsed: false },
  project: { x: 20, y: 580, width: 280, height: 300, collapsed: false },
  inspector: { x: 0, y: 20, width: 320, height: 520, collapsed: false },
  settings: { x: 320, y: 80, width: 320, height: 300, collapsed: false },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

function isValidHexColor(value: string) {
  return HEX_COLOR_REGEX.test(value)
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  const updateText = (next: string) => {
    setText(next)

    if (isValidHexColor(next)) {
      onChange(next)
    }
  }

  return (
    <div className="inspector-field">
      <label>{label}</label>

      <div className="color-input-row">
        <input
          type="color"
          value={value}
          onChange={(event) => {
            setText(event.target.value)
            onChange(event.target.value)
          }}
        />

        <input
          type="text"
          value={text}
          className={isValidHexColor(text) ? '' : 'invalid'}
          onChange={(event) => updateText(event.target.value)}
        />
      </div>
    </div>
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

function GameSettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: GameSettings
  onChange: (changes: Partial<GameSettings>) => void
  onClose: () => void
}) {
  return (
    <div>
      <ColorField
        label="Default panel background"
        value={settings.defaultPanelBackgroundColor}
        onChange={(value) =>
          onChange({
            defaultPanelBackgroundColor: value,
          })
        }
      />

      <ColorField
        label="Default text color"
        value={settings.defaultPanelTextColor}
        onChange={(value) =>
          onChange({
            defaultPanelTextColor: value,
          })
        }
      />

      <ColorField
        label="Default border color"
        value={settings.defaultPanelBorderColor}
        onChange={(value) =>
          onChange({
            defaultPanelBorderColor: value,
          })
        }
      />

      <button
        type="button"
        className="tool-button"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  )
}

function Menu({
  onResetLayout,
  previewOpen,
  onTogglePreview,
  onOpenSettings,
}: {
  onResetLayout: () => void
  previewOpen: boolean
  onTogglePreview: () => void
  onOpenSettings: () => void
}) {
  return (
    <div className="tool-list">
      <button type="button" className="tool-button" onClick={onResetLayout}>
        Reset layout
      </button>

      <button type="button" className="tool-button" onClick={onTogglePreview}>
        {previewOpen ? 'Back to editor' : 'Preview'}
      </button>

      <button type="button" className="tool-button" onClick={onOpenSettings}>
        Settings
      </button>
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
      <div className="inspector-field">
        <label>Title </label>
        <input
          value={panel.title}
          onChange={(event) =>
            onUpdatePanel(panel.id, {
              title: event.target.value,
            })
          }
        />
      </div>

      <div className="inspector-field">
        <label>Slot </label>
        <select
          value={panel.slot}
          onChange={(event) =>
            onUpdatePanel(panel.id, {
              slot: event.target.value as PanelSlot,
            })
          }
        >
          {PANEL_SLOTS.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
      </div>

      <ColorField
        label="Background"
        value={panel.backgroundColor}
        onChange={(value) =>
          onUpdatePanel(panel.id, {
            backgroundColor: value,
          })
        }
      />

      <ColorField
        label="Text"
        value={panel.textColor}
        onChange={(value) =>
          onUpdatePanel(panel.id, {
            textColor: value,
          })
        }
      />

      <ColorField
        label="Border"
        value={panel.borderColor}
        onChange={(value) =>
          onUpdatePanel(panel.id, {
            borderColor: value,
          })
        }
      />
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
  const [stack, setStack] = useState<WindowId[]>(['menu', 'toolbox', 'project', 'inspector'])
  const [gameSettings, setGameSettings] = useState<GameSettings>(
    DEFAULT_GAME_SETTINGS
  )
  const [panels, setPanels] = useState<Panel[]>([])
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows))
  }, [windows])

  useEffect(() => {
    const keepOnScreen = () => {
      setWindows((current) => {
        const next = { ...current }
          ; (Object.keys(next) as WindowId[]).forEach((id) => {
            const win = next[id]
            next[id] = {
              ...win,
              x: clamp(win.x, 0, Math.max(0, window.innerWidth - win.width)),
              y: clamp(win.y, 0, Math.max(0, window.innerHeight - 42)),
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
      slot: 'center',
      backgroundColor: gameSettings.defaultPanelBackgroundColor,
      textColor: gameSettings.defaultPanelTextColor,
      borderColor: gameSettings.defaultPanelBorderColor,
    }

    setPanels((current) => [...current, newPanel])
  }, [gameSettings])

  const updatePanel = useCallback((id: string, changes: Partial<Panel>) => {
    setPanels((current) =>
      current.map((panel) =>
        panel.id === id
          ? { ...panel, ...changes }
          : panel
      )
    )
  }, [])

  const updateGameSettings = useCallback(
    (changes: Partial<GameSettings>) => {
      setGameSettings((current) => ({
        ...current,
        ...changes,
      }))
    },
    []
  )

  const selectedPanel =
    panels.find((panel) => panel.id === selectedPanelId) ?? null

  const resetLayout = useCallback(() => {
    setWindows({
      ...DEFAULT_WINDOWS,
      inspector: {
        ...DEFAULT_WINDOWS.inspector,
        x: Math.max(
          24,
          window.innerWidth - DEFAULT_WINDOWS.inspector.width - 24,
        ),
      },
    })

    setStack(['menu', 'toolbox', 'project', 'inspector'])
  }, [])

  const windowConfigs = useMemo<WindowConfig[]>(
    () => [
      {
        id: 'menu',
        title: 'Incremental Game Engine',
        minWidth: 220,
        minHeight: 120,
        children: (
          <Menu
            onResetLayout={resetLayout}
            previewOpen={previewOpen}
            onTogglePreview={() => setPreviewOpen((current) => !current)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ),
      },
      {
        id: 'toolbox',
        title: 'TOOLBOX',
        minWidth: 190,
        minHeight: 210,
        children: <Toolbox onCreatePanel={createPanel} />,
      },
      {
        id: 'project',
        title: 'PROJECT',
        minWidth: 220,
        minHeight: 180,
        children: <ProjectPanel panels={panels} />,
      },
      {
        id: 'settings',
        title: 'GAME SETTINGS',
        minWidth: 270,
        minHeight: 220,
        children: (
          <GameSettingsPanel
            settings={gameSettings}
            onChange={updateGameSettings}
            onClose={() => setSettingsOpen(false)}
          />
        ),
      },
      {
        id: 'inspector',
        title: 'PROPERTIES',
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
    [
      createPanel,
      panels,
      selectedPanel,
      updatePanel,
      resetLayout,
      previewOpen,
      gameSettings,
      updateGameSettings,
      settingsOpen
    ]
  )

  const focusWindow = (id: WindowId) => {
    setStack((current) => [...current.filter((item) => item !== id), id])
  }

  const updateWindow = (id: WindowId, next: WindowState) => {
    setWindows((current) => ({ ...current, [id]: next }))
  }

  return (
    <main className="editor-shell">

      <section className="canvas" aria-label="Game flow canvas" onClick={() => setSelectedPanelId(null)}>

        {panels.map((panel) => {
          const slot = PANEL_SLOTS.find((item) => item.value === panel.slot)

          if (!slot) return null

          return (
            <div
              key={panel.id}
              className={`game-panel ${selectedPanelId === panel.id ? 'selected' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                setSelectedPanelId(panel.id)
              }}
              style={{
                gridRow: `${slot.rowStart} / span ${slot.rowSpan}`,
                gridColumn: `${slot.columnStart} / span ${slot.columnSpan}`,
                backgroundColor: panel.backgroundColor,
                color: panel.textColor,
                borderColor: panel.borderColor,
              }}
            >
              {panel.title}
            </div>
          )
        })}
      </section>

      {windowConfigs
        .filter((config) => {
          if (previewOpen) {
            return config.id === 'menu'
          }

          if (config.id === 'settings') {
            return settingsOpen
          }

          return true
        })
        .map((config) => (
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
