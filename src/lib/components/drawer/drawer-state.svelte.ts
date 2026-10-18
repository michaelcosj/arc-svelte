import { createContext } from 'svelte';

export const [getDrawer, setDrawer] = createContext<{ close: () => void }>();

/** Keeps the last selected item available while a drawer leaves. Read `current` from a derived value. */
export class DrawerItem<T> {
	#last: T | null | undefined;
	#item: () => T | null | undefined;
	constructor(item: () => T | null | undefined) {
		this.#item = item;
	}
	get current() {
		const item = this.#item();
		if (item != null) this.#last = item;
		return item ?? this.#last;
	}
}
