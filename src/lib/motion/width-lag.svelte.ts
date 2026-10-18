import type { Attachment } from 'svelte/attachments';
import { Spring } from 'svelte/motion';
import { motionTokens as m } from './tokens';

/** Keep the painted edge in place while layout width changes in one step. */
export class WidthLag {
	#options: () => { reduced?: boolean };
	#node: HTMLElement | undefined;
	#width: number | undefined;
	#offset = $state(0);
	#spring = new Spring(0, m.physics.morph);

	constructor(options: () => { reduced?: boolean } = () => ({})) {
		this.#options = options;
	}

	body: Attachment<HTMLElement> = (node) => {
		this.#node = node;
		this.#width = node.offsetWidth;
		const observer = new ResizeObserver(() => {
			this.#width = node.offsetWidth;
		});
		observer.observe(node);
		return () => {
			observer.disconnect();
			this.#node = undefined;
		};
	};

	/** Measure after a keyed content change, before passive ResizeObserver baselines it. */
	changed() {
		if (!this.#node) return;
		const width = this.#node.offsetWidth;
		const previous = this.#width;
		this.#width = width;
		if (this.#options().reduced) {
			this.#offset = 0;
			void this.#spring.set(0, { instant: true });
		} else if (previous !== undefined && previous !== width) {
			// Move the coordinate origin instead of jumping the Spring and losing velocity.
			this.#offset += previous - width;
			void this.#spring.set(-this.#offset);
		}
	}

	get current() {
		return this.#offset + this.#spring.current;
	}
}
