import type { Plugin, ResolvedConfig, Manifest } from "vite";
import path from "node:path";
import fs from "node:fs";
import { cwd } from "node:process";
import { globSync } from "glob";

export interface IslandPluginOptions {
	clientDist: string;
	serverDist: string;
	islandDirectory: string;
}

const virtualCustomElementEntryPath = "/@entry-custom-element";

const customElementPath = path.resolve(
	import.meta.dirname,
	"../client/custom-element.js",
);

export default function islandPlugin(options: IslandPluginOptions): Plugin {
	let config: ResolvedConfig;

	const islandDirectory = path.resolve(options.islandDirectory);
	const islandPaths = globSync(`${islandDirectory}/**/*.client.vue`);

	const { clientDist, serverDist } = options;

	let clientManifest: Manifest;

	function ensureClientManifest(): Manifest {
		if (clientManifest) {
			return clientManifest;
		}

		clientManifest = JSON.parse(
			fs.readFileSync(path.resolve(clientDist, ".vite/manifest.json"), "utf-8"),
		);
		return clientManifest;
	}

	function getClientImportId(id: string): string {
		const relativePath = path.relative(cwd(), id);

		if (config.command === "serve") {
			if (id === customElementPath) {
				return virtualCustomElementEntryPath;
			}
			return `/${relativePath}`;
		}

		const manifest = ensureClientManifest();
		return `/${manifest[relativePath]!.file}`;
	}

	function getClientCssIds(id: string): string[] {
		if (config.command !== "build") {
			return [];
		}

		const relativePath = path.relative(cwd(), id);
		const manifest = ensureClientManifest();

		const cssIds = manifest[relativePath]?.css || [];
		return cssIds.map((cssId) => `/${cssId}`);
	}

	return {
		name: "vue-island",

		config(config) {
			if (config.build?.ssr) {
				return {
					build: {
						outDir: serverDist,
					},
				};
			}

			return {
				build: {
					manifest: true,
					outDir: clientDist,
					rollupOptions: {
						input: [customElementPath, ...islandPaths],
						preserveEntrySignatures: "allow-extension",
					},
				},
			};
		},

		configResolved(resolved) {
			config = resolved;
		},

		async resolveId(id, _importer, options) {
			if (!options?.ssr) {
				if (id === virtualCustomElementEntryPath) {
					return customElementPath;
				}
				return;
			}

			const { query } = parseId(id);

			if (query.original != null) {
				return id;
			}
		},

		async load(id, options) {
			if (!options?.ssr) {
				return null;
			}

			const { fileName, query } = parseId(id);

			if (!fileName.endsWith(".client.vue")) {
				return null;
			}

			// Vue plugin generated code
			if (query.vue != null) {
				return null;
			}

			if (query.original != null) {
				return fs.readFileSync(fileName, "utf-8");
			}

			const clientImportId = getClientImportId(fileName);
			const entryImportId = getClientImportId(customElementPath);
			const cssIds = getClientCssIds(fileName);
			return generateIslandCode(
				fileName,
				clientImportId,
				entryImportId,
				cssIds,
			);
		},
	};
}

function generateIslandCode(
	fileName: string,
	clientImportId: string,
	entryImportId: string,
	cssIds: string[],
): string {
	return `<script setup>
	import { useSSRContext } from "vue";
	import OriginalComponent from "${fileName}?original";

	defineOptions({
		inheritAttrs: false,
	});

	const context = useSSRContext();
	context.loadJs ??= new Set();
	context.loadJs.add("${entryImportId}");

	context.loadCss ??= new Set();
	${cssIds.map((cssId) => `context.loadCss.add("${cssId}");`).join("\n")}
	</script>

	<template>
		<vue-island entry="${clientImportId}" :serialized-props="JSON.stringify($attrs)">
			<OriginalComponent v-bind="$attrs" />
		</vue-island>
	</template>`;
}

function parseId(id: string): {
	fileName: string;
	query: Record<string, string>;
} {
	const [fileName, searchParams] = id.split("?");
	const parsed = new URLSearchParams(searchParams);
	const query = Object.fromEntries(parsed);

	return {
		fileName: fileName!,
		query,
	};
}
