import type { AnimationConfig } from 'svelte/animate';
import { motionTokens as m } from './tokens';
import type { SpringCurve } from './spring';

/** FLIP only position: layout owns the final width while a separate edge can lag behind. */
export function positionFlip(
	node: Element,
	{ from, to }: { from: DOMRect; to: DOMRect },
	options: SpringCurve = m.spring.morph
): AnimationConfig {
	const transform = getComputedStyle(node).transform.replace('none', '');
	const x = from.left - to.left;
	const y = from.top - to.top;
	return {
		...options,
		css: (t) => `transform: ${transform} translate(${x * (1 - t)}px, ${y * (1 - t)}px);`
	};
}
