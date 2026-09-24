import type { Panel, PanelSlot, Resource } from './types'
import { PANEL_SLOTS } from './layout'
import { findResourcePanel } from './panelItems'
import { ColorField } from './ColorField'

export function Inspector({
  panel,
  resource,
  onUpdatePanel,
  onUpdateResource,
  panels,
  onPlaceResource,
}: {
  panel: Panel | null
  resource: Resource | null
  panels: Panel[]
  onUpdatePanel: (id: string, changes: Partial<Panel>) => void
  onUpdateResource: (id: string, changes: Partial<Resource>) => void
  onPlaceResource: (resourceId: string, panelId: string) => void
}) {
  if (!panel && !resource) {
    return (
      <div className="inspector-empty">
        <div className="inspector-icon">◇</div>
        <strong>Nothing selected</strong>
        <span>Select an element on the canvas to edit its properties.</span>
      </div>
    )
  }

  if (resource) {
    return (
      <div>
        <div className="inspector-field">
          <label>Panel</label>
          <select value={findResourcePanel(panels, resource.id)} onChange={event => onPlaceResource(resource.id, event.target.value)}>
            <option value="">Unassigned</option>
            {panels.map(panel => <option key={panel.id} value={panel.id}>{panel.title}</option>)}
          </select>
        </div>
        <div className="inspector-field">
          <label>Name</label>
          <input
            value={resource.name}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                name: event.target.value,
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Initial value</label>
          <input
            type="number"
            value={resource.initialValue}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                initialValue: Number(event.target.value),
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Maximum value</label>
          <input
            type="number"
            placeholder="No maximum"
            value={resource.maxValue ?? ''}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                maxValue: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Unit</label>
          <input
            value={resource.unit}
            placeholder="%, MW, MB..."
            onChange={(event) =>
              onUpdateResource(resource.id, {
                unit: event.target.value,
              })
            }
          />
        </div>

        <div className="inspector-field">
          <label>Display</label>
          <select
            value={resource.displayMode}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                displayMode: event.target.value as Resource['displayMode'],
              })
            }
          >
            <option value="value">Value</option>
            <option value="value-max">Value / Max</option>
            <option value="bar">Bar</option>
          </select>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={resource.initiallyVisible}
            onChange={(event) =>
              onUpdateResource(resource.id, {
                initiallyVisible: event.target.checked,
              })
            }
          />
          Visible at game start
        </label>
      </div>
    )
  }

  if (!panel) {
    return null
  }

  return (
    <div>
      <div className="inspector-field">
        <label>Title</label>
        <input
          value={panel.title}
          onChange={(event) =>
            onUpdatePanel(panel.id, {
              title: event.target.value,
            })
          }
        />
      </div>

      <div className="inspector-field">
        <label>Slot</label>
        <select
          value={panel.slot}
          onChange={(event) =>
            onUpdatePanel(panel.id, {
              slot: event.target.value as PanelSlot,
            })
          }
        >
          {PANEL_SLOTS.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
      </div>

      <ColorField
        label="Background"
        value={panel.backgroundColor}
        onChange={(value) =>
          onUpdatePanel(panel.id, {
            backgroundColor: value,
          })
        }
      />

      <ColorField
        label="Text"
        value={panel.textColor}
        onChange={(value) =>
          onUpdatePanel(panel.id, {
            textColor: value,
          })
        }
      />

      <ColorField
        label="Border"
        value={panel.borderColor}
        onChange={(value) =>
          onUpdatePanel(panel.id, {
            borderColor: value,
          })
        }
      />
    </div>
  )
}

