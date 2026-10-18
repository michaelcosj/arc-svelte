import { contentSwap, easeInOut, motionTokens as m, type SwapParams } from '#lib/motion';
/** Password feedback uses the shared copy swap with directional travel and its shorter reduced fade. */
export function strengthCopy(
	reduced: boolean,
	direction = 1,
	skip = false
): { enter: SwapParams; exit: SwapParams } {
	const base = contentSwap(reduced, !skip);
	return {
		enter: {
			...base.textIn,
			y: reduced ? 0 : `${0.3 * direction}em`,
			duration: reduced ? m.duration.fast : m.duration.standard,
			easing: reduced ? easeInOut : m.ease.enter
		},
		exit: {
			...base.textOut,
			y: reduced ? 0 : `${-0.3 * direction}em`,
			easing: reduced ? easeInOut : m.ease.standard
		}
	};
}
