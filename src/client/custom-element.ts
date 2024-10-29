import { createSSRApp, defineCustomElement, h, onMounted, useHost } from 'vue'

const IslandElement = defineCustomElement(
  {
    props: {
      entry: {
        type: String,
        required: true,
      },

      serializedProps: {
        type: String,
        default: '{}',
      },
    },

    setup(props) {
      const host = useHost()!

      onMounted(async () => {
        await hydrate()
      })

      async function hydrate(): Promise<void> {
        const module = await import(/* @vite-ignore */ props.entry)
        const entryComponent = module.default

        const parsedProps = JSON.parse(props.serializedProps)

        const app = createSSRApp(entryComponent, parsedProps)
        app.mount(host)
      }

      return () => h('slot')
    },
  },
  {
    styles: [':host{display:contents;}'],
  },
)

window.customElements.define('vue-island', IslandElement)
