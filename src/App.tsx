import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { GameProject, GameSettings, Panel, ProjectSummary, Resource } from './types'
import { CURRENT_PROJECT_VERSION, deleteGame, listProjects, loadGame, saveGame } from './save'
import { GameCanvas } from './GameCanvas'
import { Player } from './Player'
import { ProjectPanel } from './ProjectPanel'
import { placeResource, setResourcePanel } from './panelItems'
import { ColorField } from './ColorField'
import { Inspector } from './Inspector'
import { FloatingWindow, type WindowId, type WindowState } from './FloatingWindow'

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

function loadWindowState(): Record<WindowId, WindowState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_WINDOWS
    return { ...DEFAULT_WINDOWS, ...JSON.parse(saved) }
  } catch {
    return DEFAULT_WINDOWS
  }
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
      items: [],
    }

    setPanels((current) => [...current, newPanel])
  }, [gameSettings])

  const createResource = useCallback(() => {
    const newResource: Resource = {
      id: crypto.randomUUID(),
      name: 'New Resource',
      icon: '◇',
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

  const assignResource = useCallback((resourceId: string, panelId: string, beforeItemId?: string, itemId?: string) => {
    setPanels(current => placeResource(current, resourceId, panelId, beforeItemId, itemId))
  }, [])

  const toggleResourcePanel = useCallback((resourceId: string, panelId: string, enabled: boolean) => {
    setPanels(current => setResourcePanel(current, resourceId, panelId, enabled))
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
            onPlaceResource={assignResource}
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
            panels={panels}
            onToggleResourcePanel={toggleResourcePanel}
            onUpdatePanel={updatePanel}
            onUpdateResource={updateResource}
          />
        ),
      },
    ],
    [
      createPanel,
      createResource,
      assignResource,
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
      toggleResourcePanel,
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
        resources={resources}
        onPlaceResource={assignResource}
        onSelectResource={(id) => { setSelectedResourceId(id); setSelectedPanelId(null) }}
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
