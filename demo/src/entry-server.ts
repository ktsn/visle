import type { Express } from "express";
import Page from "./components/Page.vue";
import type { Render } from "../../src/server/render.js";

export default function entryServer(app: Express, render: Render) {
	app.get("/", async (_req, res) => {
		const body = await render(Page, {
			title: "Hello, Island!",
		});

		res.send(body);
	});
}
