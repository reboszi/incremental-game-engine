import type { Resource } from './types'

export type GameState = {
  resourceValues: Record<string, number>
}

const STATE_PREFIX = 'ige-player-state-v1:'

export function clampResourceValue(resource: Resource, candidate: number): number {
  const finite = Number.isFinite(candidate) ? candidate : 0
  const maximum = resource.maxValue
  return Math.max(0, maximum !== null && Number.isFinite(maximum)
    ? Math.min(finite, Math.max(0, maximum)) : finite)
}

export function initialGameState(resources: Resource[]): GameState {
  return {
    resourceValues: Object.fromEntries(resources.map(resource =>
      [resource.id, clampResourceValue(resource, resource.initialValue)]
    )),
  }
}

export function loadGameState(projectId: string, resources: Resource[]): GameState {
  let saved: Record<string, unknown> = {}
  try {
    const raw = localStorage.getItem(STATE_PREFIX + projectId)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'resourceValues' in parsed) {
        const values = (parsed as { resourceValues: unknown }).resourceValues
        if (values && typeof values === 'object' && !Array.isArray(values)) {
          saved = values as Record<string, unknown>
        }
      }
    }
  } catch {
    // Damaged or unavailable saves start at resource defaults.
  }
  return {
    resourceValues: Object.fromEntries(resources.map(resource => [
      resource.id,
      clampResourceValue(resource,
        typeof saved[resource.id] === 'number' ? saved[resource.id] : resource.initialValue),
    ])),
  }
}

export function saveGameState(projectId: string, state: GameState): void {
  localStorage.setItem(STATE_PREFIX + projectId, JSON.stringify(state))
}

export function resetGameState(projectId: string, resources: Resource[]): GameState {
  const next = initialGameState(resources)
  saveGameState(projectId, next)
  return next
}
