import {LitElement, html} from 'lit'
import {customElement, property} from 'lit/decorators'
import {camelCase} from 'lodash'

@customElement('ha-icon')
class HaIcon extends LitElement {
  @property()
  private _icons: object

  @property({attribute: true})
  icon: string

  constructor() {
    super()
    import('@mdi/js').then((icons) => {
      this._icons = icons
    })
  }

  render() {
    const icon = this._icons?.[camelCase(this.icon.replace(':', '-'))]

    if (!icon) return null

    return html`<svg viewbox="0 0 24 24">
      <path d="${icon}" />
    </svg>`
  }
}
