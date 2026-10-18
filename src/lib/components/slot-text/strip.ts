const DIGITS = '0123456789';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = LOWER.toUpperCase();
const classOf = (char: string) =>
	DIGITS.includes(char)
		? DIGITS
		: LOWER.includes(char)
			? LOWER
			: UPPER.includes(char)
				? UPPER
				: null;
function seeded(seed: number) {
	let state = seed >>> 0 || 1;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}
/** The source's deterministic reel, including descending digit wraps and letter fillers. */
export function buildStrip(from: string, to: string, spins: number, rising: boolean, seed: number) {
	if (from === to) return [to];
	const set = classOf(to);
	if (!set) return [from, to];
	if (set === DIGITS && classOf(from) === DIGITS) {
		const a = Number(from),
			b = Number(to);
		const steps = spins * 10 + (rising ? (b - a + 10) % 10 : (a - b + 10) % 10);
		return Array.from({ length: steps + 1 }, (_, i) => String((a + (rising ? i : -i) + 100) % 10));
	}
	const random = seeded(seed);
	const fillers = Array.from(
		{ length: Math.max(2, spins * 5 + 2) },
		() => set[Math.floor(random() * set.length)]!
	);
	return [from, ...fillers, to];
}
