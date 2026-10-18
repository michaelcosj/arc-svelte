import { createContext } from 'svelte';
import { measureBox, type Box } from '#lib/motion';

export interface TabsStateOptions {
	readonly root: HTMLElement | null;
	readonly value: string;
	setValue(value: string): void;
}

/**
 * Shared by the tab parts. `direction` is +1 when the new tab sits after the old one;
 * `panelHeight` is the visible panel height so the next panel can morph from it; `leaving` pins
 * the outgoing panel where it was on screen.
 */
export class TabsState {
	direction = $state(1);
	panelHeight: number | null = null;
	leaving: { box: Box; rect: DOMRect } | null = null;
	get root() {
		return this.#options.root;
	}
	#options: TabsStateOptions;

	constructor(options: TabsStateOptions) {
		this.#options = options;
	}

	get value() {
		return this.#options.value;
	}

	/** Bound to the Bits UI root's value: measures the outgoing panel before the DOM changes. */
	select(next: string) {
		const frame = this.root;
		const active = this.value;
		const panel = frame?.querySelector<HTMLElement>(
			':scope > [role="tabpanel"][data-state="active"]'
		);
		this.leaving = panel ? { box: measureBox(panel), rect: panel.getBoundingClientRect() } : null;
		const order = frame
			? Array.from(frame.querySelectorAll<HTMLElement>('[role="tab"][data-value]'))
					.filter((tab) => tab.closest('.arc-tabs') === frame)
					.map((tab) => tab.dataset.value)
			: [];
		const from = order.indexOf(active);
		const to = order.indexOf(next);
		if (from >= 0 && to >= 0 && from !== to) this.direction = to > from ? 1 : -1;
		this.#options.setValue(next);
	}
}

export const [getTabsState, setTabsState] = createContext<TabsState>();
