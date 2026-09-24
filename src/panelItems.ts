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

  const existing = itemId
    ? panels.flatMap(panel => panel.items).find(item => item.id === itemId && item.resourceId === resourceId)
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
    if (panels.some(panel => panel.id === panelId && panel.items.some(item => item.resourceId === resourceId))) return panels
    return placeResource(panels, resourceId, panelId)
  }
  return panels.map(panel => panel.id === panelId
    ? { ...panel, items: panel.items.filter(item => item.resourceId !== resourceId) }
    : panel)
}

export function removePanelItem(panels: Panel[], itemId: string): Panel[] {
  return panels.map(panel => ({ ...panel, items: panel.items.filter(item => item.id !== itemId) }))
}
