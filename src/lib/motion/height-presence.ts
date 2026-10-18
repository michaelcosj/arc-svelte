import type { TransitionConfig } from 'svelte/transition';
import type { SpringCurve } from './spring';
import { easeInOut, type Easing } from './easing';
import { motionTokens as m } from './tokens';

export interface HeightPresenceParams {
	reduced?: boolean;
	/** Disable the opacity track for height-only wrappers. */
	opacity?: boolean;
	/** Optional timing override for the opacity track. */
	fade?: { duration: number; easing: Easing; delay?: number };
	/** Delay only the height track while opacity can begin earlier. */
	heightDelay?: number;
	/** Some reduced-motion sections retain a short height tween. */
	reducedHeight?: boolean;
	/** Fade-only duration with reduced motion; zero snaps. */
	reducedDuration?: number;
	skip?: boolean;
	delay?: number;
	spring?: SpringCurve;
}
/** Open or collapse real layout height while opacity runs on its separate copy clock. */
export function heightPresence(
	node: HTMLElement,
	{
		reduced,
		reducedDuration = 0,
		opacity = true,
		fade,
		heightDelay = 0,
		reducedHeight = false,
		skip,
		delay = 0,
		spring = m.spring.smooth
	}: HeightPresenceParams = {},
	options?: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	if (skip) return { duration: 0 };
	const entering = options?.direction !== 'out';
	const full = node.getBoundingClientRect().height;
	const fadeDuration = reduced
		? reducedDuration
		: (fade?.duration ?? (entering ? m.duration.standard : m.duration.fast));
	const fadeDelay = reduced ? 0 : (fade?.delay ?? 0);
	const moveDelay = reduced ? 0 : heightDelay;
	const duration = reduced
		? reducedDuration
		: Math.max(moveDelay + spring.duration, opacity ? fadeDelay + fadeDuration : 0);
	return {
		delay: reduced ? 0 : delay,
		duration,
		css: (t) => {
			if (reduced && !reducedHeight) return opacity ? `opacity:${easeInOut(t)};` : '';
			const elapsed = (entering ? t : 1 - t) * duration;
			const moved = reduced
				? easeInOut(Math.min(1, elapsed / duration))
				: spring.easing(Math.min(1, Math.max(0, elapsed - moveDelay) / spring.duration));
			const faded = Math.max(0, elapsed - fadeDelay);
			const fadeEase = reduced
				? easeInOut
				: (fade?.easing ?? (entering ? m.ease.enter : m.ease.standard));
			const alpha = entering
				? fadeEase(fadeDuration ? Math.min(1, faded / fadeDuration) : elapsed >= fadeDelay ? 1 : 0)
				: 1 -
					fadeEase(fadeDuration ? Math.min(1, faded / fadeDuration) : elapsed >= fadeDelay ? 1 : 0);
			return `height:${full * (entering ? moved : 1 - moved)}px;${opacity ? `opacity:${alpha};` : ''}overflow:hidden;`;
		}
	};
}
