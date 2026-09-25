import type { ActionCategory, GameAction, GameProject } from './types'
import type { GameState } from './gameState'
import { ActionButton } from './ActionButton'

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
      {visible.map(action => <ActionButton key={action.id} action={action} editable={editable}
        gameState={gameState} project={project} onSelectAction={onSelectAction} onRunAction={onRunAction}/>)}}
    </div>
  </section>
}
