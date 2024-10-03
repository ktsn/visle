import { createSSRApp, defineCustomElement, h, onMounted, useHost } from "vue";

const IslandElement = defineCustomElement({
	props: {
		entry: {
			type: String,
			required: true,
		},
	},

	setup(props) {
		const host = useHost();

		onMounted(async () => {
			const entryComponent = (
				await import(`./components/${props.entry}.client.vue`)
			).default;

			const app = createSSRApp(entryComponent);
			app.mount(host!);
		});

		return () => h("slot");
	},
});

window.customElements.define("vue-island", IslandElement);
