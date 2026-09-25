import type { ActionCategory, GameAction, GameProject } from './types'
import type { GameState } from './gameState'
import { canStartAction } from './actionRuntime'

export function ActionCategoryView({
  category, actions, editable, gameState, project, onSelectAction, onRunAction,
}: {
  category: ActionCategory
  actions: GameAction[]
  editable: boolean
  gameState?: GameState
  project?: GameProject
  onSelectAction?: (id: string) => void
  onRunAction?: (id: string) => void
}) {
  const visible = actions.filter(action => editable || (gameState?.actionVisibility[action.id] ?? action.initiallyVisible))
  if (!editable && visible.length === 0) return null
  return <section className="action-category">
    <div className="action-category-title">{category.name}</div>
    <div className="action-button-row">
      {visible.map(action => {
        const running = gameState?.runningTasks.find(task => task.actionId === action.id)
        const enabled = editable || (!!gameState && !!project && canStartAction(action, gameState, project))
        return <button key={action.id} type="button" className="action-button"
          title={action.description || action.name}
          disabled={!enabled}
          onClick={event => {event.stopPropagation(); if(editable) onSelectAction?.(action.id); else onRunAction?.(action.id)}}>
          <span>{action.name}</span>
          {running && <small>Running…</small>}
          {!running && action.durationSeconds > 0 && <small>{action.durationSeconds}s</small>}
        </button>
      })}
    </div>
  </section>
}
