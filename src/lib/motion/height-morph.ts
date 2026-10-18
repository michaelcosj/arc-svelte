import type { Attachment } from 'svelte/attachments';
import { cssEasing } from './easing';
import type { SpringCurve } from './spring';
import { motionTokens } from './tokens';

export interface HeightMorphOptions {
	reduced?: boolean;
	spring?: SpringCurve;
	/** Animate every observed content resize, rather than only changes after `changed()`. */
	follow?: boolean;
	window?: number;
	/** Keep the measured pixel height at rest (for inline message slots). */
	pinned?: boolean;
	/** Use whole-pixel offsetHeight when that is what the source measures. */
	measure?: 'border-box' | 'offset';
	clip?: boolean;
	/** Pin the old height before FLIP measures a centered, wrapping layout. */
	pinBeforeChange?: boolean;
}

/** Follow content height, clipping only during a morph and returning to auto at rest.
 * Call `changed()` before a content swap; passive reflows and the first measurement snap.
 * Interrupted changes start from the current painted height.
 */
export class HeightMorph {
	#options: () => HeightMorphOptions;
	#body: HTMLElement | undefined;
	#changedAt = -Infinity;
	#last: number | undefined;
	#animation: Animation | undefined;
	#release = 0;

	constructor(options: () => HeightMorphOptions = () => ({})) {
		this.#options = options;
	}

	changed() {
		this.#changedAt = performance.now();
		const node = this.#body;
		if (
			!this.#options().pinBeforeChange ||
			this.#options().reduced ||
			!node ||
			this.#last === undefined
		)
			return;
		const height = this.#animation ? parseFloat(getComputedStyle(node).height) : this.#last;
		node.style.height = `${height}px`;
		node.style.minHeight = `${height}px`;
		node.style.overflow = 'clip';
		cancelAnimationFrame(this.#release);
		this.#release = requestAnimationFrame(() => {
			this.#release = requestAnimationFrame(() => {
				if (this.#animation || this.#body !== node) return;
				node.style.height = this.#options().pinned ? `${this.#last}px` : 'auto';
				node.style.minHeight = '';
				node.style.overflow = '';
			});
		});
	}

	body: Attachment<HTMLElement> = (node) => {
		this.#body = node;
		return () => {
			cancelAnimationFrame(this.#release);
			if (this.#body === node) this.#body = undefined;
		};
	};

	content: Attachment<HTMLElement> = (node) => {
		if (typeof ResizeObserver === 'undefined') return;
		let last: number | undefined;
		let animation: Animation | undefined;
		const settle = () => {
			animation = undefined;
			this.#animation = undefined;
			if (!this.#body) return;
			this.#body.style.height = this.#options().pinned ? `${last ?? 0}px` : 'auto';
			this.#body.style.overflow = '';
			if (this.#options().pinBeforeChange) this.#body.style.minHeight = '';
			delete this.#body.dataset.morphing;
		};
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const body = this.#body;
			const next =
				this.#options().measure === 'offset'
					? node.offsetHeight
					: (entry.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight);
			// CSS height excludes borders on content-box shells.
			const from = animation && body ? parseFloat(getComputedStyle(body).height) : last;
			last = next;
			this.#last = next;
			animation?.cancel();
			const {
				reduced,
				spring = motionTokens.spring.smooth,
				follow,
				window = 120
			} = this.#options();
			if (
				!body ||
				reduced ||
				from === undefined ||
				from === next ||
				(!follow && performance.now() - this.#changedAt > window)
			)
				return settle();
			body.style.height = `${next}px`;
			body.style.overflow = this.#options().clip === false ? '' : 'hidden';
			body.dataset.morphing = '';
			const pin = this.#options().pinBeforeChange;
			const running = body.animate(
				[
					{ height: `${from}px`, ...(pin ? { minHeight: `${from}px` } : {}) },
					{ height: `${next}px`, ...(pin ? { minHeight: `${next}px` } : {}) }
				],
				{
					duration: spring.duration,
					easing: cssEasing(spring.easing),
					fill: 'both'
				}
			);
			animation = running;
			this.#animation = running;
			running.onfinish = () => {
				if (animation === running) {
					running.cancel();
					settle();
				}
			};
		});
		observer.observe(node);
		return () => {
			cancelAnimationFrame(this.#release);
			observer.disconnect();
			animation?.cancel();
			this.#animation = undefined;
		};
	};
}
