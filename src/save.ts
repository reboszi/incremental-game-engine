import type { GameAction, GameProject, Panel, PanelItem, ProjectSummary } from './types'

const PROJECT_INDEX_KEY = 'ige-project-index-v1'
const PROJECT_STORAGE_PREFIX = 'ige-project-v1:'
const LEGACY_GAME_STORAGE_KEY = 'ige-game-project-v1'

export const CURRENT_PROJECT_VERSION = 7

// Version 6 allowed loose task buttons next to their category. Upgrade them
// into category subpanels and keep their original position in the panel.
function normalizePanelItems(panels: Panel[], actions: GameAction[]): Panel[] {
  return panels.map(panel => {
    const includedCategories = new Set<string>()
    const items: PanelItem[] = []
    for (const item of panel.items) {
      if (item.type === 'action-category') {
        if (includedCategories.has(item.categoryId)) continue
        includedCategories.add(item.categoryId)
        items.push(item)
      } else if (item.type === 'action') {
        const action = actions.find(candidate => candidate.id === item.actionId)
        if (!action) continue
        if (includedCategories.has(action.categoryId)) continue
        includedCategories.add(action.categoryId)
        items.push({ id: item.id, type: 'action-category', categoryId: action.categoryId })
      } else {
        items.push(item)
      }
    }
    return { ...panel, items }
  })
}

function normalizeProject(raw: unknown): GameProject | null {
  if (!raw || typeof raw !== 'object') return null

  const project = raw as Partial<GameProject>

  if (
    typeof project.id !== 'string' ||
    project.id.length === 0 ||
    typeof project.name !== 'string' ||
    !project.gameSettings ||
    !Array.isArray(project.panels)
  ) {
    return null
  }

  const version = Number(project.version || 1)

  if (version > CURRENT_PROJECT_VERSION) {
    return null
  }

  return {
    id: project.id,
    version: CURRENT_PROJECT_VERSION,
    name: project.name,
    gameSettings: project.gameSettings,
    panels: normalizePanelItems(project.panels.map(panel => ({ ...panel, items: Array.isArray(panel.items) ? panel.items : [] })), Array.isArray(project.actions) ? project.actions : []),
    resources: Array.isArray(project.resources)
      ? project.resources.map(resource => ({ ...resource, icon: typeof resource.icon === 'string' ? resource.icon : '◇', hiddenLayout: resource.hiddenLayout === 'reserve' ? 'reserve' as const : 'collapse' as const }))
      : [],
    categories: Array.isArray(project.categories) ? project.categories : [],
    actions: Array.isArray(project.actions) ? project.actions : [],
  }
}

function readProjectIndex(): ProjectSummary[] {
  try {
    const saved = localStorage.getItem(PROJECT_INDEX_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved) as ProjectSummary[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeProjectIndex(index: ProjectSummary[]) {
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index))
}

function projectStorageKey(id: string) {
  return `${PROJECT_STORAGE_PREFIX}${id}`
}

function migrateLegacyProject() {
  const legacy = localStorage.getItem(LEGACY_GAME_STORAGE_KEY)
  if (!legacy) return

  try {
    const parsed = JSON.parse(legacy) as Omit<GameProject, 'id'>
    const project = normalizeProject({
      ...parsed,
      id: crypto.randomUUID(),
    })

    if (!project) return

    saveGame(project)
    localStorage.removeItem(LEGACY_GAME_STORAGE_KEY)
  } catch {
    // Ignore invalid legacy saves.
  }
}

export function listProjects(): ProjectSummary[] {
  migrateLegacyProject()
  return readProjectIndex().sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )
}

export function saveGame(project: GameProject) {
  const normalized = normalizeProject(project)

  if (!normalized) {
    throw new Error('Invalid game project')
  }

  localStorage.setItem(projectStorageKey(project.id), JSON.stringify(normalized))

  const updatedAt = new Date().toISOString()
  const current = readProjectIndex()
  const next = [
    {
      id: normalized.id,
      name: normalized.name,
      updatedAt,
    },
    ...current.filter((item) => item.id !== normalized.id),
  ]

  writeProjectIndex(next)
}

export function loadGame(id: string): GameProject | null {
  const saved = localStorage.getItem(projectStorageKey(id))
  if (!saved) return null

  try {
    const project = normalizeProject(JSON.parse(saved))

    if (project && project.version === CURRENT_PROJECT_VERSION) {
      localStorage.setItem(projectStorageKey(id), JSON.stringify(project))
    }

    return project
  } catch {
    return null
  }
}

export function deleteGame(id: string) {
  localStorage.removeItem(projectStorageKey(id))

  const next = readProjectIndex().filter((item) => item.id !== id)
  writeProjectIndex(next)
}
