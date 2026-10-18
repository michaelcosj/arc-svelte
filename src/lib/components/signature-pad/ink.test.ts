import { expect, it } from 'vite-plus/test';
import { getStrokeOutline, outlineToPath, signatureToSvg, type InkStroke } from './ink';
it('creates a finite closed dot for a stationary pointer', () => {
	const points = getStrokeOutline([{ x: 20, y: 30, p: -1, t: 0 }], { size: 5.6 });
	expect(points).toHaveLength(18);
	expect(points.flat().every(Number.isFinite)).toBe(true);
	expect(outlineToPath(points)).toMatch(/^M.*Z$/);
});
it('exports cropped print-colored ink without a background', () => {
	const strokes: InkStroke[] = [
		{
			id: 's',
			color: 'blue',
			width: 'medium',
			at: 0,
			points: [
				{ x: 20, y: 30, p: 0.4, t: 0 },
				{ x: 80, y: 60, p: 0.8, t: 30 }
			]
		}
	];
	const svg = signatureToSvg(strokes);
	expect(svg).toContain('viewBox="4 14 92 62"');
	expect(svg).toContain('fill="#1d3fae"');
	expect(svg).not.toContain('<rect');
	expect(signatureToSvg([])).toBe('');
});
