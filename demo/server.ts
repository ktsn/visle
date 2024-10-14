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
