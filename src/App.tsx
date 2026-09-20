import { PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameProject, GameSettings, Panel, PanelSlot, ProjectSummary, Resource } from './types'
import { CURRENT_PROJECT_VERSION, deleteGame, listProjects, loadGame, saveGame } from './save'
import { PANEL_SLOTS } from './layout'
import { GameCanvas } from './GameCanvas'
import { Player } from './Player'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type WindowState = Point & Size & { collapsed: boolean }
type WindowId = 'menu' | 'toolbox' | 'project' | 'inspector' | 'settings' | 'projects'

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
  menu: { x: 20, y: 20, width: 260, height: 330, collapsed: false },
  toolbox: { x: 20, y: 370, width: 230, height: 360, collapsed: false },
  project: { x: 20, y: 730, width: 280, height: 300, collapsed: false },
  inspector: { x: 0, y: 20, width: 320, height: 520, collapsed: false },
  settings: { x: 320, y: 80, width: 320, height: 340, collapsed: false },
  projects: { x: 360, y: 100, width: 420, height: 420, collapsed: false },
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

function Toolbox({
  onCreatePanel,
  onCreateResource,
}: {
  onCreatePanel: () => void
  onCreateResource: () => void
}) {
  const tools = ['Panel', 'Resource', 'Action / Task', 'State / Unlock', 'Story Event', 'Directive']

  const handleTool = (tool: string) => {
    if (tool === 'Panel') onCreatePanel()
    if (tool === 'Resource') onCreateResource()
  }

  return (
    <div className="tool-list">
      {tools.map((tool) => (
        <button type="button" className="tool-button" key={tool} onClick={() => handleTool(tool)}>
          <span className="tool-plus">+</span>
          <span>{tool}</span>
        </button>
      ))}
    </div>
  )
}

function ProjectPanel({
  projectName,
  panels,
  resources,
  onSelectPanel,
  onSelectResource,
}: {
  projectName: string
  panels: Panel[]
  resources: Resource[]
  onSelectPanel: (id: string) => void
  onSelectResource: (id: string) => void
}) {
  return (
    <div className="project-tree">
      <div className="tree-row tree-root">▾ {projectName}</div>
      <div className="tree-row tree-child muted">Panels</div>

      {panels.map((panel) => (
        <button
          type="button"
          className="tree-row tree-grandchild tree-button"
          key={panel.id}
          onClick={() => onSelectPanel(panel.id)}
        >
          {panel.title}
        </button>
      ))}

      <div className="tree-row tree-child muted">Resources</div>

      {resources.map((resource) => (
        <button
          type="button"
          className="tree-row tree-grandchild tree-button"
          key={resource.id}
          onClick={() => onSelectResource(resource.id)}
        >
          {resource.name}
        </button>
      ))}

      <div className="tree-row tree-child muted">Actions</div>
      <div className="tree-row tree-child muted">Story</div>
      <div className="tree-row tree-child muted">Directives</div>
    </div>
  )
}

function ProjectManager({
  projects,
  currentProjectId,
  onOpen,
  onDelete,
  onClose,
}: {
  projects: ProjectSummary[]
  currentProjectId: string
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="project-manager">
      {projects.length === 0 && (
        <div className="muted">No saved games yet.</div>
      )}

      {projects.map((project) => (
        <div className="saved-project" key={project.id}>
          <div className="saved-project-info">
            <strong>{project.name}</strong>
            <span>{project.id === currentProjectId ? 'Current game' : new Date(project.updatedAt).toLocaleString()}</span>
          </div>

          <div className="saved-project-actions">
            <button type="button" className="tool-button" onClick={() => onOpen(project.id)}>
              Open
            </button>
            <button type="button" className="tool-button" onClick={() => onDelete(project.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="tool-button" onClick={onClose}>
        Close
      </button>
    </div>
  )
}

function GameSettingsPanel({
  projectName,
  settings,
  onRename,
  onChange,
  onClose,
}: {
  projectName: string
  settings: GameSettings
  onRename: (name: string) => void
  onChange: (changes: Partial<GameSettings>) => void
  onClose: () => void
}) {
  return (
    <div>
      <div className="inspector-field">
        <label>Game name</label>
        <input value={projectName} onChange={(event) => onRename(event.target.value)} />
      </div>

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

      <button type="button" className="tool-button" onClick={onClose}>
        Close
      </button>
    </div>
  )
}

function Menu({
  onNewGame,
  onOpenProjects,
  onSave,
  onPlay,
  onResetLayout,
  previewOpen,
  onTogglePreview,
  onOpenSettings,
}: {
  onNewGame: () => void
  onOpenProjects: () => void
  onSave: () => void
  onPlay: () => void
  onResetLayout: () => void
  previewOpen: boolean
  onTogglePreview: () => void
  onOpenSettings: () => void
}) {
  return (
    <div className="tool-list">
      <button type="button" className="tool-button" onClick={onNewGame}>
        New Game
      </button>

      <button type="button" className="tool-button" onClick={onOpenProjects}>
        Open Game
      </button>

      <button type="button" className="tool-button" onClick={onSave}>
        Save
      </button>

      <button type="button" className="tool-button" onClick={onPlay}>
        Play
      </button>

      <button type="button" className="tool-button" onClick={onOpenSettings}>
        Settings
      </button>

      <button type="button" className="tool-button" onClick={onTogglePreview}>
        {previewOpen ? 'Back to editor' : 'Preview'}
      </button>

      <button type="button" className="tool-button" onClick={onResetLayout}>
        Reset layout
      </button>
    </div>
  )
}

function Inspector({
  panel,
  resource,
  onUpdatePanel,
  onUpdateResource,
}: {
  panel: Panel | null
  resource: Resource | null
  onUpdatePanel: (id: string, changes: Partial<Panel>) => void
  onUpdateResource: (id: string, changes: Partial<Resource>) => void
}) {
  if (!panel && !resource) {
    return (
      <div className="inspector-empty">
        <div className="inspector-icon">◇</div>
        <strong>Nothing selected</strong>
        <span>Select an element on the canvas to edit its properties.</span>
      </div>
    )
  }

  if (resource) {
    return (
      <div>
        <div className="inspector-field">
          <label>Name</label>
          <input
            value={resource.name}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                name: event.target.value,
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Initial value</label>
          <input
            type="number"
            value={resource.initialValue}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                initialValue: Number(event.target.value),
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Maximum value</label>
          <input
            type="number"
            placeholder="No maximum"
            value={resource.maxValue ?? ''}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                maxValue: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Unit</label>
          <input
            value={resource.unit}
            placeholder="%, MW, MB..."
            onChange={(event) =>
              onUpdateResource(resource.id, {
                unit: event.target.value,
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Display</label>
          <select
            value={resource.displayMode}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                displayMode: event.target.value as Resource['displayMode'],
              })
            }
          >
            <option value="value">Value</option>
            <option value="value-max">Value / Max</option>
            <option value="bar">Bar</option>
          </select>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={resource.initiallyVisible}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                initiallyVisible: event.target.checked,
              })
            }
          />
          Visible at game start
        </label>
      </div>
    )
  }

  return (
    <div>
      <div className="inspector-field">
        <label>Title</label>
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
        <label>Slot</label>
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

function Editor() {
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
  const [stack, setStack] = useState<WindowId[]>(['menu', 'toolbox', 'project', 'inspector', 'settings', 'projects'])
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => crypto.randomUUID())
  const [projectName, setProjectName] = useState('Test Game')
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)
  const [panels, setPanels] = useState<Panel[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [projects, setProjects] = useState<ProjectSummary[]>(() => listProjects())
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)

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
            y: clamp(win.y, 0, Math.max(0, window.innerHeight - 42)),
          }
        })
        return next
      })
    }
    window.addEventListener('resize', keepOnScreen)
    return () => window.removeEventListener('resize', keepOnScreen)
  }, [])

  const refreshProjects = useCallback(() => {
    setProjects(listProjects())
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

  const createResource = useCallback(() => {
    const newResource: Resource = {
      id: crypto.randomUUID(),
      name: 'New Resource',
      initialValue: 0,
      maxValue: null,
      unit: '',
      displayMode: 'value',
      initiallyVisible: true,
    }

    setResources((current) => [...current, newResource])
    setSelectedPanelId(null)
    setSelectedResourceId(newResource.id)
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

  const updateResource = useCallback((id: string, changes: Partial<Resource>) => {
    setResources((current) =>
      current.map((resource) =>
        resource.id === id
          ? { ...resource, ...changes }
          : resource
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

  const selectedResource =
    resources.find((resource) => resource.id === selectedResourceId) ?? null

  const buildProject = useCallback((): GameProject => ({
    id: currentProjectId,
    version: CURRENT_PROJECT_VERSION,
    name: projectName.trim() || 'Untitled Game',
    gameSettings,
    panels,
    resources,
  }), [currentProjectId, projectName, gameSettings, panels, resources])

  const saveProject = useCallback(() => {
    saveGame(buildProject())
    refreshProjects()
  }, [buildProject, refreshProjects])

  const newProject = useCallback(() => {
    const requestedName = window.prompt('Game name', 'New Game')
    if (requestedName === null) return

    const id = crypto.randomUUID()
    const name = requestedName.trim() || 'Untitled Game'
    const project: GameProject = {
      id,
      version: CURRENT_PROJECT_VERSION,
      name,
      gameSettings: { ...DEFAULT_GAME_SETTINGS },
      panels: [],
      resources: [],
    }

    saveGame(project)
    setCurrentProjectId(id)
    setProjectName(name)
    setGameSettings({ ...DEFAULT_GAME_SETTINGS })
    setPanels([])
    setResources([])
    setSelectedPanelId(null)
    setSelectedResourceId(null)
    setSettingsOpen(false)
    setProjectsOpen(false)
    refreshProjects()
  }, [refreshProjects])

  const openProject = useCallback((id: string) => {
    const project = loadGame(id)
    if (!project) return

    setCurrentProjectId(project.id)
    setProjectName(project.name)
    setGameSettings(project.gameSettings)
    setPanels(project.panels)
    setResources(project.resources)
    setSelectedPanelId(null)
    setSelectedResourceId(null)
    setProjectsOpen(false)
  }, [])

  const removeProject = useCallback((id: string) => {
    const project = projects.find((item) => item.id === id)
    if (!project) return

    if (!window.confirm(`Delete "${project.name}"?`)) return

    deleteGame(id)
    refreshProjects()

    if (id === currentProjectId) {
      const newId = crypto.randomUUID()
      setCurrentProjectId(newId)
      setProjectName('New Game')
      setGameSettings({ ...DEFAULT_GAME_SETTINGS })
      setPanels([])
      setResources([])
      setSelectedPanelId(null)
      setSelectedResourceId(null)
    }
  }, [projects, currentProjectId, refreshProjects])

  const playProject = useCallback(() => {
    saveGame(buildProject())
    refreshProjects()

    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('play', currentProjectId)
    url.hash = ''
    window.open(url.toString(), '_blank')
  }, [buildProject, currentProjectId, refreshProjects])

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

    setStack(['menu', 'toolbox', 'project', 'inspector', 'settings', 'projects'])
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
            onNewGame={newProject}
            onOpenProjects={() => {
              refreshProjects()
              setProjectsOpen(true)
            }}
            onSave={saveProject}
            onPlay={playProject}
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
        children: <Toolbox onCreatePanel={createPanel} onCreateResource={createResource} />,
      },
      {
        id: 'project',
        title: 'PROJECT',
        minWidth: 220,
        minHeight: 180,
        children: (
          <ProjectPanel
            projectName={projectName}
            panels={panels}
            resources={resources}
            onSelectPanel={(id) => {
              setSelectedPanelId(id)
              setSelectedResourceId(null)
            }}
            onSelectResource={(id) => {
              setSelectedResourceId(id)
              setSelectedPanelId(null)
            }}
          />
        ),
      },
      {
        id: 'settings',
        title: 'GAME SETTINGS',
        minWidth: 270,
        minHeight: 220,
        children: (
          <GameSettingsPanel
            projectName={projectName}
            settings={gameSettings}
            onRename={setProjectName}
            onChange={updateGameSettings}
            onClose={() => setSettingsOpen(false)}
          />
        ),
      },
      {
        id: 'projects',
        title: 'OPEN GAME',
        minWidth: 340,
        minHeight: 260,
        children: (
          <ProjectManager
            projects={projects}
            currentProjectId={currentProjectId}
            onOpen={openProject}
            onDelete={removeProject}
            onClose={() => setProjectsOpen(false)}
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
            resource={selectedResource}
            onUpdatePanel={updatePanel}
            onUpdateResource={updateResource}
          />
        ),
      },
    ],
    [
      createPanel,
      createResource,
      currentProjectId,
      gameSettings,
      newProject,
      openProject,
      panels,
      resources,
      playProject,
      previewOpen,
      projectName,
      projects,
      refreshProjects,
      removeProject,
      resetLayout,
      saveProject,
      selectedPanel,
      selectedResource,
      updateGameSettings,
      updatePanel,
      updateResource,
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
      <GameCanvas
        panels={panels}
        selectedPanelId={selectedPanelId}
        onSelectPanel={(id) => {
          setSelectedPanelId(id)
          if (id) setSelectedResourceId(null)
        }}
        editable
      />

      {windowConfigs
        .filter((config) => {
          if (previewOpen) {
            return config.id === 'menu'
          }

          if (config.id === 'settings') {
            return settingsOpen
          }

          if (config.id === 'projects') {
            return projectsOpen
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

function App() {
  const playProjectId = new URLSearchParams(window.location.search).get('play')

  if (playProjectId) {
    return <Player projectId={playProjectId} />
  }

  return <Editor />
}

export default App
