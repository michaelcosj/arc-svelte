import { Tween } from 'svelte/motion';
import { springCurve, type SpringCurve, type SpringSpec } from './spring';
import { motionTokens } from './tokens';

export interface HighlightOptions {
	/** Snap instead of gliding. */
	reduced?: boolean;
	/** Defaults to `motionTokens.spring.morph`. */
	spring?: SpringCurve;
	/** Native text suggestion lists measure whole-pixel offsets. */
	measure?: 'border-box' | 'offset';
	/** End a physical spring at the rest threshold for the distance traveled. */
	spec?: SpringSpec;
}

/**
 * A shared highlight (`motion`'s `layoutId` on one span rendered inside whichever item is active):
 * a single element that glides to the active item's box.
 *
 * Render one absolutely positioned element as a sibling of the items, inside their positioned
 * container, with `hidden={!highlight.shown}` and `style={highlight.style}`. Call `move(item)`
 * when the active item changes and `move(item, false)` on resizes, which snap. The first move
 * always snaps, like `initial={false}`.
 */
export class Highlight {
	#options: () => HighlightOptions;
	#box = new Tween({ x: 0, y: 0, width: 0, height: 0 });
	shown = $state(false);

	constructor(options: () => HighlightOptions = () => ({})) {
		this.#options = options;
	}

	/** Moves to `item`'s offset box. Without an item the highlight hides. */
	move(item: HTMLElement | null | undefined, animate = true) {
		if (!item) {
			this.shown = false;
			return;
		}
		// Fractional, unlike offsetLeft/offsetWidth: relative to the offset parent's padding box and scroll.
		const parent = item.offsetParent;
		const rect = item.getBoundingClientRect();
		const frame = parent?.getBoundingClientRect();
		const target =
			this.#options().measure !== 'offset' && parent && frame
				? {
						x: rect.left - frame.left - parent.clientLeft + parent.scrollLeft,
						y: rect.top - frame.top - parent.clientTop + parent.scrollTop,
						width: rect.width,
						height: rect.height
					}
				: {
						x: item.offsetLeft,
						y: item.offsetTop,
						width: item.offsetWidth,
						height: item.offsetHeight
					};
		const { reduced, spring = motionTokens.spring.morph, spec } = this.#options();
		const glide = animate && this.shown && !reduced;
		const current = this.#box.current;
		const curve = spec
			? springCurve(
					spec,
					Math.max(
						Math.abs(target.x - current.x),
						Math.abs(target.y - current.y),
						Math.abs(target.width - current.width),
						Math.abs(target.height - current.height)
					)
				)
			: spring;
		this.shown = true;
		void this.#box.set(target, glide ? curve : { duration: 0 });
	}

	/** The highlight's current box. */
	get box() {
		return this.#box.current;
	}

	/** Inline style placing the highlight at its current box. */
	get style() {
		const { x, y, width, height } = this.#box.current;
		return `transform: translate(${x}px, ${y}px); width: ${width}px; height: ${height}px;`;
	}
}
