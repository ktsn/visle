import { createSSRApp, App } from 'vue'

import { loadModule } from './load-module.js'

export class VueIsland extends HTMLElement {
  #app: App | null = null

  /**
   * Monotonic counter to invalidate stale async work in connectedCallback.
   * Incremented on each connect and disconnect so that an in-flight import
   * from a previous connection is discarded after it resolves.
   */
  #connectToken = 0

  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = ':host{display:contents}'
    shadow.appendChild(style)

    shadow.appendChild(document.createElement('slot'))
  }

  async connectedCallback(): Promise<void> {
    const token = ++this.#connectToken

    if (this.#app) {
      this.#app.unmount()
      this.#app = null
    }

    const entry = this.getAttribute('entry')
    if (!entry) {
      return
    }

    const serializedProps = this.getAttribute('serialized-props') ?? '{}'

    const module = await loadModule(entry)

    if (token !== this.#connectToken || !this.isConnected) {
      return
    }

    const entryComponent = module.default
    const parsedProps = tryParseProps(serializedProps)

    this.#app = createSSRApp(entryComponent, parsedProps)
    this.#app.mount(this)
  }

  disconnectedCallback(): void {
    this.#connectToken++
    this.#app?.unmount()
    this.#app = null
  }
}

/**
 * Parse serialized props.
 * Return empty object if parsing is failed or parsed value is not an object.
 */
function tryParseProps(serialized: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(serialized)
    return typeof parsed === 'object' && parsed != null ? parsed : {}
  } catch {
    return {}
  }
}

window.customElements.define('vue-island', VueIsland)
