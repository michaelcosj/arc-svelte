import { onDestroy, untrack } from 'svelte';
import { PhysicalSpring } from './physical-spring.svelte';
import type { SpringSpec } from './spring';

/** A Svelte motion clock for discrete targets, preserving the source's physical or duration-defined spring semantics. */
export class TargetSpring {
	#spring: PhysicalSpring;
	#target = $state(0);
	constructor(
		value: number,
		public spec: SpringSpec,
		private rest?: { delta: number; speed: number }
	) {
		this.#spring = new PhysicalSpring(value, spec, rest);
		this.#target = value;
		onDestroy(() => this.destroy());
	}
	get current() {
		return this.#spring.current;
	}
	get target() {
		return this.#target;
	}
	get velocity() {
		return this.#spring.velocity;
	}
	get running() {
		return this.#spring.running;
	}
	set(value: number, options: { instant?: boolean; velocity?: number } = {}) {
		return untrack(() => {
			this.#target = value;
			if (this.rest && !options.instant)
				return this.#spring.set(value, {
					spec: this.spec,
					velocity:
						'visualDuration' in this.spec ? 0 : (options.velocity ?? this.#spring.frameVelocity())
				});
			return this.#spring.to(value, this.spec, options.instant, options.velocity);
		});
	}
	subscribe(listener: (value: number) => void) {
		return this.#spring.subscribe(listener);
	}
	stop() {
		return this.#spring.stop();
	}
	destroy() {
		this.#spring.destroy();
	}
}
