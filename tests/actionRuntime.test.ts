import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActionCategory, GameAction, GameProject, Panel, Resource } from '../src/types'
import { initialGameState } from '../src/gameState'
import { applyActionEffects, canStartAction, completeDueTasks, startAction } from '../src/actionRuntime'
import { placeTaskCategory } from '../src/panelItems'
import { GameCanvas } from '../src/GameCanvas'
import { loadGame, saveGame } from '../src/save'

const energy: Resource = {
  id:'energy', name:'Energy',icon:'⚡',initialValue:2,maxValue:10,unit:'MW',
  displayMode:'bar',initiallyVisible:false,hiddenLayout:'collapse',
}
const category: ActionCategory = {id:'maintenance',name:'Maintenance'}
const charge: GameAction = {
  id:'charge',name:'Charge Power',description:'',categoryId:category.id,
  durationSeconds:0,repeatable:true,initiallyVisible:true,requirements:[],
  effects:[{id:'eff-1',type:'grant-resource',resourceId:energy.id,amount:3}],
}
const defrag: GameAction = {
  ...charge,id:'defrag',name:'Defragment Memory',effects:[{id:'eff-2',type:'add-resource',resourceId:energy.id,amount:2}],
}
const panel: Panel = {
  id:'center',title:'Tasks',slot:'center',backgroundColor:'#101a12',
  textColor:'#d9e4d9',borderColor:'#5f7f68',items:[],
}
const project: GameProject = {
  id:'test-project',version:7,name:'Test',gameSettings:{
    defaultPanelBackgroundColor:'#101a12',defaultPanelTextColor:'#d9e4d9',
    defaultPanelBorderColor:'#5f7f68',
  },panels:[panel],resources:[energy],categories:[category],actions:[charge,defrag],
}

test('grant effect reveals a hidden resource and adds value',()=>{
  const initial=initialGameState(project.resources,project.actions)
  assert.equal(initial.resourceVisibility.energy,false)
  const completed=startAction(charge.id,initial,project)
  assert.equal(completed.resourceValues.energy,5)
  assert.equal(completed.resourceVisibility.energy,true)
})

test('add value is separate from revealing and respects the maximum',()=>{
  const initial=initialGameState(project.resources,project.actions)
  const changed=applyActionEffects(defrag,initial,project)
  assert.equal(changed.resourceValues.energy,4)
  assert.equal(changed.resourceVisibility.energy,false)
  const nearMax={...changed,resourceValues:{energy:9}}
  const capped=applyActionEffects(defrag,nearMax,project)
  assert.equal(capped.resourceValues.energy,10)
})

test('unknown effect target disables task instead of silently succeeding',()=>{
  const broken:GameAction={...charge,effects:[{id:'missing',type:'add-resource',resourceId:'missing',amount:2}]}
  const brokenProject={...project,actions:[broken]}
  assert.equal(canStartAction(broken,initialGameState(project.resources,[broken]),brokenProject),false)
})

test('timed task starts once, completes once, and is saved as a task state',()=>{
  const timed={...charge,durationSeconds:5,repeatable:false}
  const timedProject={...project,actions:[timed]}
  const initial=initialGameState(project.resources,[timed])
  const started=startAction(timed.id,initial,timedProject,1_000)
  assert.equal(started.runningTasks[0].endsAt,6_000)
  assert.equal(started.resourceValues.energy,2)
  assert.equal(canStartAction(timed,started,timedProject),false)
  const done=completeDueTasks(started,timedProject,6_000)
  assert.equal(done.resourceValues.energy,5)
  assert.equal(done.runningTasks.length,0)
  assert.equal(done.completedActions.charge,true)
  assert.equal(canStartAction(timed,done,timedProject),false)
})

test('dropping tasks places their category only once and keeps other resources',()=>{
  const withResource={...panel,items:[{id:'resource-item',type:'resource' as const,resourceId:energy.id}]}
  const first=placeTaskCategory([withResource],charge,panel.id)
  const second=placeTaskCategory(first,defrag,panel.id)
  assert.equal(second[0].items.length,2)
  assert.equal(second[0].items[1].type,'action-category')
  assert.equal(second[0].items[0].type,'resource')
})

test('category subpanel renders both task buttons in one nested group',()=>{
  const placed=placeTaskCategory([panel],charge,panel.id)
  const markup=renderToStaticMarkup(createElement(GameCanvas,{
    panels:placed,resources:project.resources,categories:project.categories,
    actions:project.actions,editable:true,
  }))
  assert.match(markup,/class="action-category"/)
  assert.match(markup,/Maintenance/)
  assert.equal((markup.match(/>Charge Power</g)||[]).length,1)
  assert.equal((markup.match(/>Defragment Memory</g)||[]).length,1)
})

test('version 6 loose task placements migrate to category subpanels',()=>{
  const store=new Map<string,string>()
  Object.defineProperty(globalThis,'localStorage',{
    configurable:true,value:{
      getItem:(key:string)=>store.get(key)??null,
      setItem:(key:string,value:string)=>{store.set(key,value)},
      removeItem:(key:string)=>{store.delete(key)},
    },
  })
  saveGame({...project,version:6,panels:[{...panel,items:[
    {id:'loose-1',type:'action',actionId:charge.id},
    {id:'loose-2',type:'action',actionId:defrag.id},
  ]}]})
  const loaded=loadGame(project.id)
  assert.ok(loaded)
  assert.equal(loaded.panels[0].items.length,1)
  assert.deepEqual(loaded.panels[0].items[0],{
    id:'loose-1',type:'action-category',categoryId:category.id,
  })
})
