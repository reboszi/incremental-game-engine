import type { GameProject } from './types'

const GAME_STORAGE_KEY = 'ige-game-project-v1'

export const CURRENT_PROJECT_VERSION = 1

export function saveGame(project: GameProject) {
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(project))
}

export function loadGame(): GameProject | null {
  const saved = localStorage.getItem(GAME_STORAGE_KEY)

  if (!saved) {
    return null
  }

  try {
    const project = JSON.parse(saved) as GameProject

    if (
      project.version !== CURRENT_PROJECT_VERSION ||
      typeof project.name !== 'string' ||
      !project.gameSettings ||
      !Array.isArray(project.panels)
    ) {
      return null
    }

    return project
  } catch {
    return null
  }
}
