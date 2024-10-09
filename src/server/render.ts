import { createApp } from "vue";
import { renderToString } from "vue/server-renderer";

interface VueComponent<Props> {
	new (): {
		$props: Props;
	};
}

type CanEmpty<T> = RequiredKeys<T> extends never
	? T
	: string extends RequiredKeys<T>
		? T
		: // biome-ignore lint/complexity/noBannedTypes: Vue type uses {}
			{} extends T
			? T
			: never;

type RequiredKeys<T> = {
	[K in keyof T]-?: T[K] extends Required<T>[K] ? K : never;
}[keyof T];

export interface Render {
	<Props>(component: VueComponent<CanEmpty<Props>>): Promise<string>;
	<Props>(component: VueComponent<Props>, props: Props): Promise<string>;
}

// biome-ignore lint/complexity/noBannedTypes: Vue uses {} type
export const render: Render = async (component, props?: {}) => {
	const app = createApp(component, props);
	const result = await renderToString(app);

	return result;
};
