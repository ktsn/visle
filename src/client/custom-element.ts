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

    const strategy = this.getAttribute('strategy') ?? 'load'

    if (strategy === 'visible') {
      await this.#waitForVisible()
      if (token !== this.#connectToken || !this.isConnected) {
        return
      }
    }

    const importedName = this.getAttribute('imported-name') ?? 'default'

    const module = await loadModule(entry)

    if (token !== this.#connectToken || !this.isConnected) {
      return
    }

    const entryComponent = module[importedName]
    if (!entryComponent) {
      console.error(`[visle] Export "${importedName}" not found in module "${entry}"`)
      return
    }

    const parsedProps = safeParseObject(this.getAttribute('serialized-props'))

    this.#app = createSSRApp(entryComponent, parsedProps)
    this.#app.mount(this)
  }

  #waitForVisible(): Promise<void> {
    const rootMargin = safeParseObject(this.getAttribute('options'))?.rootMargin as
      | string
      | undefined
    return new Promise((resolve) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect()
            resolve()
          }
        },
        rootMargin ? { rootMargin } : undefined,
      )
      // The host element uses display:contents and has no layout box,
      // so observe the first light-DOM child which has actual dimensions.
      observer.observe(this.firstElementChild ?? this)
    })
  }

  disconnectedCallback(): void {
    this.#connectToken++
    this.#app?.unmount()
    this.#app = null
  }
}

/**
 * Parse a JSON string as an object, returning an empty object if
 * parsing fails or the parsed value is not an object.
 */
function safeParseObject(value: string | null): Record<string, unknown> {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed != null ? parsed : {}
  } catch {
    return {}
  }
}

window.customElements.define('vue-island', VueIsland)
