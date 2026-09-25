import { useEffect, useState } from 'react'
import { GameCanvas } from './GameCanvas'
import { loadGame } from './save'
import { clampResourceValue, initialGameState, loadGameState, saveGameState, setResourceVisibility } from './gameState'
import type { GameState } from './gameState'
import { completeDueTasks, startAction } from './actionRuntime'

export function Player({ projectId }: { projectId: string }) {
  const [project] = useState(() => loadGame(projectId))
  const [gameState, setGameState] = useState<GameState>(() =>
    project ? loadGameState(project.id, project.resources, project.actions) : { resourceValues: {}, resourceVisibility: {}, actionVisibility: {}, completedActions: {}, runningTasks: [] })
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    if (!project) return
    try {
      saveGameState(project.id, gameState)
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }, [project, gameState])

  useEffect(() => {
    if (!project) return
    const interval = window.setInterval(() => setGameState(current => completeDueTasks(current, project)), 250)
    return () => window.clearInterval(interval)
  }, [project])

  if (!project) {
    return (
      <main className="player-shell player-error">
        <h1>Game not found</h1>
        <p>This game is not saved in this browser.</p>
      </main>
    )
  }

  const adjust = (resourceId: string, difference: number) => {
    const resource = project.resources.find(item => item.id === resourceId)
    if (!resource) return
    setGameState(previous => ({
      ...previous,
      resourceValues: {
        ...previous.resourceValues,
        [resourceId]: clampResourceValue(resource,
          (previous.resourceValues[resourceId] ?? resource.initialValue) + difference),
      },
    }))
  }

  const reset = () => {
    if (!window.confirm('Reset all resource values and visibility to their initial state?')) return
    setGameState(initialGameState(project.resources, project.actions))
  }

  return (
    <main className="player-shell">
      <GameCanvas
        panels={project.panels}
        resources={project.resources}
        resourceValues={gameState.resourceValues}
        resourceVisibility={gameState.resourceVisibility}
        categories={project.categories}
        actions={project.actions}
        gameState={gameState}
        project={project}
        onRunAction={(id) => setGameState(current => startAction(id, current, project))}
        editable={false}
      />
      <details className="runtime-test-panel">
        <summary>Runtime test controls</summary>
        <div className="runtime-test-body">
          <p>Temporary controls: adjust resource values and simulate Reveal/Hide effects. Both are saved separately from the editor project.</p>
          {project.resources.length === 0 && <p>No resources in this game yet.</p>}
          {project.resources.map(resource => (
            <div key={resource.id} className="runtime-test-row">
              <span className="runtime-test-label">{resource.icon || '◇'} {resource.name}
                {!resource.initiallyVisible && <small> (hidden at start)</small>}
              </span>
              <button type="button" onClick={() => adjust(resource.id, -10)}>−10</button>
              <button type="button" onClick={() => adjust(resource.id, -1)}>−1</button>
              <strong>{gameState.resourceValues[resource.id] ?? resource.initialValue}</strong>
              <button type="button" onClick={() => adjust(resource.id, 1)}>+1</button>
              <button type="button" onClick={() => adjust(resource.id, 10)}>+10</button>
              <button type="button" className="runtime-visibility-button"
                aria-pressed={gameState.resourceVisibility[resource.id] ?? resource.initiallyVisible}
                onClick={() => setGameState(previous =>
                  setResourceVisibility(previous, resource.id,
                    !(previous.resourceVisibility[resource.id] ?? resource.initiallyVisible)))}>
                {(gameState.resourceVisibility[resource.id] ?? resource.initiallyVisible) ? 'Hide' : 'Reveal'}
              </button>
            </div>
          ))}
          <button className="runtime-reset" type="button" onClick={reset}>Reset values and visibility</button>
          {saveError && <p role="alert">Unable to save player progress in this browser.</p>}
        </div>
      </details>
    </main>
  )
}
