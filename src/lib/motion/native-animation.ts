import { linearEasing } from './easing';
import { springPlayback, springTrajectory } from './physical-spring';
import type { SpringSpec } from './spring';

type Property = 'scale' | 'width' | 'opacity' | 'transform' | 'translate' | 'filter';
type Timing = { duration: number; easing: string };
const tracks = new WeakMap<HTMLElement, Map<Property, Animation>>();

/** An independently interruptible WAAPI track, with its final value committed inline. */
export function animateStyle(
	node: HTMLElement,
	property: Property,
	from: string,
	to: string,
	{ duration, easing }: Timing,
	end = to
) {
	let active = tracks.get(node);
	if (!active) tracks.set(node, (active = new Map()));
	active.get(property)?.cancel();
	active.delete(property);
	node.style[property] = end;
	if (!duration || from === to) return 0;
	const animation = node.animate([{ [property]: from }, { [property]: to }], {
		duration,
		easing,
		fill: 'both'
	});
	active.set(property, animation);
	void animation.finished
		.then(() => {
			if (active.get(property) !== animation) return;
			active.delete(property);
			animation.cancel();
			node.style[property] = end;
		})
		.catch(() => {});
	return duration;
}

export function cancelStyles(node: HTMLElement, ...properties: Property[]) {
	const active = tracks.get(node);
	for (const property of properties) {
		active?.get(property)?.cancel();
		active?.delete(property);
	}
}

/** Numeric tracks use their actual distance; native opacity springs resolve over a 0–100 range. */
export function springAnimation(
	spec: SpringSpec,
	from: number,
	to: number,
	native = false
): Timing {
	const start = native ? 0 : from,
		target = native ? 100 : to,
		distance = Math.abs(target - start),
		granular = distance < 5;
	const flight = springPlayback(
		springTrajectory(spec, start, target),
		target,
		granular ? 0.005 : 0.5,
		granular ? 0.01 : 2
	);
	if (!distance || !flight.duration) return { duration: 0, easing: 'linear' };
	const easing = (progress: number) =>
		(flight.sample((progress * flight.duration) / 1000).value - start) / (target - start);
	const samples = native
		? Math.max(Math.round(flight.duration / 10), 2) - 1
		: Math.max(120, Math.ceil(flight.duration / 0.5));
	return { duration: flight.duration, easing: linearEasing(easing, samples) };
}

/** Numeric duration tracks use the source's bounded Bézier solver; compositor fades use CSS. */
export function numericTween(
	duration: number,
	points: readonly [number, number, number, number]
): Timing {
	const [x1, y1, x2, y2] = points;
	const bezier = (t: number, a: number, b: number) =>
		((1 - 3 * b + 3 * a) * t + 3 * b - 6 * a) * t * t + 3 * a * t;
	const easing = (progress: number) => {
		if (progress <= 0 || progress >= 1) return progress;
		let low = 0,
			high = 1,
			t = 0;
		for (let i = 0; i < 12; i++) {
			t = (low + high) / 2;
			const error = bezier(t, x1, x2) - progress;
			if (Math.abs(error) <= 1e-7) break;
			if (error > 0) high = t;
			else low = t;
		}
		return bezier(t, y1, y2);
	};
	return { duration, easing: linearEasing(easing, Math.ceil(duration * 8)) };
}
