import { defineCustomElement, h } from "vue";

const IslandElement = defineCustomElement({
	render: () => h("slot"),
});

window.customElements.define("vue-island", IslandElement);
