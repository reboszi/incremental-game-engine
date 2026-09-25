export type GameSettings = {
  defaultPanelBackgroundColor: string
  defaultPanelTextColor: string
  defaultPanelBorderColor: string
}

export type PanelSlot =
  | 'top'
  | 'top-inner'
  | 'left-outer'
  | 'left-inner'
  | 'center'
  | 'right-inner'
  | 'right-outer'
  | 'bottom-inner'
  | 'bottom'

export type PanelItem =
  | {
      id: string
      type: 'resource'
      resourceId: string
    }

export type Panel = {
  id: string
  title: string
  slot: PanelSlot
  backgroundColor: string
  textColor: string
  borderColor: string
  items: PanelItem[]
}

export type ResourceDisplayMode = 'value' | 'value-max' | 'bar'
export type HiddenLayout = 'collapse' | 'reserve'

export type Resource = {
  id: string
  name: string
  icon: string
  initialValue: number
  maxValue: number | null
  unit: string
  displayMode: ResourceDisplayMode
  initiallyVisible: boolean
  hiddenLayout: HiddenLayout
}

export type GameProject = {
  id: string
  version: number
  name: string
  gameSettings: GameSettings
  panels: Panel[]
  resources: Resource[]
}

export type ProjectSummary = {
  id: string
  name: string
  updatedAt: string
}
