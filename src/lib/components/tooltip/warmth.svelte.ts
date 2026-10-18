const SKIP_WINDOW = 300;

/**
 * Every Tooltip brings its own provider, so the skip window is shared here: while any tooltip is
 * open, and briefly after the last one closes, the next opens without delay or travel.
 */
class Warmth {
	warm = $state(false);
	#open = 0;
	#cool: ReturnType<typeof setTimeout> | undefined;

	opened() {
		this.#open += 1;
		clearTimeout(this.#cool);
		this.warm = true;
	}

	closed = () => {
		this.#open = Math.max(0, this.#open - 1);
		if (this.#open) return;
		clearTimeout(this.#cool);
		this.#cool = setTimeout(() => (this.warm = false), SKIP_WINDOW);
	};
}

export const warmth = new Warmth();
