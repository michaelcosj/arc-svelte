import { linearEasing, type Easing } from './easing';

/**
 * A spring in `motion`'s terms: either physics (`stiffness`, `damping`, `mass`) or the
 * perceptual form (`visualDuration` in seconds plus `bounce`).
 */
export type SpringSpec =
	| { stiffness: number; damping: number; mass?: number }
	| { visualDuration: number; bounce?: number };

/** A spring rendered as a fixed curve: spread it into a transition, `Tween.set` or WAAPI options. */
export interface SpringCurve {
	/** Milliseconds until the spring settles. */
	duration: number;
	/** Progress over normalized time; overshoots past 1 when the spring bounces. */
	easing: Easing;
}

/** Converts either spring form to physics, using the same formula as `motion`. */
export function springPhysics(spec: SpringSpec): {
	stiffness: number;
	damping: number;
	mass: number;
} {
	if ('visualDuration' in spec) {
		const root = (2 * Math.PI) / (spec.visualDuration * 1.2);
		const stiffness = root * root;
		const damping = 2 * Math.min(1, Math.max(0.05, 1 - (spec.bounce ?? 0))) * Math.sqrt(stiffness);
		return { stiffness, damping, mass: 1 };
	}
	return { mass: 1, ...spec };
}

/**
 * Position over time (seconds) of a spring released at rest from 0 toward 1, with an optional
 * starting velocity in units per second.
 */
export function springPosition(spec: SpringSpec, velocity = 0): (t: number) => number {
	const { stiffness, damping, mass } = springPhysics(spec);
	const omega = Math.sqrt(stiffness / mass);
	const zeta = damping / (2 * Math.sqrt(stiffness * mass));
	// x(t) = 1 - y(t), y(0) = 1, y'(0) = -velocity.
	const v0 = -velocity;
	if (zeta < 1) {
		const wd = omega * Math.sqrt(1 - zeta * zeta);
		const b = (v0 + zeta * omega) / wd;
		return (t) => 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + b * Math.sin(wd * t));
	}
	if (zeta === 1) {
		const b = v0 + omega;
		return (t) => 1 - Math.exp(-omega * t) * (1 + b * t);
	}
	const s = omega * Math.sqrt(zeta * zeta - 1);
	const r1 = -zeta * omega + s;
	const r2 = -zeta * omega - s;
	const c2 = (v0 - r1) / (r2 - r1);
	const c1 = 1 - c2;
	return (t) => 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

const REST = 0.001;
const cache = new Map<string, SpringCurve>();

/**
 * Renders a `motion` spring as a duration plus easing, so it can drive Svelte transitions,
 * `Tween` and the Web Animations API. The easing's `css` is a `linear()` function, so
 * `cssEasing(curve.easing)` works too.
 *
 * Without `distance` the curve runs until it stays within 0.1% of the target. Pass the distance
 * the value travels (px, or the unit being animated) to end exactly where `motion` stops it: within
 * `restDelta` of the target and slower than `restSpeed` (0.5 and 2, or 0.005 and 0.01 under 5 units).
 *
 * `motionTokens.spring.*` are already converted; call this for one-off springs.
 */
export function springCurve(spec: SpringSpec, distance?: number): SpringCurve {
	const key = `${JSON.stringify(spec)}:${distance ?? ''}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const position = springPosition(spec);
	const step = 1 / 600;
	let settled = 0;
	if (distance && distance > 0) {
		const granular = distance < 5;
		const delta = (granular ? 0.005 : 0.5) / distance;
		const speed = (granular ? 0.01 : 2) / distance;
		for (let t = step; t < 10; t += step) {
			const velocity = (position(t + step / 2) - position(t - step / 2)) / step;
			if (Math.abs(1 - position(t)) <= delta && Math.abs(velocity) <= speed) {
				settled = t;
				break;
			}
		}
	} else {
		// Settled once it stays within REST of the target for 50ms.
		let calm = 0;
		for (let t = 0; t < 10; t += step) {
			if (Math.abs(1 - position(t)) < REST) {
				calm += step;
				if (calm >= 0.05) {
					settled = t - calm;
					break;
				}
			} else calm = 0;
		}
	}
	const seconds = Math.max(settled, step);
	const easing: Easing = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : position(p * seconds));
	const samples = Math.min(120, Math.max(30, Math.round(seconds * 60)));
	easing.css = linearEasing(easing, samples);
	const curve = { duration: Math.round(seconds * 1000), easing };
	cache.set(key, curve);
	return curve;
}

/**
 * Options for `new Spring(value, springOptions(spec))` from `svelte/motion`, matching a `motion`
 * spring. Svelte's spring integrates per 60fps frame, so physics are rescaled to frames. Use it
 * when the target keeps moving (pointer, drag) and velocity must carry over.
 */
export function springOptions(
	spec: SpringSpec,
	precision = 0.01
): { stiffness: number; damping: number; precision: number } {
	const { stiffness, damping, mass } = springPhysics(spec);
	return { stiffness: stiffness / mass / 3600, damping: damping / mass / 60, precision };
}
