import type { Express } from "express";
import Page from "./components/Page.vue";
import type { Render } from "../../src/server/render.js";
import Static from "./components/Static.vue";

export default function entryServer(app: Express, render: Render) {
	app.get("/", async (_req, res) => {
		const body = await render(Page, {
			title: "Hello, Island!",
		});

		res.send(body);
	});

	app.get("/static", async (_req, res) => {
		const body = await render(Static);
		res.send(body);
	});
}
