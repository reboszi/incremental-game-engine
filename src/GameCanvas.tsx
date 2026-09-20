import type { Panel } from './types'
import { PANEL_SLOTS } from './layout'

export function GameCanvas({
  panels,
  selectedPanelId = null,
  onSelectPanel,
  editable,
}: {
  panels: Panel[]
  selectedPanelId?: string | null
  onSelectPanel?: (id: string | null) => void
  editable: boolean
}) {
  return (
    <section
      className="canvas"
      aria-label={editable ? 'Game editor canvas' : 'Game'}
      onClick={() => {
        if (editable) onSelectPanel?.(null)
      }}
    >
      {panels.map((panel) => {
        const slot = PANEL_SLOTS.find((item) => item.value === panel.slot)
        if (!slot) return null

        return (
          <div
            key={panel.id}
            className={`game-panel ${editable && selectedPanelId === panel.id ? 'selected' : ''}`}
            onClick={(event) => {
              if (!editable) return
              event.stopPropagation()
              onSelectPanel?.(panel.id)
            }}
            style={{
              gridRow: `${slot.rowStart} / span ${slot.rowSpan}`,
              gridColumn: `${slot.columnStart} / span ${slot.columnSpan}`,
              backgroundColor: panel.backgroundColor,
              color: panel.textColor,
              borderColor: panel.borderColor,
            }}
          >
            {panel.title}
          </div>
        )
      })}
    </section>
  )
}
