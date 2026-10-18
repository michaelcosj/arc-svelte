import { onDestroy, untrack } from 'svelte';
import { Tween } from 'svelte/motion';
import { easeInOut, type Easing } from './easing';

type Value = number | Record<string, number>;
type Options = { duration?: number; delay?: number; easing?: Easing };

/** A Svelte tween that samples elapsed event time before interruption, rather than restarting from the previous RAF. */
export class TimedTween<T extends Value> {
	#clock = $state.raw(new Tween(0));
	#run = $state.raw<{ from: T; to: T; duration: number; delay: number; easing: Easing }>();
	#completion = $state.raw<{ end: number; resolve: () => void }>();
	#started = 0;
	constructor(private initial: T) {
		$effect(() => {
			const completion = this.#completion;
			if (completion && this.#clock.current >= completion.end)
				untrack(() => {
					this.#completion = undefined;
					completion.resolve();
				});
		});
		onDestroy(() => this.stop());
	}
	#at(elapsed: number): T {
		const run = this.#run;
		if (!run) return this.initial;
		if (elapsed >= run.delay + run.duration) return run.to;
		if (elapsed <= run.delay) return run.from;
		const p = run.easing((elapsed - run.delay) / run.duration);
		if (typeof run.from === 'number' && typeof run.to === 'number')
			return (run.from + (run.to - run.from) * p) as T;
		const from = run.from as Record<string, number>,
			to = run.to as Record<string, number>;
		return Object.fromEntries(
			Object.keys(to).map((key) => [key, from[key]! + (to[key]! - from[key]!) * p])
		) as T;
	}
	get current() {
		return this.#at(this.#clock.current);
	}
	set(to: T, { duration = 0, delay = 0, easing = easeInOut }: Options = {}) {
		return untrack(() => {
			const from = this.stop();
			this.#clock = new Tween(0);
			this.#started = performance.now();
			this.#run = { from, to, duration, delay, easing };
			void this.#clock.set(duration + delay, { duration: duration + delay, easing: (t) => t });
			if (duration + delay === 0) return Promise.resolve();
			// Tween's own promise settles on the frame *after* an exact endpoint.
			// Complete on the endpoint frame so chained presence/confirmation stays in sync.
			return new Promise<void>((resolve) => {
				this.#completion = { end: duration + delay, resolve };
			});
		});
	}
	stop() {
		return untrack(() => {
			const value = this.#at(
				this.#run ? Math.max(this.#clock.current, Math.round(performance.now() - this.#started)) : 0
			);
			void this.#clock.set(0, { duration: 0 });
			this.#completion = undefined;
			this.initial = value;
			this.#run = undefined;
			return value;
		});
	}
}
