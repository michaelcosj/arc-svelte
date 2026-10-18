import { untrack } from 'svelte';
import { Tween } from 'svelte/motion';
import { springTrajectory, springPlayback } from './physical-spring';
import type { SpringSpec } from './spring';

/** A Svelte Tween clock driving physical springs with explicit release velocity. */
export class PhysicalSpring {
	#clock = $state.raw(new Tween(0, { easing: (value) => value }));
	#run = $state.raw<{
		target: number;
		duration: number;
		sample: ReturnType<typeof springTrajectory>;
	}>();
	#sampledAt = 0;
	#previousAt = 0;
	#sampledValue = 0;
	#previousValue = 0;
	// Subscribers are imperative frame sinks; membership must not become an effect dependency.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#listeners = new Set<(value: number) => void>();
	#started = 0;
	#value: number;
	#spec: SpringSpec;
	#rest: { delta?: number; speed?: number };

	/** Optional rest thresholds retain a caller's finer precision for normalized values such as color channels. */
	constructor(value: number, spec: SpringSpec, rest: { delta?: number; speed?: number } = {}) {
		this.#rest = rest;
		this.#value = value;
		this.#spec = spec;
		this.#sampledValue = this.#previousValue = value;
	}
	get current() {
		const run = this.#run;
		return !run
			? this.#value
			: this.#clock.current >= run.duration
				? run.target
				: run.sample(this.#clock.current / 1000).value;
	}
	get running() {
		return Boolean(this.#run && this.#clock.current < this.#run.duration);
	}
	get velocity() {
		const run = this.#run;
		return !run || this.#clock.current >= run.duration
			? 0
			: run.sample(this.#clock.current / 1000).velocity;
	}
	jump(value: number) {
		untrack(() => {
			this.#sampledValue = this.#previousValue = value;
			this.#sampledAt = this.#previousAt = performance.now();
			void this.#clock.set(0, { duration: 0 });
			this.#run = { target: value, duration: 0, sample: () => ({ value, velocity: 0 }) };
			this.emit(value);
		});
	}
	set(
		target: number,
		options: { velocity?: number; spec?: SpringSpec; rest?: { delta: number; speed: number } } = {}
	) {
		return untrack(() => {
			const from = this.sampleNow();
			const raw = springTrajectory(
				options.spec ?? this.#spec,
				from.value,
				target,
				options.velocity ?? from.velocity
			);
			const rest = options.rest ?? this.#rest;
			const { duration, sample } = springPlayback(raw, target, rest.delta, rest.speed);
			void this.#clock.set(this.#clock.current, { duration: 0 });
			this.#clock = new Tween(0, {
				easing: (value) => value,
				interpolate: (from, to) => (progress) => {
					const elapsed = from + (to - from) * progress;
					const value = sample(elapsed / 1000).value;
					this.recordFrame(value);
					this.emit(value);
					return elapsed;
				}
			});
			this.#started = performance.now();
			const run = { target, duration, sample };
			this.#run = run;
			this.emit(from.value);
			return this.#clock.set(duration, { duration }).then(() => {
				if (this.#run !== run) return;
				this.recordFrame(target);
				this.emit(target);
			});
		});
	}
	/** Fixed-target source animation: time-defined springs start at rest and stop at distance-scaled thresholds. */
	to(target: number, spec: SpringSpec = this.#spec, instant = false, velocity?: number) {
		return untrack(() => {
			if (instant) {
				this.jump(target);
				return Promise.resolve();
			}
			const from = this.sampleNow();
			const granular = Math.abs(target - from.value) < 5;
			return this.set(target, {
				spec,
				velocity: 'visualDuration' in spec ? 0 : (velocity ?? this.frameVelocity()),
				rest: { delta: granular ? 0.005 : 0.5, speed: granular ? 0.01 : 2 }
			});
		});
	}

	/** Frame subscribers keep outgoing DOM glyphs moving while their Svelte block is paused. */
	subscribe(listener: (value: number) => void) {
		this.#listeners.add(listener);
		listener(this.current);
		return () => {
			this.#listeners.delete(listener);
		};
	}
	private emit(value: number) {
		for (const listener of this.#listeners) listener(value);
	}

	private recordFrame(value: number) {
		const now = performance.now();
		if (now !== this.#sampledAt) {
			this.#previousAt = this.#sampledAt;
			this.#previousValue = this.#sampledValue;
		}
		this.#sampledAt = now;
		this.#sampledValue = value;
	}

	/** Velocity estimated from painted frames, as a source motion value reports on retarget. */
	frameVelocity() {
		const now = performance.now();
		if (now - this.#sampledAt > 30) return 0;
		const sameFrame = now === this.#sampledAt;
		const before = sameFrame ? this.#previousValue : this.#sampledValue;
		const at = sameFrame ? this.#previousAt : this.#sampledAt;
		const delta = Math.min(now - at, 30);
		return delta > 0 ? ((this.sampleNow().value - before) / delta) * 1000 : 0;
	}

	/** Stop at the current event time, including elapsed time since the last RAF. */
	stop() {
		return untrack(() => {
			const value = this.sampleNow().value;
			this.jump(value);
			return value;
		});
	}
	private sampleNow() {
		const run = this.#run;
		if (!run) return { value: this.#value, velocity: 0 };
		const elapsed = Math.max(this.#clock.current, Math.round(performance.now() - this.#started));
		return elapsed >= run.duration
			? { value: run.target, velocity: 0 }
			: run.sample(elapsed / 1000);
	}

	destroy() {
		untrack(() => this.jump(this.current));
	}
}
