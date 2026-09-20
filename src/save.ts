import type { GameProject, ProjectSummary } from './types'

const PROJECT_INDEX_KEY = 'ige-project-index-v1'
const PROJECT_STORAGE_PREFIX = 'ige-project-v1:'
const LEGACY_GAME_STORAGE_KEY = 'ige-game-project-v1'

export const CURRENT_PROJECT_VERSION = 1

function isValidProject(project: GameProject) {
  return (
    typeof project.id === 'string' &&
    project.id.length > 0 &&
    project.version === CURRENT_PROJECT_VERSION &&
    typeof project.name === 'string' &&
    !!project.gameSettings &&
    Array.isArray(project.panels)
  )
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
    const id = crypto.randomUUID()
    const project: GameProject = {
      ...parsed,
      id,
    }

    if (!isValidProject(project)) return

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
  if (!isValidProject(project)) {
    throw new Error('Invalid game project')
  }

  localStorage.setItem(projectStorageKey(project.id), JSON.stringify(project))

  const updatedAt = new Date().toISOString()
  const current = readProjectIndex()
  const next = [
    {
      id: project.id,
      name: project.name,
      updatedAt,
    },
    ...current.filter((item) => item.id !== project.id),
  ]

  writeProjectIndex(next)
}

export function loadGame(id: string): GameProject | null {
  const saved = localStorage.getItem(projectStorageKey(id))
  if (!saved) return null

  try {
    const project = JSON.parse(saved) as GameProject
    return isValidProject(project) ? project : null
  } catch {
    return null
  }
}

export function deleteGame(id: string) {
  localStorage.removeItem(projectStorageKey(id))

  const next = readProjectIndex().filter((item) => item.id !== id)
  writeProjectIndex(next)
}
