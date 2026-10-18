import type { TransitionConfig } from 'svelte/transition';
import { cssEasing, easeOut } from './easing';
import { animateStyle, cancelStyles, springAnimation } from './native-animation';
import { motionTokens as m } from './tokens';
import { widthPresence } from './width-presence';

type Options = { direction?: number; instant?: boolean; reduced?: boolean; skip?: boolean };
type Direction = { direction?: 'in' | 'out' | 'both' };
const columns = new WeakMap<HTMLElement, boolean>();
const glyphs = new WeakMap<HTMLElement, boolean>();
const seenColumns = new WeakSet<HTMLElement>();
const empty = () => '';
const blurOf = (style: CSSStyleDeclaration) => parseFloat(style.filter.match(/[\d.]+/)?.[0] ?? '0');
const yOf = (style: CSSStyleDeclaration) =>
	(parseFloat(style.translate.split(' ')[1] ?? '0') || 0) / (parseFloat(style.fontSize) || 16);

/** Place-keyed columns shared by Slider and NumberField. Each property starts on the same frame. */
export function numberPresence(
	node: HTMLElement,
	{ direction = 1, instant = false, reduced = false, skip = false }: Options = {},
	options?: Direction
): TransitionConfig {
	const out = options?.direction === 'out',
		returning = !out && columns.get(node);
	columns.set(node, out);
	const style = getComputedStyle(node),
		fromY = out || returning ? yOf(style) : direction * 0.3,
		fromBlur = out || returning ? blurOf(style) : m.blur.soft,
		fromOpacity = out || returning ? style.opacity : '0';
	if (instant || skip || reduced) {
		widthPresence(node, { skip: true, spec: m.specs.morph, scale: 0.6 }, options);
		cancelStyles(node, 'translate', 'filter');
		node.style.translate = 'none';
		node.style.filter = 'none';
		if (instant || skip || out) return { duration: 0 };
		const duration = animateStyle(node, 'opacity', fromOpacity, '1', {
			duration: m.duration.instant,
			easing: cssEasing(easeOut)
		});
		return { duration, css: empty };
	}
	const width = widthPresence(
		node,
		{
			spec: out ? m.specs.smooth : m.specs.morph,
			scale: 0.6,
			...(out ? { fade: { duration: m.duration.instant, easing: easeOut } } : {})
		},
		options
	);
	const toY = out ? direction * -0.3 : 0,
		toBlur = out ? m.blur.subtle : 0;
	const yTime = out
		? { duration: m.duration.fast, easing: cssEasing(m.ease.standard) }
		: springAnimation(m.specs.snappy, fromY, toY);
	const travel = animateStyle(
		node,
		'translate',
		`0 ${fromY}em`,
		`0 ${toY}em`,
		yTime,
		out ? `0 ${toY}em` : 'none'
	);
	const filter = animateStyle(
		node,
		'filter',
		`blur(${fromBlur}px)`,
		`blur(${toBlur}px)`,
		{
			duration: out ? m.duration.instant : m.duration.standard,
			easing: cssEasing(out ? easeOut : m.ease.enter)
		},
		out ? `blur(${toBlur}px)` : 'none'
	);
	return { duration: Math.max(width.duration ?? 0, travel, filter), css: empty };
}

/** Money glyphs roll within a column; the first glyph of a new column stays still. */
export function moneyGlyphPresence(
	node: HTMLElement,
	{ direction = 1, instant = false, reduced = false, skip = false }: Options = {},
	options?: Direction
): TransitionConfig {
	const out = options?.direction === 'out',
		returning = !out && glyphs.get(node);
	glyphs.set(node, out);
	const parent = node.parentElement;
	const first = !out && parent && !seenColumns.has(parent);
	if (!out && parent) seenColumns.add(parent);
	const style = getComputedStyle(node),
		fromY = out || returning ? yOf(style) : direction * 0.55,
		fromBlur = out || returning ? blurOf(style) : m.blur.soft,
		fromOpacity = out || returning ? style.opacity : '0';
	if (instant || skip || first || reduced) {
		cancelStyles(node, 'translate', 'opacity', 'filter');
		node.style.translate = 'none';
		node.style.filter = 'none';
		node.style.opacity = out ? '0' : '1';
		if (instant || skip || first || out) return { duration: 0 };
		const duration = animateStyle(node, 'opacity', fromOpacity, '1', {
			duration: m.duration.instant,
			easing: cssEasing(easeOut)
		});
		return { duration, css: empty };
	}
	const toY = out ? direction * -0.55 : 0,
		toBlur = out ? m.blur.subtle : 0;
	const yTime = out
		? { duration: m.duration.instant, easing: cssEasing(m.ease.standard) }
		: springAnimation(m.specs.snappy, fromY, toY);
	const travel = animateStyle(
		node,
		'translate',
		`0 ${fromY}em`,
		`0 ${toY}em`,
		yTime,
		out ? `0 ${toY}em` : 'none'
	);
	const opacity = animateStyle(node, 'opacity', fromOpacity, out ? '0' : '1', {
		duration: out ? m.duration.instant : m.duration.fast,
		easing: cssEasing(out ? m.ease.standard : m.ease.enter)
	});
	const filter = animateStyle(
		node,
		'filter',
		`blur(${fromBlur}px)`,
		`blur(${toBlur}px)`,
		{
			duration: out ? m.duration.instant : m.duration.exit,
			easing: cssEasing(out ? m.ease.standard : m.ease.enter)
		},
		out ? `blur(${toBlur}px)` : 'none'
	);
	return { duration: Math.max(travel, opacity, filter), css: empty };
}
