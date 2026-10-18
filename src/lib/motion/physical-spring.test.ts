import { describe, expect, it } from 'vite-plus/test';
import { springRestTime, springTrajectory, springPlayback } from './physical-spring';

describe('physical spring trajectories', () => {
	for (const damping of [8, 20, 30]) {
		it(`preserves initial conditions and derivative with damping ${damping}`, () => {
			const sample = springTrajectory({ stiffness: 100, damping }, 12, 35, -7);
			expect(sample(0).value).toBeCloseTo(12, 9);
			expect(sample(0).velocity).toBeCloseTo(-7, 9);
			for (const time of [0.05, 0.2, 0.8])
				expect(sample(time).velocity).toBeCloseTo(
					(sample(time + 0.00001).value - sample(time - 0.00001).value) / 0.00002,
					5
				);
			const end = sample(springRestTime(sample, 35) / 1000);
			expect(Math.abs(end.value - 35)).toBeLessThanOrEqual(0.002);
			expect(Math.abs(end.velocity)).toBeLessThanOrEqual(0.02);
		});
	}
	it('keeps a small bounced tail after a temporary rest frame', () => {
		const raw = springTrajectory({ visualDuration: 0.26, bounce: 0.12 }, 0, 1);
		const playback = springPlayback(raw, 1, 0.005, 0.01);
		expect(playback.duration % 50).toBe(0);
		let rested = false,
			resumed = false;
		for (let t = 1; t < playback.duration; t++) {
			const current = playback.sample(t / 1000);
			if (current.value === 1) rested = true;
			else if (rested) resumed = true;
		}
		expect(resumed).toBe(true);
		expect(playback.sample(playback.duration / 1000)).toEqual({ value: 1, velocity: 0 });
	});

	it('supports both directions of a zero-distance kick', () => {
		for (const velocity of [-40, 40]) {
			const sample = springTrajectory({ stiffness: 100, damping: 15 }, 50, 50, velocity);
			expect(Math.sign(sample(0.05).value - 50)).toBe(Math.sign(velocity));
			expect(springRestTime(sample, 50)).toBeGreaterThan(0);
		}
	});
});
