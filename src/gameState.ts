import type { GameAction, Resource } from './types'

export type GameState = {
  resourceValues: Record<string, number>
  resourceVisibility: Record<string, boolean>
  actionVisibility: Record<string, boolean>
  completedActions: Record<string, boolean>
  runningTasks: { actionId: string; endsAt: number }[]
}

const STATE_PREFIX = 'ige-player-state-v1:'

export function clampResourceValue(resource: Resource, candidate: number): number {
  const finite = Number.isFinite(candidate) ? candidate : 0
  const maximum = resource.maxValue
  return Math.max(0, maximum !== null && Number.isFinite(maximum)
    ? Math.min(finite, Math.max(0, maximum)) : finite)
}

export function initialGameState(resources: Resource[], actions: GameAction[] = []): GameState {
  return {
    resourceValues: Object.fromEntries(resources.map(resource =>
      [resource.id, clampResourceValue(resource, resource.initialValue)]
    )),
    resourceVisibility: Object.fromEntries(resources.map(resource =>
      [resource.id, resource.initiallyVisible]
    )),
    actionVisibility: Object.fromEntries(actions.map(action => [action.id, action.initiallyVisible])),
    completedActions: {},
    runningTasks: [],
  }
}

export function setResourceVisibility(state: GameState, resourceId: string, visible: boolean): GameState {
  return {
    ...state,
    resourceVisibility: { ...state.resourceVisibility, [resourceId]: visible },
  }
}

export function loadGameState(projectId: string, resources: Resource[], actions: GameAction[] = []): GameState {
  let savedValues: Record<string, unknown> = {}
  let savedVisibility: Record<string, unknown> = {}
  let savedActions: Record<string, unknown> = {}
  let savedCompleted: Record<string, unknown> = {}
  let savedTasks: unknown = []
  try {
    const raw = localStorage.getItem(STATE_PREFIX + projectId)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const data = parsed as { resourceValues?: unknown; resourceVisibility?: unknown; actionVisibility?: unknown; completedActions?: unknown; runningTasks?: unknown }
        if (data.resourceValues && typeof data.resourceValues === 'object' && !Array.isArray(data.resourceValues)) {
          savedValues = data.resourceValues as Record<string, unknown>
        }
        if (data.resourceVisibility && typeof data.resourceVisibility === 'object' && !Array.isArray(data.resourceVisibility)) {
          savedVisibility = data.resourceVisibility as Record<string, unknown>
        }
        if (data.actionVisibility && typeof data.actionVisibility === 'object' && !Array.isArray(data.actionVisibility)) savedActions = data.actionVisibility as Record<string, unknown>
        if (data.completedActions && typeof data.completedActions === 'object' && !Array.isArray(data.completedActions)) savedCompleted = data.completedActions as Record<string, unknown>
        savedTasks = data.runningTasks
      }
    }
  } catch {
    // Damaged or unavailable saves start at resource defaults.
  }

  return {
    resourceValues: Object.fromEntries(resources.map(resource => [
      resource.id,
      clampResourceValue(resource,
        typeof savedValues[resource.id] === 'number'
          ? (savedValues[resource.id] as number) : resource.initialValue),
    ])),
    // Old player saves only have values: preserve those values and use each
    // resource's editor-defined initial visibility until explicitly revealed.
    resourceVisibility: Object.fromEntries(resources.map(resource => [
      resource.id,
      typeof savedVisibility[resource.id] === 'boolean'
        ? (savedVisibility[resource.id] as boolean) : resource.initiallyVisible,
    ])),
    actionVisibility: Object.fromEntries(actions.map(action => [
      action.id, typeof savedActions[action.id] === 'boolean' ? savedActions[action.id] as boolean : action.initiallyVisible,
    ])),
    completedActions: Object.fromEntries(actions.filter(action => savedCompleted[action.id] === true).map(action => [action.id, true])),
    runningTasks: Array.isArray(savedTasks) ? savedTasks.filter((task): task is { actionId: string; endsAt: number } =>
      !!task && typeof task === 'object' && typeof task.actionId === 'string' &&
      actions.some(action => action.id === task.actionId) && typeof task.endsAt === 'number' &&
      Number.isFinite(task.endsAt)) : [],
  }
}

export function saveGameState(projectId: string, state: GameState): void {
  localStorage.setItem(STATE_PREFIX + projectId, JSON.stringify(state))
}

export function resetGameState(projectId: string, resources: Resource[], actions: GameAction[] = []): GameState {
  const next = initialGameState(resources, actions)
  saveGameState(projectId, next)
  return next
}
