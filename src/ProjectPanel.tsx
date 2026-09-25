import type { DragEvent } from 'react'
import type { ActionCategory, GameAction, Panel, Resource } from './types'
import { RESOURCE_DRAG_TYPE, readResourceDrag, ACTION_DRAG_TYPE, CATEGORY_DRAG_TYPE, readActionDrag } from './panelItems'

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
  onPlacePanelItem,
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
  onPlacePanelItem: (kind: 'action' | 'action-category', id: string, panelId: string, beforeItemId?: string, itemId?: string) => void
}) {
  const startDrag = (event: DragEvent<HTMLElement>, resourceId: string, itemId?: string) => {
    event.dataTransfer.setData(RESOURCE_DRAG_TYPE, JSON.stringify({ resourceId, itemId }))
    event.dataTransfer.effectAllowed = 'move'
  }

  const startPanelDrag = (event: DragEvent<HTMLElement>, kind: 'action'|'action-category', id: string, itemId?: string) => {
    event.dataTransfer.setData(kind === 'action' ? ACTION_DRAG_TYPE : CATEGORY_DRAG_TYPE, JSON.stringify({id,itemId}))
    event.dataTransfer.effectAllowed = itemId ? 'move' : 'copy'
  }

  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (![RESOURCE_DRAG_TYPE,ACTION_DRAG_TYPE,CATEGORY_DRAG_TYPE].some(type=>event.dataTransfer.types.includes(type))) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const drop = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    const resourceDrag = readResourceDrag(event.dataTransfer.getData(RESOURCE_DRAG_TYPE))
    const actionDrag = readActionDrag(event.dataTransfer.getData(ACTION_DRAG_TYPE))
    const categoryDrag = readActionDrag(event.dataTransfer.getData(CATEGORY_DRAG_TYPE))
    if (resourceDrag && resources.some(resource=>resource.id===resourceDrag.resourceId)) {
      event.preventDefault();event.stopPropagation()
      onPlaceResource(resourceDrag.resourceId, panelId, beforeItemId, resourceDrag.itemId)
    } else if(actionDrag && actions.some(action=>action.id===actionDrag.id)) {
      event.preventDefault();event.stopPropagation()
      onPlacePanelItem('action',actionDrag.id,panelId,beforeItemId,actionDrag.itemId)
    } else if(categoryDrag && categories.some(category=>category.id===categoryDrag.id)) {
      event.preventDefault();event.stopPropagation()
      onPlacePanelItem('action-category',categoryDrag.id,panelId,beforeItemId,categoryDrag.itemId)
    }
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
          {panel.items.map(item => {
            if (item.type === 'action-category') {
              const category = categories.find(candidate => candidate.id === item.categoryId)
              return category ? <button key={item.id} type="button" draggable className="tree-row tree-attached tree-button"
                onDragStart={event=>startPanelDrag(event,'action-category',category.id,item.id)}
                onDragOver={allowDrop} onDrop={event=>drop(event,panel.id,item.id)}
                onClick={()=>onSelectCategory(category.id)}>▦ {category.name}</button> : null
            }
            if (item.type === 'action') {
              const action = actions.find(candidate=>candidate.id===item.actionId)
              return action ? <button key={item.id} type="button" draggable className="tree-row tree-attached tree-button"
                onDragStart={event=>startPanelDrag(event,'action',action.id,item.id)}
                onDragOver={allowDrop} onDrop={event=>drop(event,panel.id,item.id)}
                onClick={()=>onSelectAction(action.id)}>▶ {action.name}</button> : null
            }
            return null
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
        <button type="button" draggable className="tree-row tree-grandchild tree-button"
          onDragStart={event=>startPanelDrag(event,'action-category',category.id)}
          onClick={() => onSelectCategory(category.id)}>▦ {category.name}</button>
        {actions.filter(action => action.categoryId === category.id).map(action =>
          <button key={action.id} type="button" draggable className="tree-row tree-attached tree-button"
            onDragStart={event=>startPanelDrag(event,'action',action.id)}
            onClick={() => onSelectAction(action.id)}>▶ {action.name}</button>)}
      </div>)}
      <div className="tree-row tree-child muted">Story</div>
      <div className="tree-row tree-child muted">Directives</div>
    </div>
  )
}
