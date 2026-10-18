import { today } from '#lib/today.svelte.ts';

/** Calendar-compatible access to the shared local-midnight clock. */
export function useToday() {
	return today;
}
