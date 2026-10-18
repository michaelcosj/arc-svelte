import type { CompareMetrics } from './types';

export const clamp = (value: number, low: number, high: number) =>
	Math.min(high, Math.max(low, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const rubber = (distance: number) =>
	Math.sign(distance) * (1 - 1 / ((Math.abs(distance) * 0.55) / 9 + 1)) * 9;
const give = (distance: number) => 12 * (1 - 1 / (distance / 12 + 1));
const soften = (at: number, size: number) =>
	at < 42 ? 42 - give(42 - at) : at > size - 42 ? size - 42 + give(at - size + 42) : at;
const fade = (room: number) => clamp(room / 28, 0, 1);

function halfPlane(w: number, h: number, center: [number, number], angle: number) {
	const nx = -Math.cos(angle),
		ny = -Math.sin(angle);
	const side = ([x, y]: [number, number]) => (x - center[0]) * nx + (y - center[1]) * ny;
	const corners: [number, number][] = [
			[0, 0],
			[w, 0],
			[w, h],
			[0, h]
		],
		points: [number, number][] = [];
	corners.forEach((corner, index) => {
		const next = corners[(index + 1) % 4]!,
			a = side(corner),
			b = side(next);
		if (a >= 0) points.push(corner);
		if (a >= 0 !== b >= 0) {
			const t = a / (a - b);
			points.push([corner[0] + (next[0] - corner[0]) * t, corner[1] + (next[1] - corner[1]) * t]);
		}
	});
	return points.length
		? `polygon(${points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`
		: 'inset(50%)';
}

export function comparisonGeometry(shown: number, angle: number, m: CompareMetrics) {
	const turn = clamp(angle / 90, 0, 1),
		p = clamp(shown, 0, 100);
	const center = (value: number): [number, number] => [
		lerp((value / 100) * m.w, m.w / 2, turn),
		lerp(m.h / 2, (value / 100) * m.h, turn)
	];
	const rest = angle === 0 || angle === 90 || !m.w;
	const clip =
		angle === 0 || !m.w
			? angle >= 45
				? `inset(0 0 ${(100 - p).toFixed(3)}% 0)`
				: `inset(0 ${(100 - p).toFixed(3)}% 0 0)`
			: angle === 90
				? `inset(0 0 ${(100 - p).toFixed(3)}% 0)`
				: halfPlane(m.w, m.h, center(p), (angle * Math.PI) / 180);
	const pivot = center(shown),
		x = (shown / 100) * m.w,
		y = (shown / 100) * m.h;
	const offset = m.w ? lerp(soften(x, m.w) - x, soften(y, m.h) - y, turn) : 0;
	const across = clamp(1 - turn * 3, 0, 1),
		down = clamp(turn * 3 - 2, 0, 1);
	return {
		clip,
		pivotX: rest ? (angle >= 45 ? '50%' : `${shown}%`) : `${pivot[0]}px`,
		pivotY: rest ? (angle >= 45 ? `${shown}%` : '50%') : `${pivot[1]}px`,
		handleX: offset * Math.cos((angle * Math.PI) / 180),
		handleY: offset * Math.sin((angle * Math.PI) / 180),
		beforeOpacity: m.w
			? across * fade((p / 100) * m.w - (12 + m.bw + 8)) +
				down * fade((p / 100) * m.h - (12 + m.bh + 8))
			: across + down,
		afterAcross: m.w ? across * fade(m.w - 12 - m.aw - 8 - (p / 100) * m.w) : across,
		afterDown: m.w ? down * fade(m.h - 12 - m.ah - 8 - (p / 100) * m.h) : down
	};
}
