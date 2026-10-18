/** Page-wide exclusivity and the original's 300ms warm handoff window. No state is changed during SSR. */
let active: string | null = null;
let closedAt = -Infinity;
let instant = false;
const listeners = new Set<() => void>();
export const cards = {
	get active() {
		return active;
	},
	get instant() {
		return instant;
	},
	warm: () => active !== null || performance.now() - closedAt < 300,
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	open(id: string) {
		if (active === id) return;
		instant = cards.warm();
		active = id;
		listeners.forEach((listener) => listener());
	},
	close(id: string) {
		if (active !== id) return;
		active = null;
		closedAt = performance.now();
		listeners.forEach((listener) => listener());
	}
};
