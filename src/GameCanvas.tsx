import type { DragEvent } from 'react'
import type { ActionCategory, GameAction, GameProject, Panel, Resource } from './types'
import { PANEL_SLOTS } from './layout'
import { RESOURCE_DRAG_TYPE, readResourceDrag, ACTION_DRAG_TYPE, CATEGORY_DRAG_TYPE, readActionDrag } from './panelItems'
import { ResourceView } from './ResourceView'
import { ActionCategoryView } from './ActionCategoryView'
import { ActionButton } from './ActionButton'
import type { GameState } from './gameState'

export function GameCanvas({
  panels,
  resources = [],
  categories = [],
  actions = [],
  gameState,
  project,
  onSelectAction,
  onRunAction,
  resourceValues,
  resourceVisibility,
  selectedPanelId = null,
  onSelectPanel,
  onSelectResource,
  onPlaceResource,
  onPlacePanelItem,
  editable,
}: {
  panels: Panel[]
  resources?: Resource[]
  categories?: ActionCategory[]
  actions?: GameAction[]
  gameState?: GameState
  project?: GameProject
  onSelectAction?: (id:string)=>void
  onRunAction?: (id:string)=>void
  resourceValues?: Record<string, number>
  resourceVisibility?: Record<string, boolean>
  selectedPanelId?: string | null
  onSelectPanel?: (id: string | null) => void
  onSelectResource?: (id: string) => void
  onPlaceResource?: (resourceId: string, panelId: string, beforeItemId?: string, itemId?: string) => void
  onPlacePanelItem?: (kind:'action'|'action-category',id:string,panelId:string,beforeItemId?:string,itemId?:string)=>void
  editable: boolean
}) {
  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (!editable || ![RESOURCE_DRAG_TYPE,ACTION_DRAG_TYPE,CATEGORY_DRAG_TYPE].some(type=>event.dataTransfer.types.includes(type))) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const placeDropped = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    if (!editable) return
    const resourceDrag = readResourceDrag(event.dataTransfer.getData(RESOURCE_DRAG_TYPE))
    const actionDrag = readActionDrag(event.dataTransfer.getData(ACTION_DRAG_TYPE))
    const categoryDrag = readActionDrag(event.dataTransfer.getData(CATEGORY_DRAG_TYPE))
    if (resourceDrag && resources.some(resource=>resource.id===resourceDrag.resourceId)) {
      event.preventDefault();event.stopPropagation()
      onPlaceResource?.(resourceDrag.resourceId,panelId,beforeItemId,resourceDrag.itemId)
    } else if (actionDrag && actions.some(action=>action.id===actionDrag.id)) {
      event.preventDefault();event.stopPropagation()
      onPlacePanelItem?.('action',actionDrag.id,panelId,beforeItemId,actionDrag.itemId)
    } else if (categoryDrag && categories.some(category=>category.id===categoryDrag.id)) {
      event.preventDefault();event.stopPropagation()
      onPlacePanelItem?.('action-category',categoryDrag.id,panelId,beforeItemId,categoryDrag.itemId)
    }
  }

  return (
    <section
      className="canvas"
      aria-label={editable ? 'Game editor canvas' : 'Game'}
      onClick={() => { if (editable) onSelectPanel?.(null) }}
    >
      {panels.map(panel => {
        const slot = PANEL_SLOTS.find(slot => slot.value === panel.slot)
        if (!slot) return null
        return (
          <div
            key={panel.id}
            className={`game-panel game-panel--${slot.direction} ${editable && selectedPanelId === panel.id ? 'selected' : ''}`}
            onClick={event => {
              if (!editable) return
              event.stopPropagation()
              onSelectPanel?.(panel.id)
            }}
            onDragOver={allowDrop}
            onDrop={event => placeDropped(event, panel.id)}
            style={{
              gridRow: `${slot.rowStart} / span ${slot.rowSpan}`,
              gridColumn: `${slot.columnStart} / span ${slot.columnSpan}`,
              backgroundColor: panel.backgroundColor,
              color: panel.textColor,
              borderColor: panel.borderColor,
            }}
          >
            <div className="game-panel-title">{panel.title}</div>
            <div className={`panel-content panel-content--${slot.direction}`}>
              {panel.items.map(item => {
                if (item.type === 'action') {
                  const action = actions.find(action=>action.id===item.actionId)
                  if (!action || (!editable && !(gameState?.actionVisibility[action.id] ?? action.initiallyVisible))) return null
                  return <div key={item.id} className="panel-item panel-action-item"
                    draggable={editable}
                    onDragStart={event => {
                      if (!editable) return
                      event.stopPropagation()
                      event.dataTransfer.setData(ACTION_DRAG_TYPE,JSON.stringify({id:action.id,itemId:item.id}))
                      event.dataTransfer.effectAllowed='move'
                    }}
                    onDragOver={allowDrop} onDrop={event=>placeDropped(event,panel.id,item.id)}
                    onClick={event=>event.stopPropagation()}>
                    <ActionButton action={action} editable={editable} gameState={gameState}
                      project={project} onSelectAction={onSelectAction} onRunAction={onRunAction}/>
                  </div>
                }
                if (item.type === 'action-category') {
                  const category = categories.find(category=>category.id===item.categoryId)
                  if (!category) return null
                  if (!editable && !actions.some(action => action.categoryId === category.id &&
                    (gameState?.actionVisibility[action.id] ?? action.initiallyVisible))) return null
                  return <div key={item.id} className="panel-item panel-category-item"
                    draggable={editable}
                    onDragStart={event=>{
                      if(!editable)return
                      event.stopPropagation()
                      event.dataTransfer.setData(CATEGORY_DRAG_TYPE,JSON.stringify({id:category.id,itemId:item.id}))
                      event.dataTransfer.effectAllowed='move'
                    }}
                    onDragOver={allowDrop} onDrop={event=>placeDropped(event,panel.id,item.id)}
                    onClick={event=>event.stopPropagation()}>
                    <ActionCategoryView category={category}
                      actions={actions.filter(action=>action.categoryId===category.id)}
                      editable={editable} gameState={gameState} project={project}
                      onSelectAction={onSelectAction} onRunAction={onRunAction}/>
                  </div>
                }
                if (item.type !== 'resource') return null
                const resource = resources.find(resource => resource.id === item.resourceId)
                if (!resource) return null
                const visible = editable || (resourceVisibility?.[resource.id] ?? resource.initiallyVisible)
                if (!visible && resource.hiddenLayout !== 'reserve') return null
                if (!visible) return (
                  <div key={item.id} className="panel-item panel-item--reserved" aria-hidden="true" />
                )

                return (
                  <div
                    key={item.id}
                    className="panel-item"
                    draggable={editable}
                    onDragStart={event => {
                      if (!editable) return
                      event.stopPropagation()
                      event.dataTransfer.setData(RESOURCE_DRAG_TYPE, JSON.stringify({ resourceId: resource.id, itemId: item.id }))
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={allowDrop}
                    onDrop={event => placeDropped(event, panel.id, item.id)}
                    onClick={event => {
                      if (!editable) return
                      event.stopPropagation()
                      onSelectResource?.(resource.id)
                    }}
                  >
                    <ResourceView resource={resource} value={resourceValues?.[resource.id] ?? resource.initialValue} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
