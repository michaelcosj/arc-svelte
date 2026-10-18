import { describe, it, expect } from 'vite-plus/test';
import { parseColor, toHex, contrast, hsvToRgb } from './colors';
describe('color conversion', () => {
	it('reads all supported formats without losing alpha', () => {
		for (const input of [
			'#f008',
			'rgb(255 0 0 / 53.33%)',
			'hsl(0 100% 50% / 53.33%)',
			'oklch(62.8% 0.258 29.2 / 53.33%)'
		]) {
			const color = parseColor(input)!;
			expect(color).not.toBeNull();
			expect(color.a).toBeCloseTo(136 / 255, 3);
			expect(toHex(color).slice(-2)).toBe('88');
		}
		expect(parseColor('not a color')).toBeNull();
	});
	it('preserves hue for gray values and composites transparent contrast', () => {
		expect(parseColor('#777', 219)?.h).toBe(219);
		const white = hsvToRgb(parseColor('#fff')!);
		expect(contrast(parseColor('#0000')!, white)).toBe(1);
		expect(contrast(parseColor('#000')!, white)).toBe(21);
	});
});
