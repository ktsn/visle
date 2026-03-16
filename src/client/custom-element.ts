import { createSSRApp, App } from 'vue'

import { loadModule } from './load-module.js'
import { strategies } from './strategy/index.js'
import { load } from './strategy/load.js'

/**
 * Define when the island wrapper mount (hydrate) slotted component.
 */
export interface IslandStrategy {
  /**
   * Called when the island wrapper schedules to mount the island component.
   * Each strategy implments this function to control when to mount by calling
   * onReady callback
   *
   * @param wrapper Island wrapper element
   * @param onReady Callback function to be called when the island is ready to mount
   * @return Cleanup function of scheduling
   */
  schedule: (wrapper: VueIsland, onReady: () => void) => (() => void) | undefined
}

export class VueIsland extends HTMLElement {
  #app: App | undefined
  #cleanupSchedule: (() => void) | undefined

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

    this.#cleanup()

    const entry = this.getAttribute('entry')
    if (!entry) {
      return
    }

    const strategyName = this.getAttribute('strategy') ?? 'load'

    let strategy = strategies[strategyName]
    if (!strategy) {
      console.warn(
        `[visle] Unknown strategy v-client:${strategyName}. Falling back to v-client:load.`,
      )
      strategy = load
    }

    this.#cleanupSchedule = strategy.schedule(this, async () => {
      if (this.#connectCancelled(token)) {
        return
      }

      const module = await loadModule(entry)

      if (this.#connectCancelled(token)) {
        return
      }

      const importedName = this.getAttribute('imported-name') ?? 'default'
      const entryComponent = module[importedName]
      if (!entryComponent) {
        console.error(`[visle] Export "${importedName}" not found in module "${entry}"`)
        return
      }

      const parsedProps = safeParseObject(this.getAttribute('serialized-props'))

      this.#app = createSSRApp(entryComponent, parsedProps)
      this.#app.mount(this)
    })
  }

  disconnectedCallback(): void {
    this.#connectToken++
    this.#cleanup()
  }

  /**
   * Return true if the current connectedCallback is cancelled .
   * @param token Unique integer generated for each connectedCallback call
   */
  #connectCancelled(token: number): boolean {
    return token !== this.#connectToken || !this.isConnected
  }

  #cleanup(): void {
    this.#cleanupSchedule?.()
    this.#app?.unmount()
    this.#app = this.#cleanupSchedule = undefined
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
