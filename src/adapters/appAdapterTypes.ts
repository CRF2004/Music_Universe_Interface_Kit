import { CameraMode } from '../camera/cameraTypes';
import { InteractionPointDefinition } from '../interaction/interactionTypes';

export interface CommandResult {
  ok: boolean
  message?: string
  data?: any
  error?: string
}

export interface AppPanelProps {
  payload?: any;
  onClose: () => void;
}

export interface AppPanelDefinition {
  id: string
  title: string
  component: React.ComponentType<AppPanelProps>
  preferredCameraMode?: CameraMode
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
}

export interface AppCommandDefinition {
  id: string
  label: string
  description?: string
  run: (payload: any, context: any) => Promise<CommandResult>
}

export interface AppAdapter {
  id: string
  name: string
  version: string

  panels: Record<string, AppPanelDefinition>
  commands: Record<string, AppCommandDefinition>
  dataSources?: Record<string, any>

  getInitialWorld?: () => Promise<any> | any
  onWorldEvent?: (event: any) => void
  resolveToken?: (token: string, context: any) => any
}
