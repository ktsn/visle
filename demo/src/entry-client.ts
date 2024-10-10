/// <reference types="vite/client" />

import { registerIslandElement } from "../../src/client/index.js";

const islands = import.meta.glob("./components/**/*.client.vue");

registerIslandElement((componentPath) => {
	const island = islands[`./components/${componentPath}.client.vue`]!;
	return island();
});
