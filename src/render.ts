import { createApp } from "vue";
import { renderToString } from "vue/server-renderer";

type BaseProps = Record<string, unknown>;

interface VueComponent<Props extends BaseProps> {
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

export async function render<Props extends BaseProps>(
	component: VueComponent<CanEmpty<Props>>,
): Promise<string>;

export async function render<Props extends BaseProps>(
	component: VueComponent<Props>,
	props: Props,
): Promise<string>;

export async function render(
	component: VueComponent<BaseProps>,
	props: BaseProps = {},
) {
	const app = createApp(component, props);
	const result = await renderToString(app);

	return result;
}
