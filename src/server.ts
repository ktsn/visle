import type { Plugin } from "vite";
import fs from "node:fs";

export default function islandPlugin(): Plugin {
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

			if (query.original != null) {
				return fs.readFileSync(fileName, "utf-8");
			}

			return generateIslandCode(fileName);
		},
	};
}

function generateIslandCode(fileName: string): string {
	return `<script setup>
	import OriginalComponent from "${fileName}?original";
	</script>
	<template>
		<vue-island entry="Counter">
			<OriginalComponent />
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
