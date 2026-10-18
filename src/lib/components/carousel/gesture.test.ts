import { describe, it, expect } from 'vite-plus/test';
import { clamp, project, rubber, unrubber, velocityOf } from './gesture';
describe('carousel gesture math', () => {
	it('bands and unbands edge travel without a discontinuity', () => {
		expect(rubber(0, 500)).toBe(0);
		for (const distance of [1, 20, 100, 600]) {
			const shown = rubber(distance, 500);
			expect(shown).toBeLessThan(distance);
			expect(shown).toBeLessThan(500);
			expect(unrubber(shown, 500)).toBeCloseTo(distance, 8);
		}
	});
	it('projects flicks with signed momentum and clamps destinations', () => {
		expect(project(1000)).toBeCloseTo(199, 8);
		expect(project(-1000)).toBeCloseTo(-199, 8);
		expect(clamp(-2, 0, 4)).toBe(0);
		expect(clamp(9, 0, 4)).toBe(4);
	});
	it('samples only recent motion and rejects a held or single sample', () => {
		expect(
			velocityOf(
				[
					[0, 0],
					[70, 70],
					[100, 130]
				],
				110
			)
		).toBe(2000);
		expect(
			velocityOf(
				[
					[0, 0],
					[70, 70],
					[100, 130]
				],
				151
			)
		).toBe(0);
		expect(velocityOf([[0, 0]], 10)).toBe(0);
		expect(
			velocityOf(
				[
					[50, 20],
					[50, 30]
				],
				60
			)
		).toBe(0);
	});
});
