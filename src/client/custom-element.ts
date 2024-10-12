import { createSSRApp, defineCustomElement, h, onMounted, useHost } from "vue";

export function registerIslandElement(
	importer: (componentPath: string) => Promise<any>,
): void {
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
				const host = useHost();

				onMounted(async () => {
					const module = await importer(props.entry);
					const entryComponent = module.default;

					const parsedProps = props.serializedProps
						? JSON.parse(props.serializedProps)
						: {};

					const app = createSSRApp(entryComponent, parsedProps);
					app.mount(host!);
				});

				return () => h("slot");
			},
		},
		{
			styles: [":host{display:contents;}"],
		},
	);

	window.customElements.define("vue-island", IslandElement);
}
