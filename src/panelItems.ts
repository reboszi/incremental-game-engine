import type { Panel, PanelItem } from './types'

export const RESOURCE_DRAG_TYPE = 'application/x-ige-resource'

export function findResourcePanel(panels: Panel[], resourceId: string): string {
  return panels.find(panel => panel.items.some(item => item.type === 'resource' && item.resourceId === resourceId))?.id ?? ''
}

// Resources have one location. Removing them from every panel first prevents duplicates.
export function placeResource(
  panels: Panel[],
  resourceId: string,
  targetPanelId: string,
  beforeItemId?: string
): Panel[] {
  const item: PanelItem = panels.flatMap(panel => panel.items)
    .find(item => item.type === 'resource' && item.resourceId === resourceId)
    ?? { id: crypto.randomUUID(), type: 'resource', resourceId }

  const withoutResource = panels.map(panel => ({
    ...panel,
    items: panel.items.filter(item => !(item.type === 'resource' && item.resourceId === resourceId)),
  }))

  if (!targetPanelId) return withoutResource

  return withoutResource.map(panel => {
    if (panel.id !== targetPanelId) return panel
    const items = [...panel.items]
    const index = beforeItemId ? items.findIndex(existing => existing.id === beforeItemId) : -1
    items.splice(index < 0 ? items.length : index, 0, item)
    return { ...panel, items }
  })
}
