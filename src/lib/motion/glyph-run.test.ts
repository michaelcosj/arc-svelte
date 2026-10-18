import { describe, it, expect } from 'vite-plus/test';
import { createGlyphRun, updateGlyphRun } from './glyph-run';
describe('glyph identities during label changes', () => {
	it('keeps shared runs and gives replacement characters distinct identities', () => {
		const before = createGlyphRun('Save changes'),
			after = updateGlyphRun(before, 'Saved changes');
		expect(after.glyphs.map((g) => g.char).join('')).toBe('Saved changes');
		expect(after.glyphs.slice(0, 4).map((g) => g.id)).toEqual(
			before.glyphs.slice(0, 4).map((g) => g.id)
		);
		expect(after.glyphs.slice(-8).map((g) => g.id)).toEqual(
			before.glyphs.slice(-8).map((g) => g.id)
		);
		expect(new Set(after.glyphs.map((g) => g.id)).size).toBe(after.glyphs.length);
	});
	it('does not keep isolated affixes and survives empty or astral labels', () => {
		const first = createGlyphRun('a😀z'),
			next = updateGlyphRun(first, 'a!z');
		expect(next.glyphs.every((g) => !first.glyphs.some((old) => old.id === g.id))).toBe(true);
		const cleared = updateGlyphRun(next, '');
		expect(cleared.glyphs).toEqual([]);
		const restored = updateGlyphRun(cleared, '😀😀');
		expect(restored.glyphs).toHaveLength(2);
		expect(new Set(restored.glyphs.map((g) => g.id)).size).toBe(2);
	});
});
