/**
 * `AnimatePresence initial={false}`: `current` is false during the first render and true once the
 * component has mounted. Pass `skip: !mounted.current` to enter transitions so the first render
 * does not animate. Create it during component init.
 */
export class Mounted {
	current = $state(false);

	constructor() {
		$effect(() => {
			this.current = true;
		});
	}
}
