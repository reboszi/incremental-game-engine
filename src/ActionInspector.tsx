import type { ActionCategory, ActionEffect, GameAction, Panel, Resource } from './types'

type Props = {
  category: ActionCategory | null
  action: GameAction | null
  categories: ActionCategory[]
  actions: GameAction[]
  panels: Panel[]
  resources: Resource[]
  updateCategory: (id: string, name: string) => void
  updateAction: (id: string, patch: Partial<GameAction>) => void
  toggleCategoryPanel: (categoryId: string, panelId: string, checked: boolean) => void
  toggleActionPanel: (actionId:string,panelId:string,checked:boolean)=>void
}

export function ActionInspector({category, action, categories, actions, panels, resources, updateCategory, updateAction, toggleCategoryPanel,toggleActionPanel}: Props) {
  if (category) return <div>
    <div className="inspector-field"><label>Category name</label>
      <input value={category.name} onChange={event => updateCategory(category.id,event.target.value)} /></div>
    <div className="inspector-field"><label>Show category on panels</label>
      {panels.map(panel => <label className="checkbox-field" key={panel.id}>
        <input type="checkbox" checked={panel.items.some(item => item.type === 'action-category' && item.categoryId === category.id)}
          onChange={event => toggleCategoryPanel(category.id,panel.id,event.target.checked)} />{panel.title}
      </label>)}
      {!panels.length && <span className="muted">Create a panel first.</span>}
    </div>
    <p className="muted">This is a subpanel with its own title and horizontal, wrapping task buttons. Drag a task onto another category in Project to regroup it.</p>
  </div>
  if (!action) return null

  const patchEffect = (id: string, changes: Partial<ActionEffect>) => updateAction(action.id, {
    effects: action.effects.map(effect => effect.id === id ? {...effect,...changes} as ActionEffect : effect),
  })
  const addEffect = () => updateAction(action.id, {effects:[...action.effects,{
    id:crypto.randomUUID(),type:'add-resource',resourceId:resources[0]?.id ?? '',amount:1,
  }]})

  return <div>
    <div className="inspector-field"><label>Action name</label>
      <input value={action.name} onChange={event => updateAction(action.id,{name:event.target.value})}/></div>
    <div className="inspector-field"><label>Description</label>
      <input value={action.description} onChange={event => updateAction(action.id,{description:event.target.value})}/></div>
    <div className="inspector-field"><label>Show this task's category on panels</label>
      {panels.map(panel=><label className="checkbox-field" key={panel.id}>
        <input type="checkbox"
          checked={panel.items.some(item=>item.type==='action-category'&&item.categoryId===action.categoryId)}
          onChange={event=>toggleActionPanel(action.id,panel.id,event.target.checked)}/>
        {panel.title}
      </label>)}
      {!panels.length && <span className="muted">Create a panel first.</span>}
      <span className="muted">The category is a subpanel: placing this task on a panel displays every task in its category together. Drag the task or category from Project.</span>
    </div>
    <div className="inspector-field"><label>Category</label><select value={action.categoryId}
      onChange={event => updateAction(action.id,{categoryId:event.target.value})}>
      {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></div>
    <div className="inspector-field"><label>Duration (seconds; 0 = immediate)</label>
      <input type="number" min="0" step="0.1" value={action.durationSeconds}
        onChange={event => updateAction(action.id,{durationSeconds:Math.max(0,Number(event.target.value)||0)})}/></div>
    <label className="checkbox-field"><input type="checkbox" checked={action.repeatable}
      onChange={event => updateAction(action.id,{repeatable:event.target.checked})}/>Repeatable</label>
    <label className="checkbox-field"><input type="checkbox" checked={action.initiallyVisible}
      onChange={event => updateAction(action.id,{initiallyVisible:event.target.checked})}/>Visible at game start</label>

    <h4>Requirements (all must be met)</h4>
    {action.requirements.map(requirement => <div className="action-editor-line" key={requirement.id}>
      <select value={requirement.resourceId} onChange={event => updateAction(action.id,{requirements:action.requirements.map(item =>
        item.id===requirement.id ? {...item,resourceId:event.target.value} : item)})}>
        <option value="">Choose resource</option>{resources.map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
      </select>
      <input type="number" aria-label="Minimum" value={requirement.minimum}
        onChange={event => updateAction(action.id,{requirements:action.requirements.map(item =>
          item.id===requirement.id ? {...item,minimum:Number(event.target.value)||0} : item)})}/>
      <button type="button" onClick={() => updateAction(action.id,{requirements:action.requirements.filter(item=>item.id!==requirement.id)})}>×</button>
    </div>)}
    <button className="tool-button" type="button" disabled={!resources.length} onClick={() => updateAction(action.id,{
      requirements:[...action.requirements,{id:crypto.randomUUID(),resourceId:resources[0].id,minimum:1}],
    })}>+ Requirement</button>

    <h4>Effects (on completion)</h4>
    {action.effects.map(effect => <div key={effect.id} className="action-effect-editor">
      <div className="action-editor-line">
        <select value={effect.type} aria-label="Effect type" onChange={event => {
          const type=event.target.value as ActionEffect['type']
          const replacement: ActionEffect = type==='add-resource'||type==='set-resource'
            ? {id:effect.id,type,resourceId:resources[0]?.id??'',amount:1}
            : type==='reveal-action'||type==='hide-action'
              ? {id:effect.id,type,actionId:actions.find(item=>item.id!==action.id)?.id??''}
              : {id:effect.id,type,resourceId:resources[0]?.id??''}
          updateAction(action.id,{effects:action.effects.map(item=>item.id===effect.id?replacement:item)})
        }}>
          <option value="add-resource">Add resource value</option>
          <option value="set-resource">Set resource value</option>
          <option value="reveal-resource">Reveal resource</option>
          <option value="hide-resource">Hide resource</option>
          <option value="reveal-action">Reveal action</option>
          <option value="hide-action">Hide action</option>
        </select>
        <button type="button" title="Remove effect" onClick={() => updateAction(action.id,{effects:action.effects.filter(item=>item.id!==effect.id)})}>×</button>
      </div>
      {'resourceId' in effect && <select value={effect.resourceId} onChange={event => patchEffect(effect.id,{resourceId:event.target.value})}>
        <option value="">Choose resource</option>{resources.map(resource=><option key={resource.id} value={resource.id}>{resource.name}</option>)}
      </select>}
      {'actionId' in effect && <select value={effect.actionId} onChange={event=>patchEffect(effect.id,{actionId:event.target.value})}>
        <option value="">Choose action</option>{actions.filter(item=>item.id!==action.id).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>}
      {'amount' in effect && <input type="number" aria-label="Amount" value={effect.amount} onChange={event=>patchEffect(effect.id,{amount:Number(event.target.value)||0})}/>}
    </div>)}
    <button className="tool-button" type="button" onClick={addEffect}>+ Effect</button>
  </div>
}
