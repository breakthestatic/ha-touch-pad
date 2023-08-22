import yaml from 'js-yaml'
import debounce from './debounce'
import defaultConfig from './default.yaml'
import './ha-icon'

const touchPad = document.querySelector('touch-pad')
const textarea = document.querySelector('textarea')

let timeout

const handleChange = (event) => {
  try {
    clearTimeout(timeout)
    const config = yaml.load(event.target.value)
    touchPad.setConfig(config)
  } catch (error) {
    // Ignore YAML errors while still typing (longer timeout than debounced input)
    if (error.name !== 'YAMLException') throw error

    timeout = setTimeout(() => {
      console.log(error)
    }, 2000)
  }
}

touchPad.setConfig(defaultConfig)
touchPad.addEventListener('hass-action', (event) => {
  console.log(event)
})

textarea.addEventListener('input', debounce(handleChange, 500))
textarea.value = yaml.dump(defaultConfig)
