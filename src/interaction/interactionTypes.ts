import { CameraMode } from '../camera/cameraTypes';

export type InteractionKind =
  | 'dialog'
  | 'panel'
  | 'command'
  | 'route'
  | 'agent'
  | 'inspect'
  | 'custom'

export type TriggerKind =
  | 'proximity'
  | 'click'
  | 'hotkey'
  | 'collision'
  | 'zone-enter'
  | 'zone-exit'
  | 'scripted'

export interface InteractionCondition {
  type:
    | 'flag'
    | 'app-state'
    | 'inventory'
    | 'permission'
    | 'custom'
  key: string
  operator?: 'equals' | 'not-equals' | 'exists' | 'includes' | 'gt' | 'lt'
  value?: any
}

export interface InteractionActionDefinition {
  id: string
  type: InteractionKind
  target?: string
  payload?: Record<string, any>
  closeOnComplete?: boolean
  cameraMode?: CameraMode
  conditions?: InteractionCondition[]
}

export interface InteractionTriggerDefinition {
  type: TriggerKind
  enabled?: boolean
  prompt?: string
  hotkey?: string
  radius?: number
  once?: boolean
  cooldownMs?: number
  conditions?: InteractionCondition[]
  metadata?: Record<string, any>
}

export type BuiltInVisualType =
  | 'npc'
  | 'phone-booth'
  | 'vehicle'
  | 'building'
  | 'portal'
  | 'crate'

export interface InteractionVisualDefinition {
  type: BuiltInVisualType | (string & {})
  modelUrl?: string
  icon?: string
  colorToken?: string
  outline?: boolean
  hoverAnimation?: 'bounce' | 'pulse' | 'shake' | 'none'
  prompt?: string
  labelVisible?: 'always' | 'nearby' | 'hover' | 'never'
}

export interface InteractionPointDefinition {
  id: string
  label: string
  description?: string

  kind: InteractionKind
  group?: string
  tags?: string[]

  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]

  radius?: number
  priority?: number
  enabled?: boolean
  visible?: boolean

  visual: InteractionVisualDefinition
  triggers: InteractionTriggerDefinition[]
  actions: InteractionActionDefinition[]

  metadata?: Record<string, any>
}
