import { cubicBezier } from './easing';
import { springCurve, springOptions, type SpringSpec } from './spring';

const specs = {
	responsive: { stiffness: 520, damping: 38 },
	gentle: { stiffness: 340, damping: 34 },
	snappy: { visualDuration: 0.26, bounce: 0.12 },
	smooth: { visualDuration: 0.4, bounce: 0 },
	morph: { visualDuration: 0.42, bounce: 0.16 }
} as const satisfies Record<string, SpringSpec>;

/**
 * Arc's motion presets (`registry/motion-tokens.ts`), converted for Svelte:
 * durations and staggers are milliseconds, eases are easing functions, and springs are
 * `{ duration, easing }` curves that spread into a transition or `Tween.set`.
 *
 * `specs` holds the springs in `motion`'s own form, for `springCurve(spec, distance)`.
 * `physics` holds them as `svelte/motion` `Spring` options, for values that chase a moving target.
 */
export const motionTokens = {
	duration: { instant: 120, fast: 160, exit: 180, standard: 240, considered: 480 },
	ease: {
		enter: cubicBezier(0.16, 1, 0.3, 1),
		exit: cubicBezier(0.7, 0, 0.84, 0),
		standard: cubicBezier(0.22, 1, 0.36, 1),
		/** For elements that move while already on screen. */
		inOut: cubicBezier(0.65, 0, 0.35, 1)
	},
	spring: {
		responsive: springCurve(specs.responsive),
		gentle: springCurve(specs.gentle),
		/** Presses, toggles, thumbs, and small indicators. Settles fast with a hint of life. */
		snappy: springCurve(specs.snappy),
		/** Panels, height changes, and layout shifts. Critically damped, never overshoots. */
		smooth: springCurve(specs.smooth),
		/** Shape morphs, shared layout highlights, and width changes that follow new content. */
		morph: springCurve(specs.morph)
	},
	specs,
	physics: {
		responsive: springOptions(specs.responsive),
		gentle: springOptions(specs.gentle),
		snappy: springOptions(specs.snappy),
		smooth: springOptions(specs.smooth),
		morph: springOptions(specs.morph)
	},
	/** Stagger steps in milliseconds. Keep total stagger under roughly 400ms. */
	stagger: { char: 16, word: 40, line: 80, item: 35 },
	/** Blur radii in px for text and content crossfades. Keep blur small and brief. */
	blur: { subtle: 2, soft: 4, text: 8 }
} as const;

export type MotionTokens = typeof motionTokens;
