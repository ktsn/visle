import type { Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";
import { cwd } from "node:process";

export interface IslandPluginOptions {
	islandDirectory: string;
}

export default function islandPlugin(options: IslandPluginOptions): Plugin {
	const islandDirectory = path.resolve(cwd(), options.islandDirectory);

	return {
		name: "vue-island",

		async resolveId(id, _importer, options) {
			if (!options?.ssr) {
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

			return generateIslandCode(islandDirectory, fileName);
		},
	};
}

function generateIslandCode(islandDirectory: string, fileName: string): string {
	const relative = path.relative(islandDirectory, fileName);
	const baseName = relative.replace(/\.client\.vue$/i, "");

	return `<script setup>
	import OriginalComponent from "${fileName}?original";
	defineOptions({ inheritAttrs: false });
	</script>
	<template>
		<vue-island entry="${baseName}" :serialized-props="JSON.stringify($attrs)">
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
