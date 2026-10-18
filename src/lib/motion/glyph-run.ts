export interface Glyph {
	id: string;
	char: string;
	order: number;
}
export interface GlyphRun {
	text: string;
	seq: number;
	glyphs: Glyph[];
}
const glyphs = (chars: string[], seq: number): Glyph[] =>
	chars.map((char, order) => ({ id: `${seq}:${order}`, char, order }));
/** Start a label with stable character identities for pop-layout transitions. */
export const createGlyphRun = (text: string): GlyphRun => ({
	text,
	seq: 0,
	glyphs: glyphs(Array.from(text), 0)
});
/** Keep shared leading/trailing runs of at least two characters; replace the changed middle. */
export function updateGlyphRun(current: GlyphRun, text: string): GlyphRun {
	if (current.text === text) return current;
	const prev = Array.from(current.text),
		next = Array.from(text);
	let start = 0,
		end = 0;
	while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
	while (
		end < prev.length - start &&
		end < next.length - start &&
		prev[prev.length - 1 - end] === next[next.length - 1 - end]
	)
		end++;
	if (start < 2) start = 0;
	if (end < 2) end = 0;
	const seq = current.seq + 1;
	return {
		text,
		seq,
		glyphs: [
			...current.glyphs.slice(0, start),
			...glyphs(next.slice(start, next.length - end), seq),
			...current.glyphs.slice(current.glyphs.length - end)
		]
	};
}
