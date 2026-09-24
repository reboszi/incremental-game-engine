import type { DragEvent } from 'react'
import type { Panel, Resource } from './types'
import { RESOURCE_DRAG_TYPE } from './panelItems'

export function ProjectPanel({
  projectName,
  panels,
  resources,
  onSelectPanel,
  onSelectResource,
  onPlaceResource,
}: {
  projectName: string
  panels: Panel[]
  resources: Resource[]
  onSelectPanel: (id: string) => void
  onSelectResource: (id: string) => void
  onPlaceResource: (resourceId: string, panelId: string, beforeItemId?: string) => void
}) {
  const startDrag = (event: DragEvent<HTMLElement>, resourceId: string) => {
    event.dataTransfer.setData(RESOURCE_DRAG_TYPE, resourceId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(RESOURCE_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const drop = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    const resourceId = event.dataTransfer.getData(RESOURCE_DRAG_TYPE)
    if (!resourceId || !resources.some(resource => resource.id === resourceId)) return
    event.preventDefault()
    event.stopPropagation()
    onPlaceResource(resourceId, panelId, beforeItemId)
  }

  return (
    <div className="project-tree">
      <div className="tree-row tree-root">▾ {projectName}</div>
      <div className="tree-row tree-child muted">Panels (drop resources here)</div>
      {panels.map(panel => (
        <div key={panel.id}>
          <button
            type="button"
            className="tree-row tree-grandchild tree-button panel-drop-target"
            onClick={() => onSelectPanel(panel.id)}
            onDragOver={allowDrop}
            onDrop={event => drop(event, panel.id)}
          >
            {panel.title}
          </button>
          {panel.items.map(item => {
            if (item.type !== 'resource') return null
            const resource = resources.find(resource => resource.id === item.resourceId)
            if (!resource) return null
            return (
              <button
                key={item.id}
                type="button"
                draggable
                className="tree-row tree-attached tree-button"
                onDragStart={event => startDrag(event, resource.id)}
                onDragOver={allowDrop}
                onDrop={event => drop(event, panel.id, item.id)}
                onClick={() => onSelectResource(resource.id)}
              >
                ↳ {resource.name}
              </button>
            )
          })}
        </div>
      ))}
      <div className="tree-row tree-child muted">Resources (drag onto a panel)</div>
      {resources.map(resource => (
        <button
          type="button"
          draggable
          className="tree-row tree-grandchild tree-button"
          key={resource.id}
          onClick={() => onSelectResource(resource.id)}
          onDragStart={event => startDrag(event, resource.id)}
        >
          ⠿ {resource.name}
        </button>
      ))}
      <div className="tree-row tree-child muted">Actions</div>
      <div className="tree-row tree-child muted">Story</div>
      <div className="tree-row tree-child muted">Directives</div>
    </div>
  )
}
