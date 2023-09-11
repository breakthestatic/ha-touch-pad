import {LitElement, html, css} from 'lit'
import {customElement, property} from 'lit/decorators'
import {ResizeController} from '@lit-labs/observers/resize-controller'
import {
  InternalConfig,
  HaTouchPadConfig,
  TouchActionEvent,
  ActionConfig,
  TouchPadEvent,
} from './types'
import baseConfig from './base-config.json'

@customElement('touch-pad')
class TouchPad extends LitElement {
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
    .corner ha-icon {
      --mdc-icon-size: 100%;
    }
  `

  @property()
  private _config: InternalConfig = baseConfig

  _resizeController = new ResizeController(this, {})

  private _circle: HTMLElement
  private _startX: number
  private _startY: number
  private _lastTouch: number
  private _timeout: number

  private _fireEvent = (action: ActionConfig) => {
    if (!action) return

    const event: TouchActionEvent = new Event('hass-action', {bubbles: true, composed: true})

    event.detail = {
      config: {tap_action: action},
      action: 'tap',
    }

    this.dispatchEvent(event)
  }

  private _handleTouchStart = (event: TouchEvent) => {
    this._startX = event.changedTouches[0].clientX
    this._startY = event.changedTouches[0].clientY

    this._circle.style.transition = 'none'
  }

  private _handleTouchMove = (event: TouchEvent) => {
    const {clientX, clientY} = event.changedTouches[0]

    // Bind circle coords to touch container
    const maxDeltaX = (this.offsetWidth - this._circle.offsetWidth) / 2
    const maxDeltaY = (this.offsetHeight - this._circle.offsetHeight) / 2
    const left = Math.max(Math.min(clientX - this._startX, maxDeltaX), -maxDeltaX)
    const top = Math.max(Math.min(clientY - this._startY, maxDeltaY), -maxDeltaY)

    // Update circle as movement occurs
    this._circle.style.left = `calc(50% + ${left}px)`
    this._circle.style.top = `calc(50% + ${top}px)`
  }

  private _handleTouchEnd = (event: TouchPadEvent) => {
    // Ignore events from corners
    if (event.target.closest('.corner')) return

    const {clientX, clientY} = event.changedTouches[0]
    const {swipe_threshold, tap_threshold, tap_timeout} = this._config
    const rawDeltaX = clientX - this._startX
    const rawDeltaY = clientY - this._startY
    const deltaX = Math.abs(rawDeltaX)
    const deltaY = Math.abs(rawDeltaY)

    // Animate circle back to center after gesture completes
    this._circle.style.transition = 'top 0.5s, left 0.5s'
    this._circle.style.left = '50%'
    this._circle.style.top = '50%'

    if (deltaX < tap_threshold && deltaY < tap_threshold) {
      const currentTimestamp = Date.now()
      clearTimeout(this._timeout)
      if (currentTimestamp - this._lastTouch < tap_timeout) {
        this._fireEvent(this._config['double_tap_action'])
      } else {
        this._timeout = setTimeout(() => {
          this._fireEvent(this._config['tap_action'])
          clearTimeout(this._timeout)
        }, tap_timeout)
      }
      this._lastTouch = currentTimestamp
    } else if (deltaX > deltaY && deltaX > swipe_threshold) {
      this._fireEvent(this._config[rawDeltaX > 0 ? 'right_action' : 'left_action'])
    } else if (deltaY > deltaX && deltaY > swipe_threshold) {
      this._fireEvent(this._config[rawDeltaY > 0 ? 'down_action' : 'up_action'])
    }
  }

  private _handleCorner(event: MouseEvent) {
    const {corner} = (event.currentTarget as HTMLElement).dataset
    this._fireEvent(this._config.corners[corner].hass_action)
  }

  setConfig(config: HaTouchPadConfig = {}) {
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
      corner_size,
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
      </style>
      <div
        class="touchpad"
        @touchstart=${this._handleTouchStart}
        @touchend=${this._handleTouchEnd}
        @touchmove=${this._handleTouchMove}
      >
        ${Object.entries(corners || {}).map(
          ([corner, config]) =>
            html`<div class="corner" data-corner="${corner}" @click=${this._handleCorner}>
          ${
            config?.icon &&
            html`<div class="icon">
              <ha-icon icon="${config.icon}"></ha-icon>
            </div>`
          }
          </div>
        </div>`
        )}
        <div class="circle" />
      </div>
    `
  }
}
