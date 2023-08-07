export interface TouchActionEvent extends Event {
  detail?: {
    action: string
    config: {tap_action: ActionConfig}
  }
}

export type HassServiceTarget = {
  entity_id?: string | string[]
  device_id?: string | string[]
  area_id?: string | string[]
}

export interface RestrictionConfig {
  user: string
}

export interface ConfirmationRestrictionConfig {
  text?: string
  exemptions?: RestrictionConfig[]
}

export interface BaseActionConfig {
  action: string
  confirmation?: ConfirmationRestrictionConfig
}

export interface ToggleActionConfig extends BaseActionConfig {
  action: 'toggle'
}

export interface CallServiceActionConfig extends BaseActionConfig {
  action: 'call-service'
  service: string
  target?: HassServiceTarget
  // "service_data" is kept for backwards compatibility. Replaced by "data".
  service_data?: Record<string, unknown>
  data?: Record<string, unknown>
}

export interface NavigateActionConfig extends BaseActionConfig {
  action: 'navigate'
  navigation_path: string
}

export interface UrlActionConfig extends BaseActionConfig {
  action: 'url'
  url_path: string
}

export interface MoreInfoActionConfig extends BaseActionConfig {
  action: 'more-info'
}

export interface AssistActionConfig extends BaseActionConfig {
  action: 'assist'
  pipeline_id?: string
  start_listening?: boolean
}

export interface NoActionConfig extends BaseActionConfig {
  action: 'none'
}

export interface CustomActionConfig extends BaseActionConfig {
  action: 'fire-dom-event'
}

export type ActionConfig =
  | ToggleActionConfig
  | CallServiceActionConfig
  | NavigateActionConfig
  | UrlActionConfig
  | MoreInfoActionConfig
  | AssistActionConfig
  | NoActionConfig
  | CustomActionConfig

export interface InternalConfig {
  swipe_threshold: number
  tap_threshold: number
  tap_timeout: number
  background_color: string
  border_radius: string
  cursor_size: string
  cursor_color: string
}

export interface HaTouchPadConfig {
  swipe_threshold?: number
  tap_threshold?: number
  background_color?: string
  border_radius?: string
  cursor_size?: string
  cursor_color?: string
  tap_timeout?: number
  up_action?: ActionConfig
  down_action?: ActionConfig
  left_action?: ActionConfig
  right_action?: ActionConfig
  tap_action?: ActionConfig
}
