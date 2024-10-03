import { render as renderComponent } from "../../src/render.js";
import Page from "./components/Page.vue";

export async function render(_url: string) {
	return renderComponent(Page, {
		title: "Hello, World!",
	});
}
