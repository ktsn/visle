import { createSSRApp, App } from 'vue'

class VueIsland extends HTMLElement {
  #app: App | null = null

  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = ':host{display:contents}'
    shadow.appendChild(style)

    shadow.appendChild(document.createElement('slot'))
  }

  async connectedCallback(): Promise<void> {
    const entry = this.getAttribute('entry')
    if (!entry) {
      return
    }

    const serializedProps = this.getAttribute('serialized-props') ?? '{}'

    const module = await import(/* @vite-ignore */ entry)
    const entryComponent = module.default
    const parsedProps = JSON.parse(serializedProps)

    this.#app = createSSRApp(entryComponent, parsedProps)
    this.#app.mount(this)
  }

  disconnectedCallback(): void {
    this.#app?.unmount()
    this.#app = null
  }
}

window.customElements.define('vue-island', VueIsland)
