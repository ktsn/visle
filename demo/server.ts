import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
	const app = express();

	const vite = await createViteServer({
		server: { middlewareMode: true },
		appType: "custom",
	});

	app.use(vite.middlewares);

	app.get("/", async (req, res, next) => {
		const url = req.originalUrl;

		try {
			const htmlFilePath = isProd ? "client-dist/index.html" : "index.html";

			let template = fs.readFileSync(
				path.resolve(__dirname, htmlFilePath),
				"utf-8",
			);

			if (!isProd) {
				template = await vite.transformIndexHtml(url, template);
			}

			const { render } = isProd
				? await import("./server-dist/entry-server.js")
				: await vite.ssrLoadModule("./entry-server.ts");

			const appHtml = await render(url);
			const html = template.replace("<!--ssr-outlet-->", appHtml);

			res.status(200).set({ "Content-Type": "text/html" }).end(html);
		} catch (e) {
			vite.ssrFixStacktrace(e as Error);
			next(e);
		}
	});

	if (isProd) {
		app.use(express.static(path.resolve(__dirname, "client-dist")));
	}

	return new Promise<void>((resolve) => {
		app.listen(5173, resolve);
	});
}

createServer().then(() => {
	console.log("Server running on http://localhost:5173");
});
