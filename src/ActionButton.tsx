import type { GameAction, GameProject } from './types'
import type { GameState } from './gameState'
import { canStartAction } from './actionRuntime'

export function ActionButton({action,editable,gameState,project,onSelectAction,onRunAction}: {
  action: GameAction
  editable: boolean
  gameState?: GameState
  project?: GameProject
  onSelectAction?: (id:string)=>void
  onRunAction?: (id:string)=>void
}) {
  const running = gameState?.runningTasks.find(task=>task.actionId===action.id)
  const enabled = editable || (!!gameState && !!project && canStartAction(action,gameState,project))
  return <button type="button" className="action-button" title={action.description || action.name}
    disabled={!enabled}
    onClick={event => {event.stopPropagation();if(editable)onSelectAction?.(action.id);else onRunAction?.(action.id)}}>
    <span>{action.name}</span>
    {running && <small>Running…</small>}
    {!running && action.durationSeconds>0 && <small>{action.durationSeconds}s</small>}
  </button>
}
