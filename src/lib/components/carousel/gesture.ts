export const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));
export const project = (velocity: number, rate = 0.995) => ((velocity / 1000) * rate) / (1 - rate);
export const rubber = (overshoot: number, dimension: number) =>
	(overshoot * dimension * 0.55) / (dimension + 0.55 * overshoot);
export const unrubber = (distance: number, dimension: number) =>
	(distance * dimension) / (0.55 * Math.max(1, dimension - distance));
export function velocityOf(samples: [number, number][], now: number) {
	const recent = samples.filter(([time]) => now - time <= 90);
	if (recent.length < 2 || now - recent[recent.length - 1]![0] > 50) return 0;
	const [firstTime, firstX] = recent[0]!,
		[lastTime, lastX] = recent[recent.length - 1]!;
	return lastTime > firstTime ? (lastX - firstX) / ((lastTime - firstTime) / 1000) : 0;
}
