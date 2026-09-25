import type { GameAction, GameProject } from './types'
import type { GameState } from './gameState'
import { clampResourceValue } from './gameState'

export function canStartAction(action: GameAction, state: GameState, project: GameProject): boolean {
  if (!(state.actionVisibility[action.id] ?? action.initiallyVisible)) return false
  if (!action.repeatable && state.completedActions[action.id]) return false
  if (state.runningTasks.some(task => task.actionId === action.id)) return false
  // Invalid effect targets are configuration errors, not silently successful tasks.
  if (!action.effects.every(effect => {
    if ('resourceId' in effect) return project.resources.some(resource=>resource.id===effect.resourceId) &&
      (!('amount' in effect) || Number.isFinite(effect.amount))
    return project.actions.some(candidate=>candidate.id===effect.actionId && candidate.id!==action.id)
  })) return false
  return action.requirements.every(requirement => {
    const resource = project.resources.find(resource => resource.id === requirement.resourceId)
    return !!resource && (state.resourceValues[resource.id] ?? resource.initialValue) >= requirement.minimum
  })
}

export function applyActionEffects(action: GameAction, state: GameState, project: GameProject): GameState {
  const next: GameState = {
    ...state,
    resourceValues: { ...state.resourceValues },
    resourceVisibility: { ...state.resourceVisibility },
    actionVisibility: { ...state.actionVisibility },
    completedActions: { ...state.completedActions, [action.id]: true },
  }
  for (const effect of action.effects) {
    if (effect.type === 'add-resource' || effect.type === 'set-resource' || effect.type === 'grant-resource') {
      const resource = project.resources.find(resource => resource.id === effect.resourceId)
      if (!resource) continue
      const old = next.resourceValues[resource.id] ?? resource.initialValue
      next.resourceValues[resource.id] = clampResourceValue(resource,
        effect.type === 'set-resource' ? effect.amount : old + effect.amount)
      if (effect.type === 'grant-resource') next.resourceVisibility[resource.id] = true
    } else if (effect.type === 'reveal-resource' || effect.type === 'hide-resource') {
      if (project.resources.some(resource => resource.id === effect.resourceId)) {
        next.resourceVisibility[effect.resourceId] = effect.type === 'reveal-resource'
      }
    } else if (effect.type === 'reveal-action' || effect.type === 'hide-action') {
      if (project.actions.some(candidate => candidate.id === effect.actionId)) {
        next.actionVisibility[effect.actionId] = effect.type === 'reveal-action'
      }
    }
  }
  return next
}

export function startAction(actionId: string, state: GameState, project: GameProject, now = Date.now()): GameState {
  const action = project.actions.find(action => action.id === actionId)
  if (!action || !canStartAction(action, state, project)) return state
  if (action.durationSeconds <= 0) return applyActionEffects(action, state, project)
  return {
    ...state,
    runningTasks: [...state.runningTasks, {
      actionId: action.id,
      endsAt: now + action.durationSeconds * 1000,
    }],
  }
}

export function completeDueTasks(state: GameState, project: GameProject, now = Date.now()): GameState {
  const due = state.runningTasks.filter(task => task.endsAt <= now)
  if (due.length === 0) return state
  let next: GameState = {
    ...state,
    runningTasks: state.runningTasks.filter(task => task.endsAt > now),
  }
  for (const task of due) {
    const action = project.actions.find(action => action.id === task.actionId)
    if (action) next = applyActionEffects(action, next, project)
  }
  return next
}
