import type { DragEvent } from 'react'
import type { ActionCategory, GameAction, Panel, Resource } from './types'
import { RESOURCE_DRAG_TYPE, readResourceDrag } from './panelItems'

export function ProjectPanel({
  projectName,
  panels,
  resources,
  categories,
  actions,
  onSelectCategory,
  onSelectAction,
  onSelectPanel,
  onSelectResource,
  onPlaceResource,
}: {
  projectName: string
  panels: Panel[]
  resources: Resource[]
  categories: ActionCategory[]
  actions: GameAction[]
  onSelectCategory: (id: string) => void
  onSelectAction: (id: string) => void
  onSelectPanel: (id: string) => void
  onSelectResource: (id: string) => void
  onPlaceResource: (resourceId: string, panelId: string, beforeItemId?: string, itemId?: string) => void
}) {
  const startDrag = (event: DragEvent<HTMLElement>, resourceId: string, itemId?: string) => {
    event.dataTransfer.setData(RESOURCE_DRAG_TYPE, JSON.stringify({ resourceId, itemId }))
    event.dataTransfer.effectAllowed = 'move'
  }

  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(RESOURCE_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const drop = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    const drag = readResourceDrag(event.dataTransfer.getData(RESOURCE_DRAG_TYPE))
    if (!drag || !resources.some(resource => resource.id === drag.resourceId)) return
    event.preventDefault()
    event.stopPropagation()
    onPlaceResource(drag.resourceId, panelId, beforeItemId, drag.itemId)
  }

  return (
    <div className="project-tree">
      <div className="tree-row tree-root">▾ {projectName}</div>
      <div className="tree-row tree-child muted">Panels (drag references here)</div>
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
          {panel.items.filter(item => item.type === 'action-category').map(item => {
            if (item.type !== 'action-category') return null
            const category = categories.find(candidate => candidate.id === item.categoryId)
            return category ? <button key={item.id} type="button" className="tree-row tree-attached tree-button"
              onClick={() => onSelectCategory(category.id)}>▦ {category.name}</button> : null
          })}
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
                onDragStart={event => startDrag(event, resource.id, item.id)}
                onDragOver={allowDrop}
                onDrop={event => drop(event, panel.id, item.id)}
                onClick={() => onSelectResource(resource.id)}
              >
                ↳ {resource.icon || '◇'} {resource.name}
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
          {resource.icon || '◇'} {resource.name}
        </button>
      ))}
      <div className="tree-row tree-child muted">Action categories</div>
      {categories.map(category => <div key={category.id}>
        <button type="button" className="tree-row tree-grandchild tree-button" onClick={() => onSelectCategory(category.id)}>▦ {category.name}</button>
        {actions.filter(action => action.categoryId === category.id).map(action =>
          <button key={action.id} type="button" className="tree-row tree-attached tree-button"
            onClick={() => onSelectAction(action.id)}>▶ {action.name}</button>)}
      </div>)}
      <div className="tree-row tree-child muted">Story</div>
      <div className="tree-row tree-child muted">Directives</div>
    </div>
  )
}
