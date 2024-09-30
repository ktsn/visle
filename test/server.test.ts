import test, { describe } from "node:test";
import assert from "node:assert";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { rollup } from "rollup";
import vue from "@vitejs/plugin-vue";
import { rollupPlugin } from "../src/server.ts";

function create(files: Record<string, string>) {
	Object.entries(files).map(([fileName, content]) => {
		fs.writeFileSync(path.join(os.tmpdir(), fileName), content);
	});

	return rollup({
		input: path.join(os.tmpdir(), "./main.vue"),
		external: ["vue"],
		plugins: [rollupPlugin(), vue()],
	});
}

const generatedDirectory = "test/__generated__";
const generatedComponent = "component.js";
const generatedMain = "main.js";

async function renderGeneratedCode(code: string): Promise<string> {
	const main = `import { render } from "../../src/render.ts";
	import Component from './${generatedComponent}';
	console.log(await render(Component));
	`;

	await fs.promises.mkdir(generatedDirectory, { recursive: true });
	await fs.promises.writeFile(
		path.join(generatedDirectory, generatedComponent),
		code,
	);
	await fs.promises.writeFile(
		path.join(generatedDirectory, generatedMain),
		main,
	);

	return new Promise((resolve, reject) => {
		const child = spawn(
			"node",
			[
				"--experimental-strip-types",
				path.join(generatedDirectory, generatedMain),
			],
			{ stdio: "pipe" },
		);

		let output = "";
		child.stdout.on("data", (data) => {
			output += data;
		});

		child.on("error", (err) => {
			reject(err);
		});

		child.on("close", () => {
			resolve(output);
		});
	});
}

describe("Server Plugin", () => {
	test("compiles vue component", async () => {
		const bundle = await create({
			"./main.vue": `
        <script setup>
          import Counter from "./counter.client.vue";
        </script>
        <template>
					<div>
						<h1>Counter</h1>
	          <Counter />
					</div>
        </template>
      `,
			"./counter.client.vue": `
        <script setup>
          import { ref } from "vue";
          const count = ref(0);
        </script>
        <template>
          <button @click="count++">{{ count }}</button>
        </template>
      `,
		});

		const generated = await bundle.generate({ format: "es" });
		const code = generated.output[0].code;

		assert.equal(
			await renderGeneratedCode(code),
			'<div><h1>Counter</h1><vue-island component="./counter.js"><button>0</button></vue-island></div>\n',
		);
	});
});
