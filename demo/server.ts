import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createIsland } from "../dist/server/index.js";

const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
	const app = express();

	const island = await createIsland({
		development: !isProd,

		serverEntry: isProd
			? "./server-dist/entry-server.js"
			: "./src/entry-server.ts",

		renderTemplate: (body, clientComponentUsed) => {
			const clientEntry = isProd ? "/entry-client.js" : "/src/entry-client.ts";
			const entryScript = clientComponentUsed
				? `<script type="module" src="${clientEntry}" defer async></script>`
				: "";

			return `${body}${entryScript}`;
		},
	});

	if (island.middlewares) {
		app.use(island.middlewares);
	}

	if (isProd) {
		app.use(express.static(path.resolve(__dirname, "client-dist")));
	}

	island.entryModule.default(app, island.render);

	return new Promise<void>((resolve) => {
		app.listen(5173, resolve);
	});
}

createServer().then(() => {
	console.log("Server running on http://localhost:5173");
});
