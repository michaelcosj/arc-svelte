import type { Component } from 'svelte';
import type { PageLoad } from './$types';

const demos = import.meta.glob<{ default: Component }>('/src/demos/blocks/*.svelte');

/** Resolve the demo before rendering, so server HTML includes its accessible content. */
export const load: PageLoad = async ({ params }) => {
	const loadDemo = demos[`/src/demos/blocks/${params.name}.svelte`];
	return { demo: loadDemo ? (await loadDemo()).default : undefined };
};
