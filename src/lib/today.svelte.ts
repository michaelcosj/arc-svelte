import { createSubscriber } from 'svelte/reactivity';

/** Shared by calendar and date-range-picker, so one copy keeps their "today" in step. */
const dateKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromKey = (key: string) => {
	const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
	return new Date(year, month - 1, day);
};

/** Today turns over at local midnight; returning to the tab, focusing the window or waking the device reads it again. */
let ready = $state(false);

const subscribe = createSubscriber((update) => {
	// The first read (possibly during hydration) matches the server; the real date follows.
	if (!ready) queueMicrotask(() => (ready = true));
	let timer = 0;
	const schedule = () => {
		const now = new Date();
		const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		timer = window.setTimeout(
			() => {
				update();
				schedule();
			},
			nextMidnight.getTime() - now.getTime() + 1000
		);
	};
	const onVisible = () => {
		if (document.visibilityState === 'visible') update();
	};
	schedule();
	document.addEventListener('visibilitychange', onVisible);
	window.addEventListener('focus', update);
	return () => {
		window.clearTimeout(timer);
		document.removeEventListener('visibilitychange', onVisible);
		window.removeEventListener('focus', update);
	};
});

let cachedKey = '';
let cachedDate: Date | undefined;

/**
 * The viewer's local date, read reactively (`today.current`). Undefined on the server and before
 * hydration, so markup never depends on the server clock or time zone; afterwards it follows
 * the real date across midnight.
 */
export const today = {
	get current(): Date | undefined {
		if (typeof window === 'undefined') return undefined;
		subscribe();
		if (!ready) return undefined;
		// oxlint-disable-next-line svelte/prefer-svelte-reactivity -- a throwaway read of the clock
		const key = dateKey(new Date());
		if (key !== cachedKey) {
			cachedKey = key;
			cachedDate = fromKey(key);
		}
		return cachedDate;
	}
};
