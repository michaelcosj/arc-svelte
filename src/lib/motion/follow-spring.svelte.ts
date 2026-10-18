import { onDestroy, untrack } from 'svelte';
import { springTrajectory } from './physical-spring';
import type { SpringSpec } from './spring';

/** Analytical spring for a moving target. Retargets coalesce at the next frame without losing the current flight. */
export class FollowSpring {
	private spec: SpringSpec;
	#current = $state(0);
	#target = $state(0);
	#flightTarget = 0;
	#velocity = 0;
	#frame = 0;
	#started = 0;
	#pending = false;
	#sample: ReturnType<typeof springTrajectory> | undefined;
	constructor(value: number, spec: SpringSpec) {
		this.spec = spec;
		this.#current = this.#target = value;
		onDestroy(() => this.destroy());
	}
	get current() {
		return this.#current;
	}
	get target() {
		return this.#target;
	}
	set(value: number, options: { instant?: boolean } = {}) {
		untrack(() => {
			this.#target = value;
			if (options.instant) {
				this.destroy();
				this.#current = value;
				return;
			}
			if (this.#frame) {
				this.#pending = true;
				return;
			}
			if (value === this.#current) return;
			this.#start(performance.now());
			this.#frame = requestAnimationFrame(this.#tick);
		});
	}
	#start(now: number) {
		this.#started = now;
		this.#flightTarget = this.#target;
		this.#sample = springTrajectory(
			this.spec,
			this.#current,
			this.#target,
			'visualDuration' in this.spec ? 0 : this.#velocity
		);
	}
	#tick = (now: number) => {
		const state = this.#sample!(Math.max(0, Math.round(now - this.#started)) / 1000);
		this.#velocity = state.velocity;
		const done =
			Math.abs(this.#flightTarget - state.value) <= 0.001 && Math.abs(state.velocity) <= 0.01;
		this.#current = done ? this.#flightTarget : state.value;
		if (this.#pending) {
			this.#pending = false;
			this.#start(now);
		} else if (done) {
			this.#frame = 0;
			this.#velocity = 0;
			return;
		}
		this.#frame = requestAnimationFrame(this.#tick);
	};
	destroy() {
		if (this.#frame) cancelAnimationFrame(this.#frame);
		this.#frame = 0;
		this.#pending = false;
		this.#velocity = 0;
	}
}
