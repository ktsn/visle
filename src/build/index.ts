import type { Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";
import { cwd } from "node:process";
import { globSync } from "glob";

export interface IslandPluginOptions {
	islandDirectory: string;
}

const virtualCustomElementEntryPath = "/@entry-custom-element";

const customElementPath = path.resolve(
	import.meta.dirname,
	"../client/custom-element.js",
);

export default function islandPlugin(options: IslandPluginOptions): Plugin {
	const islandDirectory = path.resolve(cwd(), options.islandDirectory);
	const islandPaths = globSync(`${islandDirectory}/**/*.client.vue`);

	return {
		name: "vue-island",

		config(config) {
			if (config.build?.ssr) {
				return;
			}

			return {
				build: {
					manifest: true,
					rollupOptions: {
						input: [customElementPath, ...islandPaths],
						preserveEntrySignatures: "allow-extension",
					},
				},
			};
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

			const clientImportId = `/${path.relative(cwd(), fileName)}`;
			return generateIslandCode(fileName, clientImportId);
		},
	};
}

function generateIslandCode(fileName: string, clientImportId: string): string {
	return `<script setup>
	import { useSSRContext } from "vue";
	import OriginalComponent from "${fileName}?original";

	defineOptions({
		inheritAttrs: false,
	});

	const context = useSSRContext();
	context.clientComponentUsed = true;
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
