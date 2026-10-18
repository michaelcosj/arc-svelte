import { easeOut, motionTokens as m, type SwapParams } from '#lib/motion';

/** New text rises in from below with a light blur. Reduced motion only fades. */
export function textIn(reduced: boolean, skip: boolean): SwapParams {
	if (skip) return { skip: true };
	if (reduced) return { duration: m.duration.fast, easing: easeOut };
	return { y: '0.45em', blur: m.blur.subtle, duration: m.duration.standard, easing: m.ease.enter };
}

/** Old text lifts away, faster than the new one arrives. Reduced motion drops it at once. */
export function textOut(reduced: boolean): SwapParams {
	if (reduced) return { duration: 0 };
	return { y: '-0.45em', blur: m.blur.subtle, duration: m.duration.fast, easing: m.ease.standard };
}
