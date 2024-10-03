import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import island from "../src/server.js";

export default defineConfig({
	plugins: [
		island(),
		vue({
			template: {
				compilerOptions: {
					isCustomElement: (tag) => tag === "vue-island",
				},
			},
		}),
	],
});
