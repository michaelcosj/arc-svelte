import type { TransitionConfig } from 'svelte/transition';
import { easeOut } from './easing';
import { springCurve } from './spring';
import { motionTokens as m } from './tokens';
import { swap } from './swap';

/** The shared time-picker/multi-select list entrance: a snappy rise and scale, with a short fade out. */
export function listboxMotion(
	node: HTMLElement,
	{ reduced }: { reduced: boolean },
	options: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const out = options.direction === 'out';
	return swap(
		node,
		reduced
			? { duration: m.duration.instant, easing: out ? m.ease.standard : easeOut }
			: out
				? { y: -4, scale: 0.98, duration: m.duration.instant, easing: m.ease.standard }
				: {
						y: -6,
						scale: 0.97,
						...springCurve(m.specs.snappy, 6),
						fade: { duration: m.duration.fast, easing: m.ease.enter }
					},
		options
	);
}
