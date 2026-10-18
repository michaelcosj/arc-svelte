import { onDestroy, untrack } from 'svelte';
import { Tween } from 'svelte/motion';
import { PhysicalSpring } from './physical-spring.svelte';
import type { SpringSpec } from './spring';
import { motionTokens as m } from './tokens';

/** Fixed box flights use the source spring solution; passive resizes snap unless already travelling. */
export class PointerHighlight {
	#axes = $state.raw<PhysicalSpring[]>([]);
	#target = $state.raw([0, 0, 0, 0]);
	readonly opacity = new Tween(0);
	readonly box: { readonly current: number[]; readonly target: number[] };
	constructor(private options: () => { spec: SpringSpec; reduced?: boolean }) {
		this.#axes = [0, 0, 0, 0].map((value) => new PhysicalSpring(value, untrack(options).spec));
		const current = () => this.#axes.map((axis) => axis.current);
		const target = () => this.#target;
		this.box = {
			get current() {
				return current();
			},
			get target() {
				return target();
			}
		};
		onDestroy(() => this.#axes.forEach((axis) => axis.destroy()));
	}
	move(rect: number[], instant = false) {
		const { spec, reduced } = this.options();
		this.#target = rect;
		this.#axes.forEach((axis, index) => {
			void axis.to(rect[index]!, spec, instant || reduced);
		});
	}
	follow(rect: number[]) {
		if (rect.every((value, i) => Math.abs(value - this.box.target[i]!) < 0.01)) return;
		const moving = this.box.current.some(
			(value, i) => Math.abs(value - this.box.target[i]!) >= 0.01
		);
		this.move(rect, !moving);
	}
	fade(to: number, duration: number) {
		void this.opacity.set(to, { duration, easing: m.ease.standard });
	}
}
