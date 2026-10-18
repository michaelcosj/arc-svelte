import { createContext } from 'svelte';
import { Mounted } from '#lib/motion';
export class SwipeGroup {
	openId = $state<string | null>(null);
	// DOM registry is deliberately non-reactive; registration must not retrigger dismissal.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	rows = new Map<string, HTMLElement>();
	mounted = new Mounted();
}
export const [getSwipeGroup, setSwipeGroup] = createContext<SwipeGroup>();
