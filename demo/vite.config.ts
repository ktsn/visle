import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import island from "../dist/build/index.js";

export default defineConfig({
	plugins: [
		island({
			islandDirectory: "src/components",
		}),
		vue({
			template: {
				compilerOptions: {
					isCustomElement: (tag) => tag === "vue-island",
				},
			},
		}),
	],
});
