/** An easing function that can also describe itself as a CSS `<easing-function>`. */
export type Easing = ((t: number) => number) & { css?: string };

/**
 * A CSS-style cubic Bézier easing, `cubicBezier(.16, 1, .3, 1)`, usable as a Svelte `easing` and,
 * through `cssEasing`, as a CSS or Web Animations `easing`.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
	const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
	const solve = (x: number) => {
		let t = x;
		for (let i = 0; i < 8; i++) {
			const error = sampleX(t) - x;
			if (Math.abs(error) < 1e-6) return t;
			const slope = slopeX(t);
			if (Math.abs(slope) < 1e-6) break;
			t -= error / slope;
		}
		// Newton stalled: bisect.
		let lo = 0;
		let hi = 1;
		t = x;
		for (let i = 0; i < 30; i++) {
			const value = sampleX(t);
			if (Math.abs(value - x) < 1e-6) break;
			if (value < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return t;
	};
	const easing: Easing = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solve(t)));
	easing.css = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
	return easing;
}

/** `motion`'s default ease (`easeInOut`), used when a tween is given only a duration. */
export const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

/** CSS `ease-out`: what `motion` falls back to when it runs a duration-only tween on WAAPI (e.g. reduced-motion opacity). */
export const easeOut = cubicBezier(0, 0, 0.58, 1);

/** Samples an easing into a CSS `linear()` function. */
export function linearEasing(easing: (t: number) => number, samples = 40): string {
	const points: string[] = [];
	for (let i = 0; i <= samples; i++)
		points.push(String(Math.round(easing(i / samples) * 10000) / 10000));
	return `linear(${points.join(', ')})`;
}

/**
 * The CSS form of an easing, for `transition-timing-function`, inline styles and
 * `element.animate(..., { easing })`. Bézier and spring easings from this module return their
 * exact form; any other function is sampled into `linear()`.
 */
export function cssEasing(easing: Easing): string {
	return easing.css ?? linearEasing(easing);
}
