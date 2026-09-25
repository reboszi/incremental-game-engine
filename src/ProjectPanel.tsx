import type { DragEvent } from 'react'
import type { ActionCategory, GameAction, Panel, Resource } from './types'
import { beginPanelDrag, endPanelDrag, getPanelDrag, isPanelDrag } from './panelItems'

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
  onMoveActionToCategory,
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
  onMoveActionToCategory: (actionId:string,categoryId:string)=>void
}) {
  const startDrag = (event: DragEvent<HTMLElement>, resourceId: string, itemId?: string) =>
    beginPanelDrag(event, {kind:'resource',id:resourceId,itemId})

  const startPanelDrag = (event: DragEvent<HTMLElement>, kind: 'action'|'action-category', id: string, itemId?: string) =>
    beginPanelDrag(event, {kind,id,itemId})

  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (!isPanelDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const drop = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    const drag = getPanelDrag(event)
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    if (drag.kind === 'resource' && resources.some(resource=>resource.id===drag.id)) {
      onPlaceResource(drag.id,panelId,beforeItemId,drag.itemId)
    } else if (drag.kind === 'action' && actions.some(action=>action.id===drag.id)) {
      onPlacePanelItem('action',drag.id,panelId,beforeItemId,drag.itemId)
    } else if (drag.kind === 'action-category' && categories.some(category=>category.id===drag.id)) {
      onPlacePanelItem('action-category',drag.id,panelId,beforeItemId,drag.itemId)
    }
    endPanelDrag()
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
              return category ? <button key={item.id} type="button" draggable onDragEnd={endPanelDrag} className="tree-row tree-attached tree-button"
                onDragStart={event=>startPanelDrag(event,'action-category',category.id,item.id)}
                onDragOver={allowDrop} onDrop={event=>drop(event,panel.id,item.id)}
                onClick={()=>onSelectCategory(category.id)}>▦ {category.name}</button> : null
            }
            if (item.type === 'action') {
              const action = actions.find(candidate=>candidate.id===item.actionId)
              return action ? <button key={item.id} type="button" draggable onDragEnd={endPanelDrag} className="tree-row tree-attached tree-button"
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
                onDragEnd={endPanelDrag}
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
          onDragEnd={endPanelDrag}
          className="tree-row tree-grandchild tree-button"
          key={resource.id}
          onClick={() => onSelectResource(resource.id)}
          onDragStart={event => startDrag(event, resource.id)}
        >
          {resource.icon || '◇'} {resource.name}
        </button>
      ))}
      <div className="tree-row tree-child muted">Action categories (drop tasks here to regroup)</div>
      {categories.map(category => <div key={category.id}>
        <button type="button" draggable onDragEnd={endPanelDrag} className="tree-row tree-grandchild tree-button panel-drop-target"
          onDragStart={event=>startPanelDrag(event,'action-category',category.id)}
          onDragOver={event=>{
            if(getPanelDrag(event)?.kind !== 'action' && !Array.from(event.dataTransfer.types).includes('application/x-ige-action')) return
            event.preventDefault()
            event.dataTransfer.dropEffect='move'
          }}
          onDrop={event=>{
            const dragged=getPanelDrag(event)
            if(!dragged || dragged.kind!=='action' || !actions.some(action=>action.id===dragged.id)) return
            event.preventDefault();event.stopPropagation()
            onMoveActionToCategory(dragged.id,category.id)
            endPanelDrag()
          }}
          onClick={() => onSelectCategory(category.id)}>▦ {category.name}</button>
        {actions.filter(action => action.categoryId === category.id).map(action =>
          <button key={action.id} type="button" draggable onDragEnd={endPanelDrag} className="tree-row tree-attached tree-button"
            onDragStart={event=>startPanelDrag(event,'action',action.id)}
            onClick={() => onSelectAction(action.id)}>▶ {action.name}</button>)}
      </div>)}
      <div className="tree-row tree-child muted">Story</div>
      <div className="tree-row tree-child muted">Directives</div>
    </div>
  )
}
