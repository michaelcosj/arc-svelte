import type { Attachment } from 'svelte/attachments';
import { untrack } from 'svelte';
import { cssEasing } from './easing';
import { springCurve, type SpringCurve, type SpringSpec } from './spring';
import { motionTokens } from './tokens';

export interface WidthMorphOptions {
	/** Snap instead of animating. */
	reduced?: boolean;
	/** Animate every content resize, including passive changes. */
	follow?: boolean;
	/** Use whole-pixel offsetWidth when the source measures it. */
	measure?: 'border-box' | 'offset';
	/** Defaults to `motionTokens.spring.morph`. */
	spring?: SpringCurve;
	/** How long after `changed()` a resize still counts as a content change, ms. Defaults to 120. */
	window?: number;
	/**
	 * Keep the measured width in px at rest instead of `auto` (Button's label slot). The body then
	 * never shrinks below its content's last measured width between resizes.
	 */
	pinned?: boolean;
	/** Spring only when this text identity changes; font-only resizes snap regardless of timing. */
	contentKey?: string;
	/** Settle at the physical spring's rest threshold for the measured width change. */
	spec?: SpringSpec;
	/** Observe padding-only changes as well as content changes. */
	observeBox?: ResizeObserverBoxOptions;
}

/**
 * `layout` on a width that follows its content (`motion`'s width motion value on a wrapper).
 *
 * Attach `body` to the element whose width animates and `content` to the `width: max-content`
 * element inside it. Call `changed()` (in `$effect.pre`) when the content swaps: a resize soon
 * after springs the body from its old width to the new one. Any other resize (a font swap, a
 * hidden parent) follows instantly. While it springs the body carries `data-morphing`.
 */
export class WidthMorph {
	#options: () => WidthMorphOptions;
	#body: HTMLElement | undefined;
	#changedAt = -Infinity;

	constructor(options: () => WidthMorphOptions = () => ({})) {
		this.#options = options;
	}

	/** Marks a content change, so the next resize springs. */
	changed() {
		this.#changedAt = performance.now();
	}

	body: Attachment<HTMLElement> = (node) => {
		this.#body = node;
		return () => {
			if (this.#body === node) this.#body = undefined;
		};
	};

	content: Attachment<HTMLElement> = (node) => {
		if (typeof ResizeObserver === 'undefined') return;
		let last: number | undefined;
		let previousKey: string | undefined;
		let animation: Animation | undefined;
		const settle = (width: number | undefined) => {
			animation = undefined;
			const body = this.#body;
			if (!body) return;
			delete body.dataset.morphing;
			body.style.width = this.#options().pinned && width ? `${width}px` : 'auto';
		};
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const body = this.#body;
			const next =
				this.#options().measure === 'offset'
					? node.offsetWidth
					: (entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth);
			// Mid-flight, start from the width on screen; at rest, from the last measured width.
			const from = animation && body ? parseFloat(getComputedStyle(body).width) : last;
			last = next;
			animation?.cancel();
			animation = undefined;
			const {
				reduced,
				spring = motionTokens.spring.morph,
				window = 120,
				follow,
				contentKey,
				spec
			} = this.#options();
			const changed =
				contentKey === undefined
					? follow || performance.now() - this.#changedAt <= window
					: previousKey !== undefined && previousKey !== contentKey;
			previousKey = next ? contentKey : undefined;
			if (!body || !next || reduced || from === undefined || from === next || !changed)
				return settle(next);
			// Pin the new width under an animation from the old one, before this frame paints.
			const curve = spec ? springCurve(spec, Math.abs(next - from)) : spring;
			body.style.width = `${next}px`;
			body.dataset.morphing = '';
			const running = body.animate([{ width: `${from}px` }, { width: `${next}px` }], {
				duration: curve.duration,
				easing: cssEasing(curve.easing),
				fill: 'both'
			});
			animation = running;
			running.onfinish = () => {
				if (animation === running) {
					running.cancel();
					settle(next);
				}
			};
		});
		observer.observe(node, { box: untrack(() => this.#options().observeBox) ?? 'content-box' });
		return () => {
			observer.disconnect();
			animation?.cancel();
		};
	};
}
