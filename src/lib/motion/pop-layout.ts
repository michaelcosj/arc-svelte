import { capturePop, measureBox, type Box } from './swap';

/**
 * Pre-measured boxes for `mode="popLayout"` in lists and other layouts where siblings shift the
 * outgoing element as soon as the DOM changes (inline words, centered digits). Tag each
 * animated element with `data-pop-key`, call `capture(container)` before the DOM changes
 * (`$effect.pre` on the trigger, or a setter), and pass `pop: layout.box(key)` to `out:swap`.
 */
export class PopLayout {
	#boxes = new Map<string, Box>();

	/** Measures every `[data-pop-key]` inside `container` (or matching `selector`). */
	capture(container: Element | null | undefined, selector = '[data-pop-key]') {
		this.#boxes.clear();
		if (!container) return;
		for (const node of container.querySelectorAll<HTMLElement>(selector)) {
			const key = node.dataset.popKey;
			// An element already leaving keeps the box it popped out with.
			if (key !== undefined && !node.hasAttribute('data-pop')) {
				capturePop(node);
				this.#boxes.set(key, measureBox(node));
			}
		}
	}

	/** The box captured for `key`, or `true` to measure at outro time. */
	box(key: string | number): Box | true {
		return this.#boxes.get(String(key)) ?? true;
	}
}
