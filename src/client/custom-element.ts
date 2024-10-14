import { createSSRApp, defineCustomElement, h, onMounted, useHost } from "vue";

const IslandElement = defineCustomElement(
	{
		props: {
			entry: {
				type: String,
				required: true,
			},

			serializedProps: {
				type: String,
			},
		},

		setup(props) {
			const host = useHost()!;

			onMounted(async () => {
				const inAnotherIsland = host.parentElement?.closest("vue-island");
				if (inAnotherIsland) {
					// Remove island custom element to let the root island handle the hydration.
					// Since `hydrate` is async function, hydration occurs after all descendants
					// executed `removeIslandElement`.
					removeIslandElement();
				} else {
					// Hydrate the component if the island is the root.
					await hydrate();
				}
			});

			function removeIslandElement(): void {
				const hostParent = host.parentElement;
				if (!hostParent) {
					host.remove();
					return;
				}

				for (const child of host.childNodes) {
					hostParent.insertBefore(child, host);
				}
				host.remove();
			}

			async function hydrate(): Promise<void> {
				const module = await import(/* @vite-ignore */ props.entry);
				const entryComponent = module.default;

				const parsedProps = props.serializedProps
					? JSON.parse(props.serializedProps)
					: {};

				const app = createSSRApp(entryComponent, parsedProps);
				app.mount(host);
			}

			return () => h("slot");
		},
	},
	{
		styles: [":host{display:contents;}"],
	},
);

window.customElements.define("vue-island", IslandElement);
