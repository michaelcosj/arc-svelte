import type { TransitionConfig } from 'svelte/transition';
import { easeInOut, type Easing } from './easing';

/** An element's layout box relative to its offset parent, as `motion`'s popLayout measures it. */
export interface Box {
	top: number;
	left: number;
	width: number;
	height: number;
}

/** Measures `node`'s box relative to its offset parent. */
export function measureBox(node: HTMLElement): Box {
	// Computed size is fractional and ignores transforms (offsetWidth rounds; a rect would include a press scale).
	const style = getComputedStyle(node);
	return {
		top: node.offsetTop,
		left: node.offsetLeft,
		width: parseFloat(style.width) || node.offsetWidth,
		height: parseFloat(style.height) || node.offsetHeight
	};
}

const popped = new WeakMap<
	HTMLElement,
	{
		styles: Record<string, { value: string; priority: string }>;
		hidden: string | null;
		marker: string | null;
		active: boolean;
	}
>();

/** Return a resurrected keyed node to its original layout and accessibility state. */
export function restorePop(node: HTMLElement) {
	const before = popped.get(node);
	if (!before?.active) return;
	for (const [property, { value, priority }] of Object.entries(before.styles)) {
		if (value) node.style.setProperty(property, value, priority);
		else node.style.removeProperty(property);
	}
	if (before.hidden === null) node.removeAttribute('aria-hidden');
	else node.setAttribute('aria-hidden', before.hidden);
	if (before.marker === null) node.removeAttribute('data-pop');
	else node.setAttribute('data-pop', before.marker);
	popped.delete(node);
}

/** Capture layout styles before Svelte's FLIP fix pins a leaving keyed item. */
export function capturePop(node: HTMLElement) {
	const style = node.style;
	if (!popped.get(node)?.active) {
		popped.set(node, {
			styles: Object.fromEntries(
				['transform', 'position', 'top', 'left', 'width', 'height', 'pointer-events'].map(
					(property) => [
						property,
						{
							value: style.getPropertyValue(property),
							priority: style.getPropertyPriority(property)
						}
					]
				)
			),
			hidden: node.getAttribute('aria-hidden'),
			marker: node.getAttribute('data-pop'),
			active: false
		});
	}
}

/**
 * Lifts an outgoing element out of flow and pins it where it was, like `motion`'s
 * `AnimatePresence mode="popLayout"`, so the incoming element takes its place at once. The
 * parent must be `position: relative` (or otherwise positioned).
 *
 * Without `box` the node is measured now. Svelte inserts the incoming element after the outgoing
 * one, so that is usually right; pass a box measured before the DOM changed when siblings can
 * shift it (centered or wrapping layouts, panels whose parent resizes).
 *
 * The element is hidden from assistive tech and marked `data-pop` so CSS can target it. Its inline
 * transform is dropped: in a keyed `{#each}` with `animate:flip`, Svelte's own `fix()` has already
 * pinned it with a translate, and the box places it now.
 */
export function popOut(node: HTMLElement, box: Box = measureBox(node)) {
	const style = node.style;
	if (!popped.has(node)) capturePop(node);
	popped.get(node)!.active = true;
	style.transform = '';
	style.position = 'absolute';
	style.top = `${box.top}px`;
	style.left = `${box.left}px`;
	style.width = `${box.width}px`;
	style.height = `${box.height}px`;
	style.pointerEvents = 'none';
	node.setAttribute('aria-hidden', 'true');
	node.setAttribute('data-pop', '');
}

type Length = number | string;

export interface SwapParams {
	/** Offset of the hidden state; numbers are px, strings carry a unit (`'0.3em'`). */
	x?: Length;
	y?: Length;
	/** Scale of the hidden state. */
	scale?: number;
	/** Blur radius of the hidden state, px. */
	blur?: number;
	/** Opacity of the hidden state. Defaults to 0. */
	opacity?: number;
	duration?: number;
	delay?: number;
	/** Defaults to `motion`'s easeInOut, which it uses when a transition sets only a duration. */
	easing?: Easing;
	/** Lift the outgoing element out of flow (`mode="popLayout"`). Pass a `Box` to pin it there. */
	pop?: boolean | Box;
	/** Skip the animation entirely, e.g. on first render (`AnimatePresence initial={false}`). */
	skip?: boolean;
	/**
	 * Separate timing for opacity and blur, when they tween while the transform springs
	 * (`transition: { ...spring, opacity: { duration, ease } }`). `duration`/`easing` then drive
	 * the transform only. `delay` holds the fade back after the transform starts.
	 */
	fade?: { duration: number; easing?: Easing; delay?: number };
	/** Extra CSS appended to every frame, as a function of eased progress `t` (0 hidden, 1 shown). */
	extra?: (t: number) => string;
}

function split(value: Length): [number, string] {
	if (typeof value === 'number') return [value, 'px'];
	const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(value.trim());
	return match ? [Number(match[1]), match[2] || 'px'] : [0, 'px'];
}

const swapHolds = new WeakMap<HTMLElement | SVGElement, Animation>();
const leavingSwaps = new WeakSet<HTMLElement | SVGElement>();
type SwapFrame = { opacity: number; scale: number; x: number; y: number; blur: number };
const swapFrames = new WeakMap<HTMLElement | SVGElement, { out: boolean; frame: SwapFrame }>();

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The enter/exit for content that swaps in place: fades between a hidden state (offset, scale,
 * blur, opacity) and the element's resting style. Use it as `in:swap` and `out:swap` with
 * different params, as `motion`'s `initial` and `exit` usually differ. Opacity is clamped, so
 * springy easings are safe. HTML and SVG surfaces share the same tracks; pop layout applies only to HTML.
 */
export function swap(
	node: HTMLElement | SVGElement,
	params: SwapParams = {},
	options?: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const {
		x,
		y,
		scale,
		blur,
		opacity = 0,
		duration = 0,
		delay = 0,
		easing = easeInOut,
		pop,
		skip,
		fade,
		extra
	} = params;
	const departing = options?.direction === 'out' || Boolean(pop);
	const returning = !departing && leavingSwaps.has(node);
	const painted = departing || returning ? getComputedStyle(node) : undefined;
	const matrix = painted
		? new DOMMatrixReadOnly(painted.transform === 'none' ? undefined : painted.transform)
		: undefined;
	const paintedOpacity = painted ? Number(painted.opacity) : 1;
	const paintedBlur = Number(painted?.filter.match(/blur\(([\d.]+)px\)/)?.[1] ?? 0);
	const paintedRotate = painted?.rotate ?? 'none';
	const interrupted = departing
		? node
				.getAnimations()
				.filter(
					(animation) =>
						animation.effect instanceof KeyframeEffect &&
						animation.effect
							.getKeyframes()
							.some(
								(frame) =>
									frame.opacity !== undefined ||
									frame.transform !== undefined ||
									frame.filter !== undefined
							)
				)
		: [];
	// Separate Svelte in/out transitions otherwise let a delayed intro start after its outro.
	// Hold the painted frame until the new outro starts, then let it own these properties.
	if (departing) {
		interrupted.forEach((animation) => animation.cancel());
		if (interrupted.length && !skip && (duration || fade?.duration)) {
			swapHolds.get(node)?.cancel();
			const hold = node.animate(
				[
					{
						opacity: paintedOpacity,
						transform: matrix?.toString() ?? 'none',
						filter: `blur(${paintedBlur}px)`,
						rotate: paintedRotate
					}
				],
				{ duration: 0, fill: 'forwards' }
			);
			swapHolds.set(node, hold);
		}
	}
	if (departing) leavingSwaps.add(node);
	else leavingSwaps.delete(node);
	if (!departing && node instanceof HTMLElement) restorePop(node);
	if (skip) return { duration: 0 };
	if (pop && node instanceof HTMLElement) popOut(node, typeof pop === 'object' ? pop : undefined);
	let [xValue, xUnit] = x === undefined ? [0, 'px'] : split(x);
	let [yValue, yUnit] = y === undefined ? [0, 'px'] : split(y);
	if (returning && matrix) {
		if (x !== undefined) {
			xValue = matrix.e;
			xUnit = 'px';
		}
		if (y !== undefined) {
			yValue = matrix.f;
			yUnit = 'px';
		}
	}
	// A popped node is placed by its box; its painted translate is Svelte's FLIP `fix()`, not motion.
	let shownX = departing && !pop ? (matrix?.e ?? 0) : 0;
	let shownY = departing && !pop ? (matrix?.f ?? 0) : 0;
	const paintedScale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
	let hiddenScale = returning ? paintedScale : (scale ?? 1);
	let shownScale = departing ? paintedScale : 1;
	let hiddenOpacity = returning ? paintedOpacity : opacity;
	let shownOpacity = departing ? paintedOpacity : 1;
	let hiddenBlur = returning ? paintedBlur : (blur ?? 0);
	let shownBlur = departing ? paintedBlur : 0;
	const moves = x !== undefined || y !== undefined;
	let run: { out: boolean; frame: SwapFrame } | undefined;
	let lastTick: number | undefined;
	const toPixels = (value: number, unit: string, axis: 'x' | 'y') => {
		if (!value || unit === 'px') return value;
		const style = getComputedStyle(node);
		if (unit === 'em') return value * parseFloat(style.fontSize);
		if (unit === 'rem')
			return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
		if (unit === '%')
			return (
				(value *
					(parseFloat(axis === 'x' ? style.width : style.height) ||
						node.getBoundingClientRect()[axis === 'x' ? 'width' : 'height'])) /
				100
			);
		if (unit === 'vw') return (value * innerWidth) / 100;
		if (unit === 'vh') return (value * innerHeight) / 100;
		return value;
	};
	let hiddenX = toPixels(xValue, xUnit, 'x');
	let hiddenY = toPixels(yValue, yUnit, 'y');
	// Svelte can cancel the other transition before invoking this one, and may reuse its
	// options on a reversal. Keep the last painted frame independently of its WAAPI styles.
	function begin() {
		const previous = swapFrames.get(node);
		if (run && previous === run) return;
		const current = previous?.frame;
		if (!departing) {
			swapHolds.get(node)?.cancel();
			swapHolds.delete(node);
		}
		if (current) {
			if (departing) {
				shownOpacity = current.opacity;
				shownScale = current.scale;
				shownX = current.x;
				shownY = current.y;
				shownBlur = current.blur;
			} else if (previous?.out) {
				hiddenOpacity = current.opacity;
				hiddenScale = current.scale;
				hiddenBlur = current.blur;
				if (x !== undefined) {
					xValue = hiddenX = current.x;
					xUnit = 'px';
				}
				if (y !== undefined) {
					yValue = hiddenY = current.y;
					yUnit = 'px';
				}
				if (node instanceof HTMLElement) restorePop(node);
			}
		}
		if (departing) leavingSwaps.add(node);
		else leavingSwaps.delete(node);
		lastTick = undefined;
		run = {
			out: departing,
			frame: current ?? {
				opacity: paintedOpacity,
				scale: paintedScale,
				x: shownX,
				y: shownY,
				blur: paintedBlur
			}
		};
		swapFrames.set(node, run);
	}
	function record(shown: number, visible: number) {
		if (!run || swapFrames.get(node) !== run) return;
		run.frame = {
			opacity: clamp01(hiddenOpacity + (shownOpacity - hiddenOpacity) * visible),
			scale: scale === undefined ? 1 : hiddenScale + (shownScale - hiddenScale) * shown,
			x: hiddenX * (1 - shown) + shownX * shown,
			y: hiddenY * (1 - shown) + shownY * shown,
			blur: Math.max(0, hiddenBlur + (shownBlur - hiddenBlur) * visible)
		};
	}

	/** `shown` drives the transform, `visible` opacity and blur; both 0 hidden, 1 at rest. */
	const frame = (shown: number, visible: number) => {
		begin();
		let css = `opacity: ${clamp01(hiddenOpacity + (shownOpacity - hiddenOpacity) * visible)};`;
		const transforms: string[] = [];
		const u = 1 - shown;
		if (moves)
			transforms.push(
				`translate(calc(${xValue * u}${xUnit} + ${shownX * shown}px), calc(${yValue * u}${yUnit} + ${shownY * shown}px))`
			);
		if (scale !== undefined)
			transforms.push(`scale(${hiddenScale + (shownScale - hiddenScale) * shown})`);
		if (transforms.length) css += `transform: ${transforms.join(' ')};`;
		if (blur || paintedBlur)
			css += `filter: blur(${Math.max(0, hiddenBlur + (shownBlur - hiddenBlur) * visible)}px);`;
		if (extra) css += extra(shown);
		return css;
	};
	const track = (t: number, shown: number, visible: number) => {
		if (departing && lastTick !== undefined && t > lastTick) return; // Svelte's reset after cancellation.
		lastTick = t;
		if (run && swapFrames.get(node) === run) {
			swapHolds.get(node)?.cancel();
			swapHolds.delete(node);
		}
		record(shown, visible);
	};
	if (!fade)
		return { delay, duration, easing, css: (t) => frame(t, t), tick: (t) => track(t, t, t) };
	// Two clocks: run linearly over the longer one and ease each property by elapsed time.
	const fadeDelay = fade.delay ?? 0;
	const total = Math.max(duration, fadeDelay + fade.duration);
	const fadeEasing = fade.easing ?? easeInOut;
	const outro = options?.direction === 'out';
	return {
		delay,
		duration: total,
		tick: (t) => {
			const elapsed = (outro ? 1 - t : t) * total;
			const move = duration ? easing(Math.min(1, elapsed / duration)) : 1;
			const faded = Math.max(0, elapsed - fadeDelay);
			const show = fade.duration
				? fadeEasing(Math.min(1, faded / fade.duration))
				: elapsed >= fadeDelay
					? 1
					: 0;
			track(t, outro ? 1 - move : move, outro ? 1 - show : show);
		},
		css: (t) => {
			const elapsed = (outro ? 1 - t : t) * total;
			const move = duration ? easing(Math.min(1, elapsed / duration)) : 1;
			const faded = Math.max(0, elapsed - fadeDelay);
			const show = fade.duration
				? fadeEasing(Math.min(1, faded / fade.duration))
				: elapsed >= fadeDelay
					? 1
					: 0;
			return outro ? frame(1 - move, 1 - show) : frame(move, show);
		}
	};
}
