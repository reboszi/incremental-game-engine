import type { DragEvent } from 'react'
import type { Panel, Resource } from './types'
import { PANEL_SLOTS } from './layout'
import { RESOURCE_DRAG_TYPE, readResourceDrag } from './panelItems'
import { ResourceView } from './ResourceView'

export function GameCanvas({
  panels,
  resources = [],
  resourceValues,
  resourceVisibility,
  selectedPanelId = null,
  onSelectPanel,
  onSelectResource,
  onPlaceResource,
  editable,
}: {
  panels: Panel[]
  resources?: Resource[]
  resourceValues?: Record<string, number>
  resourceVisibility?: Record<string, boolean>
  selectedPanelId?: string | null
  onSelectPanel?: (id: string | null) => void
  onSelectResource?: (id: string) => void
  onPlaceResource?: (resourceId: string, panelId: string, beforeItemId?: string, itemId?: string) => void
  editable: boolean
}) {
  const allowDrop = (event: DragEvent<HTMLElement>) => {
    if (!editable || !event.dataTransfer.types.includes(RESOURCE_DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const placeDropped = (event: DragEvent<HTMLElement>, panelId: string, beforeItemId?: string) => {
    if (!editable) return
    const drag = readResourceDrag(event.dataTransfer.getData(RESOURCE_DRAG_TYPE))
    if (!drag || !resources.some(resource => resource.id === drag.resourceId)) return
    event.preventDefault()
    event.stopPropagation()
    onPlaceResource?.(drag.resourceId, panelId, beforeItemId, drag.itemId)
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
