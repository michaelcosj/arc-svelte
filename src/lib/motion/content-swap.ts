import { easeOut } from './easing';
import { motionTokens as m } from './tokens';
import type { SwapParams } from './swap';

/** Shared copy and icon swaps for feedback surfaces; initial content stays still. */
export function contentSwap(reduced: boolean, mounted: boolean) {
	const textIn: SwapParams = {
		y: reduced ? 0 : '.3em',
		blur: reduced ? 0 : m.blur.soft,
		duration: reduced ? m.duration.instant : m.duration.standard,
		easing: reduced ? easeOut : m.ease.enter,
		skip: !mounted
	};
	const textOut: SwapParams = {
		y: reduced ? 0 : '-.3em',
		blur: reduced ? 0 : m.blur.subtle,
		duration: reduced ? m.duration.instant : m.duration.fast,
		easing: reduced ? easeOut : m.ease.standard,
		pop: true
	};
	const iconIn: SwapParams = {
		scale: reduced ? 1 : 0.6,
		blur: reduced ? 0 : m.blur.subtle,
		...(reduced ? { duration: m.duration.instant, easing: easeOut } : m.spring.snappy),
		skip: !mounted
	};
	const iconOut: SwapParams = {
		scale: reduced ? 1 : 0.6,
		blur: reduced ? 0 : m.blur.subtle,
		duration: reduced ? m.duration.instant : m.duration.fast,
		easing: reduced ? easeOut : m.ease.standard,
		pop: true
	};
	return { textIn, textOut, iconIn, iconOut };
}
