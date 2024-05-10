import {LitElement, html, css, nothing} from 'lit'
import {customElement, property} from 'lit/decorators'
import {ResizeController} from '@lit-labs/observers/resize-controller'
import {HaTouchPadConfig, TouchActionEvent, ActionConfig} from './types'
import baseConfig from './base-config.json'

@customElement('touch-pad')
export class TouchPad extends LitElement {
  static styles = css`
    .touchpad {
      position: relative;
      width: 100%;
      padding-bottom: 100%;
      overflow: hidden;
      touch-action: none;
    }
    .circle {
      position: absolute;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .corner {
      position: absolute;
      display: flex;
    }
    .corner .icon {
      width: 50%;
      height: 50%;
      margin: auto;
    }
    ha-icon {
      fill: currentColor;
      --mdc-icon-size: 100%;
    }
    .feedback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .feedback ha-icon {
      opacity: 0;
      position: absolute;
    }
    @keyframes feedback-fade {
      0%,
      100% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
    }
  `

  @property()
  private _config: HaTouchPadConfig = baseConfig

  _resizeController = new ResizeController(this, {})

  private _circle: HTMLElement
  private _startX: number
  private _startY: number
  private _lastTouch: number
  private _timeout: number
  private _currentAction: string
  private _holdIntervalId: number | undefined
  private _repeatDelayTimeoutId: number | undefined

  private _resetAnimation = (element: HTMLElement) => {
    element.style.animation = 'none'
    element.offsetHeight /* trigger reflow */
    element.style.animation = null
  }

  private _getActionName = (action: ActionConfig) =>
    Object.entries(this._config).find(([, value]) => value === action)?.[0]

  private _fireEvent = (action: ActionConfig) => {
    if (!action) return

    const event: TouchActionEvent = new Event('hass-action', {bubbles: true, composed: true})

    event.detail = {
      config: {tap_action: action},
      action: 'tap',
    }

    this.dispatchEvent(event)

    if (this._config.visual_feedback) {
      const actionName = this._getActionName(action)
      const feedbackElement = this.shadowRoot?.querySelector(`.feedback .${actionName}`)

      if (feedbackElement instanceof HTMLElement) {
        this._resetAnimation(feedbackElement)
        feedbackElement.style.animation = `feedback-fade 0.5s linear`
      }
    }
  }

  private _determineAction = (deltaX: number, deltaY: number) => {
    const {swipe_threshold} = this._config
    const unsignedDeltaX = Math.abs(deltaX)
    const unsignedDeltaY = Math.abs(deltaY)

    if (unsignedDeltaX > unsignedDeltaY && unsignedDeltaX > swipe_threshold) {
      return deltaX > 0 ? 'right_action' : 'left_action'
    } else if (unsignedDeltaY > unsignedDeltaX && unsignedDeltaY > swipe_threshold) {
      return deltaY > 0 ? 'down_action' : 'up_action'
    }
  }

  private _handleTouchStart = (event: TouchEvent) => {
    this._startX = event.changedTouches[0].clientX
    this._startY = event.changedTouches[0].clientY

    this._circle.style.transition = 'none'
  }

  private _handleTouchMove = (event: TouchEvent) => {
    const {clientX, clientY} = event.changedTouches[0]
    const deltaX = clientX - this._startX
    const deltaY = clientY - this._startY
    const action = this._determineAction(deltaX, deltaY)
    const {repeat} = this._config

    // Bind circle coords to touch container
    const maxDeltaX = (this.offsetWidth - this._circle.offsetWidth) / 2
    const maxDeltaY = (this.offsetHeight - this._circle.offsetHeight) / 2
    const left = Math.max(Math.min(deltaX, maxDeltaX), -maxDeltaX)
    const top = Math.max(Math.min(deltaY, maxDeltaY), -maxDeltaY)

    // Update circle as movement occurs
    this._circle.style.left = `calc(50% + ${left}px)`
    this._circle.style.top = `calc(50% + ${top}px)`

    if (repeat && action && action !== this._currentAction) {
      const repeatInterval = typeof repeat === 'number' ? repeat : repeat.interval
      const repeatDelay = typeof repeat === 'number' ? repeat : repeat.delay

      this._currentAction = action

      clearInterval(this._holdIntervalId)
      clearTimeout(this._repeatDelayTimeoutId)

      this._repeatDelayTimeoutId = setTimeout(() => {
        this._fireEvent(this._config[action])

        this._holdIntervalId = setInterval(() => {
          this._fireEvent(this._config[action])
        }, repeatInterval)
      }, repeatDelay)
    }
  }

  private _handleTouchEnd = (event: TouchEvent) => {
    const {clientX, clientY} = event.changedTouches[0]
    const {tap_threshold, tap_timeout} = this._config
    const deltaX = clientX - this._startX
    const deltaY = clientY - this._startY
    const unsignedDeltaX = Math.abs(deltaX)
    const unsignedDeltaY = Math.abs(deltaY)
    const action = this._determineAction(deltaX, deltaY)
    const delay = this._config.double_tap_action ? tap_timeout : 0

    if (unsignedDeltaX < tap_threshold && unsignedDeltaY < tap_threshold) {
      const currentTimestamp = Date.now()
      clearTimeout(this._timeout)
      if (currentTimestamp - this._lastTouch < delay) {
        this._fireEvent(this._config['double_tap_action'])
      } else {
        this._timeout = setTimeout(() => {
          this._fireEvent(this._config['tap_action'])
          clearTimeout(this._timeout)
        }, delay)
      }
      this._lastTouch = currentTimestamp
    } else if (action && !this._holdIntervalId) {
      this._fireEvent(this._config[action])
    }

    this._resetState()
  }

  private _handleCornerMove = (event: TouchEvent) => {
    event.stopPropagation()
  }

  private _handleCorner = (event: TouchEvent) => {
    event.stopPropagation()

    const {corner} = (event.currentTarget as HTMLElement).dataset
    this._fireEvent(this._config.corners[corner].hass_action)

    this._resetState()
  }

  private _resetState = () => {
    // Animate circle back to center after gesture completes
    this._circle.style.transition = 'top 0.5s, left 0.5s'
    this._circle.style.left = '50%'
    this._circle.style.top = '50%'

    clearInterval(this._holdIntervalId)
    this._holdIntervalId = undefined

    clearTimeout(this._repeatDelayTimeoutId)
    this._repeatDelayTimeoutId = undefined

    this._currentAction = null
  }

  setConfig(config: Partial<HaTouchPadConfig> = {}) {
    this._config = {
      ...baseConfig,
      ...config,
    }
  }

  updated() {
    this._circle = this.shadowRoot?.querySelector('.circle') || new HTMLElement()
  }

  render() {
    const {
      border_radius,
      background_color,
      cursor_size,
      cursor_color,
      corners,
      corner_color,
      corner_icon_color,
      corner_size,
      visual_feedback,
    } = this._config

    return html`
      <style>
        .touchpad {
          background-color: ${background_color};
          border-radius: ${border_radius};
        }
        .circle {
          width: ${cursor_size};
          height: ${cursor_size};
          background-color: ${cursor_color};
        }
        .corner {
          width: ${corner_size};
          height: ${corner_size};
          color: ${corner_icon_color};
          background-color: ${corner_color};
        }
        .corner[data-corner='top_left'] {
          top: 0;
          left: 0;
          border-bottom-right-radius: ${border_radius};
        }
        .corner[data-corner='top_right'] {
          top: 0;
          right: 0;
          border-bottom-left-radius: ${border_radius};
        }
        .corner[data-corner='bottom_left'] {
          bottom: 0;
          left: 0;
          border-top-right-radius: ${border_radius};
        }
        .corner[data-corner='bottom_right'] {
          bottom: 0;
          right: 0;
          border-top-left-radius: ${border_radius};
        }
        .feedback ha-icon {
          color: ${visual_feedback?.color || cursor_color};
          width: ${visual_feedback?.size || '100%'};
        }
      </style>
      <div
        class="touchpad"
        @touchstart=${this._handleTouchStart}
        @touchend=${this._handleTouchEnd}
        @touchmove=${this._handleTouchMove}
      >
        ${Object.entries(corners || {}).map(
          ([corner, config]) =>
            html`
              <div
                class="corner"
                data-corner="${corner}"
                @touchend=${this._handleCorner}
                @touchmove=${this._handleCornerMove}
              >
                ${config?.icon &&
                html` <div class="icon"><ha-icon icon="${config.icon}"></ha-icon></div> `}
              </div>
            `
        )}
        <div class="circle"></div>
        ${visual_feedback
          ? html` <div class="feedback">
              <ha-icon class="up_action" icon="mdi:arrow-up"></ha-icon>
              <ha-icon class="down_action" icon="mdi:arrow-down"></ha-icon>
              <ha-icon class="left_action" icon="mdi:arrow-left"></ha-icon>
              <ha-icon class="right_action" icon="mdi:arrow-right"></ha-icon>
              <ha-icon class="tap_action" icon="mdi:gesture-tap"></ha-icon>
              <ha-icon class="double_tap_action" icon="mdi:gesture-double-tap"></ha-icon>
            </div>`
          : nothing}
      </div>
    `
  }
}
