import type { TransitionConfig } from 'svelte/transition';
import {
	motionTokens as m,
	contentSwap,
	easeInOut,
	springCurve,
	cssEasing,
	easeOut
} from '#lib/motion';
export const collapse = springCurve({ visualDuration: 0.3, bounce: 0 });
export const land = springCurve({ visualDuration: 0.42, bounce: 0.14 }, 22);
export function copyMotion(reduced: boolean, mounted: boolean) {
	const copy = contentSwap(reduced, mounted);
	if (reduced) {
		copy.textIn.easing = easeInOut;
		copy.textOut.easing = easeInOut;
	}
	return copy;
}
export function shake(node: HTMLElement, delay = 0) {
	return node.animate(
		[0, -7, 6, -4, 3, -1.5, 0].map((x) => ({ translate: `${x}px 0` })),
		{
			duration: 420,
			delay,
			easing: cssEasing(easeOut)
		}
	);
}
export const enterFade = { duration: m.duration.standard, easing: m.ease.enter };

/** Landing uses independent spring distances for translation and scale, plus a copy fade. */
export function rowIn(
	_node: HTMLElement,
	{ skip, delay }: { skip: boolean; delay: number }
): TransitionConfig {
	if (skip) return { duration: 0 };
	const scale = springCurve({ visualDuration: 0.42, bounce: 0.14 }, 0.06);
	const duration = Math.max(land.duration, scale.duration, m.duration.standard);
	return {
		delay,
		duration,
		css: (t) => {
			const elapsed = t * duration;
			const y = land.easing(Math.min(1, elapsed / land.duration));
			const size = scale.easing(Math.min(1, elapsed / scale.duration));
			const fade = m.ease.enter(Math.min(1, elapsed / m.duration.standard));
			return `opacity:${fade};transform:translateY(${-22 * (1 - y)}px) scale(${0.94 + 0.06 * size});filter:blur(${m.blur.soft * (1 - fade)}px);`;
		}
	};
}
