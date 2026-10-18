/** Recent pointer travel in units per second, for drag releases and fling thresholds. */
export class PointerVelocity {
	#samples: { point: number; time: number }[];
	constructor(
		point: number,
		time: number,
		private window = 100
	) {
		this.#samples = [{ point, time }];
	}
	push(point: number, time: number) {
		this.#samples.push({ point, time });
		this.#samples = this.#samples.filter((sample) => time - sample.time <= this.window);
	}
	at(point: number, time: number) {
		const first = this.#samples[0];
		return first && time > first.time ? (1000 * (point - first.point)) / (time - first.time) : 0;
	}
}
