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

export type Panel = {
  id: string
  title: string
  slot: PanelSlot
  backgroundColor: string
  textColor: string
  borderColor: string
}

export type GameProject = {
  id: string
  version: number
  name: string
  gameSettings: GameSettings
  panels: Panel[]
}

export type ProjectSummary = {
  id: string
  name: string
  updatedAt: string
}
