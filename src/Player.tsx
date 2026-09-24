import { GameCanvas } from './GameCanvas'
import { loadGame } from './save'

export function Player({ projectId }: { projectId: string }) {
  const project = loadGame(projectId)

  if (!project) {
    return (
      <main className="player-shell player-error">
        <h1>Game not found</h1>
        <p>This game is not saved in this browser.</p>
      </main>
    )
  }

  return (
    <main className="player-shell">
      <GameCanvas panels={project.panels} resources={project.resources} editable={false} />
    </main>
  )
}
