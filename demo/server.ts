import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
	const app = express();

	const vite = await createViteServer({
		server: { middlewareMode: true },
		appType: "custom",
	});

	app.use(vite.middlewares);

	app.use("*", async (req, res, next) => {
		const url = req.originalUrl;

		try {
			let template = fs.readFileSync(
				path.resolve(__dirname, "index.html"),
				"utf-8",
			);

			template = await vite.transformIndexHtml(url, template);

			const { render } = await vite.ssrLoadModule("./entry-server.ts");

			const appHtml = await render(url);
			const html = template.replace("<!--ssr-outlet-->", appHtml);

			res.status(200).set({ "Content-Type": "text/html" }).end(html);
		} catch (e) {
			vite.ssrFixStacktrace(e as Error);
			next(e);
		}
	});

	return new Promise<void>((resolve) => {
		app.listen(5173, resolve);
	});
}

createServer().then(() => {
	console.log("Server running on http://localhost:5173");
});
