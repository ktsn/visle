class VueIsland extends HTMLElement {
  #app: { mount(el: Element): void; unmount(): void } | null = null

  constructor() {
    super()
    this.style.display = 'contents'
  }

  async connectedCallback(): Promise<void> {
    const entry = this.getAttribute('entry')
    if (!entry) {
      return
    }

    const serializedProps = this.getAttribute('serialized-props') ?? '{}'

    const [{ createSSRApp }, module] = await Promise.all([
      import('vue'),
      import(/* @vite-ignore */ entry),
    ])

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
