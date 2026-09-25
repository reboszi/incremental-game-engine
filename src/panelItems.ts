import type { Panel, PanelItem } from './types'

export const RESOURCE_DRAG_TYPE = 'application/x-ige-resource'

export type ResourceDrag = { resourceId: string; itemId?: string }

export function readResourceDrag(data: string): ResourceDrag | null {
  try {
    const value: unknown = JSON.parse(data)
    if (!value || typeof value !== 'object') return null
    const drag = value as Partial<ResourceDrag>
    if (typeof drag.resourceId !== 'string') return null
    if (drag.itemId !== undefined && typeof drag.itemId !== 'string') return null
    return { resourceId: drag.resourceId, itemId: drag.itemId }
  } catch {
    return null
  }
}

export function resourcePanelIds(panels: Panel[], resourceId: string): string[] {
  return panels
    .filter(panel => panel.items.some(item => item.type === 'resource' && item.resourceId === resourceId))
    .map(panel => panel.id)
}

// The catalogue adds another reference; an existing panel item moves only that instance.
export function placeResource(
  panels: Panel[],
  resourceId: string,
  targetPanelId: string,
  beforeItemId?: string,
  itemId?: string
): Panel[] {
  if (!panels.some(panel => panel.id === targetPanelId)) return panels

  // One reference per resource in a panel; moving within that panel still reorders it.
  const target = panels.find(panel => panel.id === targetPanelId)!
  if (target.items.some(item => item.type === 'resource' && item.resourceId === resourceId && item.id !== itemId)) return panels

  const existing = itemId
    ? panels.flatMap(panel => panel.items).find(item => item.id === itemId && item.type === 'resource' && item.resourceId === resourceId)
    : undefined

  const item: PanelItem = existing ?? { id: crypto.randomUUID(), type: 'resource', resourceId }
  const withoutMoved = panels.map(panel => ({
    ...panel,
    items: itemId ? panel.items.filter(candidate => candidate.id !== itemId) : panel.items,
  }))

  return withoutMoved.map(panel => {
    if (panel.id !== targetPanelId) return panel
    const items = [...panel.items]
    const index = beforeItemId ? items.findIndex(candidate => candidate.id === beforeItemId) : -1
    items.splice(index < 0 ? items.length : index, 0, item)
    return { ...panel, items }
  })
}

export function setResourcePanel(panels: Panel[], resourceId: string, panelId: string, enabled: boolean): Panel[] {
  if (enabled) {
    if (panels.some(panel => panel.id === panelId && panel.items.some(item => item.type === 'resource' && item.resourceId === resourceId))) return panels
    return placeResource(panels, resourceId, panelId)
  }
  return panels.map(panel => panel.id === panelId
    ? { ...panel, items: panel.items.filter(item => item.type !== 'resource' || item.resourceId !== resourceId) }
    : panel)
}

export function removePanelItem(panels: Panel[], itemId: string): Panel[] {
  return panels.map(panel => ({ ...panel, items: panel.items.filter(item => item.id !== itemId) }))
}

export const ACTION_DRAG_TYPE = 'application/x-ige-action'
export const CATEGORY_DRAG_TYPE = 'application/x-ige-action-category'

export type ActionDrag = { id: string; itemId?: string }
export function readActionDrag(data: string): ActionDrag | null {
  try {
    const input: unknown = JSON.parse(data)
    if (!input || typeof input !== 'object') return null
    const value = input as Partial<ActionDrag>
    return typeof value.id === 'string' && (value.itemId === undefined || typeof value.itemId === 'string')
      ? {id: value.id, itemId: value.itemId} : null
  } catch { return null }
}

// Catalogue drops create references. Dragging an existing panel item moves just that reference.
export function placePanelReference(
  panels: Panel[], kind: 'action' | 'action-category', id: string,
  targetPanelId: string, beforeItemId?: string, itemId?: string
): Panel[] {
  const field = kind === 'action' ? 'actionId' : 'categoryId'
  const target = panels.find(panel => panel.id === targetPanelId)
  if (!target) return panels
  const matches = (item: PanelItem) => item.type === kind && (
    kind === 'action' ? ('actionId' in item && item.actionId === id) :
      ('categoryId' in item && item.categoryId === id)
  )
  // A category or an individual action can be referenced on several panels, but only once per panel.
  if (target.items.some(item => matches(item) && item.id !== itemId)) return panels
  const existing = itemId ? panels.flatMap(panel => panel.items).find(item => item.id === itemId && matches(item)) : undefined
  const entry: PanelItem = existing ?? (kind === 'action'
    ? {id: crypto.randomUUID(),type:'action',actionId:id}
    : {id: crypto.randomUUID(),type:'action-category',categoryId:id})
  const without = panels.map(panel => ({
    ...panel, items: itemId ? panel.items.filter(item => item.id !== itemId) : panel.items,
  }))
  return without.map(panel => {
    if (panel.id !== targetPanelId) return panel
    const items = [...panel.items]
    const position = beforeItemId ? items.findIndex(item => item.id === beforeItemId) : -1
    items.splice(position < 0 ? items.length : position, 0, entry)
    return {...panel, items}
  })
}

export function setPanelReference(
  panels: Panel[], kind: 'action' | 'action-category', id: string,
  panelId: string, enabled: boolean
): Panel[] {
  if (enabled) return placePanelReference(panels, kind, id, panelId)
  return panels.map(panel => panel.id === panelId ? {...panel,
    items:panel.items.filter(item => kind === 'action'
      ? item.type !== 'action' || item.actionId !== id
      : item.type !== 'action-category' || item.categoryId !== id),
  } : panel)
}
