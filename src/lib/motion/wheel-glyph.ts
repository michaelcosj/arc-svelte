import { motionTokens } from './tokens';

/** Paint the nearest revolution of a digit wheel, feathering its two visible glyphs. */
export function wheelGlyphStyle(position: number, digit: number, base = 10): string {
	const offset = ((((digit - position) % base) + base * 1.5) % base) - base / 2;
	const distance = Math.abs(offset);
	const blur =
		distance < 0.02 || distance >= 1
			? 'none'
			: `blur(${(distance * motionTokens.blur.subtle).toFixed(2)}px)`;
	return `transform: ${offset ? `translateY(${offset}em)` : 'none'}; opacity: ${Math.max(0, 1 - distance)}; filter: ${blur}; visibility: ${distance >= 1 ? 'hidden' : 'visible'};`;
}
