import { springPhysics, type SpringSpec } from './spring';

/** Absolute spring displacement and velocity, including zero-distance velocity kicks. */
export function springTrajectory(spec: SpringSpec, from: number, target: number, velocity = 0) {
	const { stiffness, damping, mass } = springPhysics(spec);
	const omega = Math.sqrt(stiffness / mass);
	const decay = damping / (2 * mass);
	const displacement = from - target;
	if (decay < omega) {
		const frequency = Math.sqrt(omega * omega - decay * decay);
		const sine = (velocity + decay * displacement) / frequency;
		return (seconds: number) => {
			const cos = Math.cos(frequency * seconds),
				sin = Math.sin(frequency * seconds);
			const envelope = Math.exp(-decay * seconds);
			const offset = displacement * cos + sine * sin;
			return {
				value: target + envelope * offset,
				velocity:
					envelope *
					((sine * frequency - decay * displacement) * cos -
						(displacement * frequency + decay * sine) * sin)
			};
		};
	}
	if (Math.abs(decay - omega) < 1e-8) {
		const slope = velocity + omega * displacement;
		return (seconds: number) => {
			const envelope = Math.exp(-omega * seconds),
				offset = displacement + slope * seconds;
			return { value: target + envelope * offset, velocity: envelope * (slope - omega * offset) };
		};
	}
	const spread = Math.sqrt(decay * decay - omega * omega);
	const r1 = -decay + spread,
		r2 = -decay - spread;
	const c2 = (velocity - r1 * displacement) / (r2 - r1),
		c1 = displacement - c2;
	return (seconds: number) => {
		const first = c1 * Math.exp(r1 * seconds),
			second = c2 * Math.exp(r2 * seconds);
		return { value: target + first + second, velocity: r1 * first + r2 * second };
	};
}

export function springRestTime(
	sample: ReturnType<typeof springTrajectory>,
	target: number,
	delta = 0.002,
	speed = 0.02
) {
	for (let milliseconds = 0; milliseconds <= 10000; milliseconds += 1000 / 600) {
		const state = sample(milliseconds / 1000);
		if (Math.abs(state.value - target) <= delta && Math.abs(state.velocity) <= speed)
			return Math.ceil(milliseconds);
	}
	return 10000;
}

/** Source playback probes duration on a 50ms grid, but snaps each sampled rest
 * frame independently. An underdamped tail can leave the rest window again. */
export function springPlayback(
	raw: ReturnType<typeof springTrajectory>,
	target: number,
	delta = 0.002,
	speed = 0.02
) {
	const resting = (state: { value: number; velocity: number }) =>
		Math.abs(state.value - target) <= delta && Math.abs(state.velocity) <= speed;
	let duration = 0;
	while (duration < 10000 && !resting(raw(duration / 1000))) duration += 50;
	return {
		duration,
		sample: (seconds: number) => {
			const state = raw(seconds);
			return seconds * 1000 >= duration || resting(state) ? { value: target, velocity: 0 } : state;
		}
	};
}
