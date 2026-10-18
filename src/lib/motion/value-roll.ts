import type { TransitionConfig } from 'svelte/transition';
import { easeOut } from './easing';
import { motionTokens as m } from './tokens';
import { swap } from './swap';

export interface ValueRollParams {
	direction: number;
	reduced: boolean;
	skip?: boolean;
}

/** Select and time-picker values rise for a later value and fall for an earlier value. */
export function valueRoll(
	node: HTMLElement,
	{ direction, reduced, skip }: ValueRollParams,
	options: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const out = options.direction === 'out';
	return swap(
		node,
		reduced
			? { duration: m.duration.instant, easing: easeOut, skip: !out && skip }
			: {
					y: `${direction * (out ? -0.3 : 0.35)}em`,
					blur: out ? m.blur.subtle : m.blur.soft,
					duration: out ? m.duration.fast : m.duration.standard,
					easing: out ? m.ease.standard : m.ease.enter,
					skip: !out && skip
				},
		options
	);
}
