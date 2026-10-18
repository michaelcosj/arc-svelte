import type { TransitionConfig } from 'svelte/transition';
import { cssEasing, easeOut } from './easing';
import { animateStyle, springAnimation, numericTween } from './native-animation';
import { motionTokens as m } from './tokens';

const leaving = new WeakSet<HTMLElement>();
/** Independent bubble tracks preserve the painted values when an outro is interrupted. */
export function bubblePresence(
	node: HTMLElement,
	{ reduced = false, elastic = false } = {},
	options?: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const started = performance.now();
	// Svelte starts its presence animation after a zero-duration setup animation.
	// Measure the remaining lifetime at that point, so teardown shares the visual tracks' clock.
	const lifetime = (total: number): TransitionConfig => ({
		get duration() {
			return Math.max(0, total - (performance.now() - started));
		},
		css: () => ''
	});
	const out = options?.direction === 'out',
		returning = !out && leaving.has(node);
	if (out) leaving.add(node);
	else leaving.delete(node);
	const style = getComputedStyle(node),
		existing = out || returning;
	const opacity = existing ? style.opacity : '0';
	const duration = out ? m.duration.instant : elastic ? 150 : m.duration.instant;
	const fade = animateStyle(node, 'opacity', opacity, out ? '0' : '1', {
		duration: reduced ? duration : out ? m.duration.instant : m.duration.fast,
		easing: cssEasing(reduced ? easeOut : out ? m.ease.standard : m.ease.enter)
	});
	if (reduced) return lifetime(fade);
	const scale = existing
		? parseFloat(style.scale === 'none' ? '1' : style.scale)
		: elastic
			? 0.7
			: 0.6;
	const y = existing ? parseFloat(style.translate.split(' ')[1] ?? '0') || 0 : 6;
	const blur = existing ? parseFloat(style.filter.match(/[\d.]+/)?.[0] ?? '0') : m.blur.subtle;
	const toScale = out ? (elastic ? 0.85 : 0.8) : 1,
		toY = out ? 4 : 0,
		toBlur = out ? m.blur.subtle : 0;
	const exit = { duration: m.duration.instant, easing: cssEasing(m.ease.standard) };
	const numericExit = numericTween(m.duration.instant, [0.22, 1, 0.36, 1]);
	const scaling = animateStyle(
		node,
		'scale',
		`${scale}`,
		`${toScale}`,
		out ? numericExit : springAnimation(m.specs.snappy, scale, toScale)
	);
	const travel = animateStyle(
		node,
		'translate',
		`0 ${y}px`,
		`0 ${toY}px`,
		out ? numericExit : springAnimation(m.specs.snappy, y, toY)
	);
	const filter = animateStyle(
		node,
		'filter',
		`blur(${blur}px)`,
		`blur(${toBlur}px)`,
		out ? exit : { duration: m.duration.fast, easing: cssEasing(m.ease.enter) },
		out ? `blur(${toBlur}px)` : 'none'
	);
	return lifetime(Math.max(fade, scaling, travel, filter));
}
