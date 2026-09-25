import { useState, type DragEvent } from 'react'
import type { ActionCategory, GameAction, GameProject, Panel, Resource } from './types'
import { PANEL_SLOTS } from './layout'
import { beginPanelDrag, endPanelDrag, getPanelDrag, isPanelDrag } from './panelItems'
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
  onMoveActionToCategory,
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
  onMoveActionToCategory?: (actionId:string,categoryId:string,beforeActionId?:string)=>void
  editable: boolean
}) {
  const [dragOverPanelId, setDragOverPanelId] = useState<string | null>(null)

  const allowDrop = (event: DragEvent<HTMLElement>, panelId: string) => {
    if (!editable || !isPanelDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverPanelId(panelId)
  }

  const placeDropped = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    if (!editable) return
    const drag = getPanelDrag(event)
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    if (drag.kind === 'resource' && resources.some(resource=>resource.id===drag.id)) {
      onPlaceResource?.(drag.id,panelId,beforeItemId,drag.itemId)
    } else if (drag.kind === 'action' && actions.some(action=>action.id===drag.id)) {
      onPlacePanelItem?.('action',drag.id,panelId,beforeItemId,drag.itemId)
    } else if (drag.kind === 'action-category' && categories.some(category=>category.id===drag.id)) {
      onPlacePanelItem?.('action-category',drag.id,panelId,beforeItemId,drag.itemId)
    }
    setDragOverPanelId(null)
    endPanelDrag()
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
            className={`game-panel game-panel--${slot.direction} ${editable && selectedPanelId === panel.id ? 'selected' : ''} ${editable && dragOverPanelId === panel.id ? 'panel-drag-over' : ''}`}
            onClick={event => {
              if (!editable) return
              event.stopPropagation()
              onSelectPanel?.(panel.id)
            }}
            onDragOver={event=>allowDrop(event,panel.id)}
            onDragLeave={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverPanelId(null)
            }}
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
                    onDragEnd={() => {endPanelDrag();setDragOverPanelId(null)}}
                    onDragStart={event => {
                      if (!editable) return
                      event.stopPropagation()
                      beginPanelDrag(event,{kind:'action',id:action.id,itemId:item.id})
                    }}
                    onDragOver={event=>allowDrop(event,panel.id)} onDrop={event=>placeDropped(event,panel.id,item.id)}
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
                    onDragEnd={() => {endPanelDrag();setDragOverPanelId(null)}}
                    onDragStart={event=>{
                      if(!editable)return
                      event.stopPropagation()
                      beginPanelDrag(event,{kind:'action-category',id:category.id,itemId:item.id})
                    }}
                    onDragOver={event=>allowDrop(event,panel.id)}
                    onDrop={event=>{
                      const drag=getPanelDrag(event)
                      if (editable && drag?.kind==='action' && actions.some(action=>action.id===drag.id)) {
                        event.preventDefault();event.stopPropagation()
                        onMoveActionToCategory?.(drag.id,category.id)
                        setDragOverPanelId(null)
                        endPanelDrag()
                      } else placeDropped(event,panel.id,item.id)
                    }}
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
                    onDragEnd={() => {endPanelDrag();setDragOverPanelId(null)}}
                    onDragStart={event => {
                      if (!editable) return
                      event.stopPropagation()
                      beginPanelDrag(event,{kind:'resource',id:resource.id,itemId:item.id})
                    }}
                    onDragOver={event=>allowDrop(event,panel.id)}
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
