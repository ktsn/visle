import { type Connect, createServer as createViteServer } from "vite";
import path from "node:path";
import { cwd } from "node:process";
import { render as baseRender } from "./render.js";

export interface Options {
	serverEntry: string;
	renderTemplate?: (body: string) => string;
	development?: boolean;
}

export interface Island {
	entryModule: any;
	render: typeof baseRender;
	middlewares: Connect.Server | null;
}

export async function createIsland({
	serverEntry,
	renderTemplate = (body) => body,
	development = false,
}: Options): Promise<Island> {
	const server = await createServer({ development });

	try {
		const ssrOutlet = "<!--ssr-outlet-->";
		const template = await server.transformIndexHtml(
			"/",
			renderTemplate(ssrOutlet),
		);

		const entryModule = await server.ssrLoadModule(serverEntry);

		const render = (async (component, props) => {
			const rendered = await baseRender(component, props);
			return template.replace(ssrOutlet, rendered);
		}) as typeof baseRender;

		return {
			entryModule,
			render,
			middlewares: server.middlewares,
		};
	} catch (e) {
		server.ssrFixStacktrace(e as Error);
		throw e;
	}
}

interface InnerServer {
	middlewares: Connect.Server | null;
	transformIndexHtml: (url: string, template: string) => Promise<string>;
	ssrLoadModule: (module: string) => Promise<any>;
	ssrFixStacktrace: (error: Error) => void;
}

async function createServer({
	development,
}: { development: boolean }): Promise<InnerServer> {
	if (development) {
		return createViteServer({
			server: { middlewareMode: true },
			appType: "custom",
		});
	}

	return {
		middlewares: null,
		transformIndexHtml: async (_url: string, template: string) => template,
		ssrLoadModule: (module: string) => import(path.resolve(cwd(), module)),
		ssrFixStacktrace: () => {},
	};
}
