import type { TransitionConfig } from 'svelte/transition';
import { cssEasing, easeOut, type Easing } from './easing';
import { animateStyle, cancelStyles, springAnimation } from './native-animation';
import type { SpringCurve, SpringSpec } from './spring';
import { motionTokens } from './tokens';

export interface WidthPresenceParams {
	/** Drives the width. Defaults to `motionTokens.spring.morph`. */
	spring?: SpringCurve;
	/** Start layout-sensitive width flights directly, with distance-based rest thresholds. */
	spec?: SpringSpec;
	/** Separate timing for opacity; without it opacity follows the spring (clamped). */
	fade?: { duration: number; easing?: Easing };
	/** Skip the animation, e.g. with reduced motion. */
	skip?: boolean;
	/** Optional scale of the hidden slot. */
	scale?: number;
}

const slots = new WeakMap<HTMLElement, { width: number; leaving: boolean }>();

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * An inline element that opens its width from 0 as it enters and closes it as it leaves, fading
 * as it goes (`initial={{ width: 0, opacity: 0 }}` / `animate={{ width: "auto" }}` / `exit` back
 * to 0). Use as `in:widthPresence` and `out:widthPresence` (not `transition:`, which would
 * reverse the intro instead of springing back to 0); the element should clip its overflow.
 * Re-entering a keyed node during its outro resumes from its painted width, opacity and scale.
 */
export function widthPresence(
	node: HTMLElement,
	params: WidthPresenceParams = {},
	options?: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const { spring = motionTokens.spring.morph, spec, fade, skip, scale } = params;
	const style = getComputedStyle(node);
	const width = parseFloat(style.width) || node.offsetWidth;
	const out = options?.direction === 'out';
	const previous = slots.get(node);
	const returning = !out && previous?.leaving;
	// A keyed item can return while its outro is still running. Keep its intrinsic target,
	// and resume from the painted slot instead of measuring a partial width as the new rest size.
	const moving = node
		.getAnimations()
		.some(
			(animation) =>
				animation.effect instanceof KeyframeEffect &&
				animation.effect.getKeyframes().some((frame) => frame.width !== undefined)
		);
	const rest = returning || moving ? (previous?.width ?? width) : width;
	const record: { width: number; leaving: boolean } = { width: rest, leaving: out };
	slots.set(node, record);
	if (skip) {
		if (spec) {
			cancelStyles(node, 'width', 'opacity', 'transform');
			node.style.width = out ? '0px' : 'auto';
			node.style.opacity = out ? '0' : '1';
			if (scale !== undefined) node.style.transform = 'none';
		}
		return { duration: 0 };
	}
	const fromWidth = out || returning ? width : 0;
	const toWidth = out ? 0 : returning ? rest : width;
	const fromOpacity = out || returning ? Number(style.opacity) : 0;
	const toOpacity = out ? 0 : 1;
	const paintedScale = style.transform === 'none' ? 1 : new DOMMatrixReadOnly(style.transform).a;
	const fromScale = out || returning ? paintedScale : (scale ?? 1);
	const toScale = out ? (scale ?? 1) : 1;

	if (spec) {
		const widthTime = springAnimation(spec, fromWidth, toWidth);
		const opacityTime = fade
			? { duration: fade.duration, easing: cssEasing(fade.easing ?? easeOut) }
			: springAnimation(spec, fromOpacity, toOpacity, true);
		const widthDuration = animateStyle(
			node,
			'width',
			`${fromWidth}px`,
			`${toWidth}px`,
			widthTime,
			out ? '0px' : 'auto'
		);
		const opacityDuration = animateStyle(
			node,
			'opacity',
			String(fromOpacity),
			String(toOpacity),
			opacityTime
		);
		const scaleDuration =
			scale === undefined
				? 0
				: animateStyle(
						node,
						'transform',
						`scale(${fromScale})`,
						`scale(${toScale})`,
						springAnimation(spec, fromScale, toScale)
					);
		return { duration: Math.max(widthDuration, opacityDuration, scaleDuration), css: () => '' };
	}
	const total = Math.max(spring.duration, fade?.duration ?? 0);
	return {
		duration: total,
		css: (t) => {
			const elapsed = (out ? 1 - t : t) * total;
			const open = spring.easing(Math.min(1, elapsed / spring.duration));
			const shown = fade
				? (fade.easing ?? motionTokens.ease.inOut)(
						fade.duration ? Math.min(1, elapsed / fade.duration) : 1
					)
				: open;
			const size = fromWidth + (toWidth - fromWidth) * open;
			const opacity = clamp01(fromOpacity + (toOpacity - fromOpacity) * shown);
			return `width: ${Math.max(0, size)}px; opacity: ${opacity};${scale === undefined ? '' : `transform:scale(${fromScale + (toScale - fromScale) * open});`}`;
		}
	};
}
