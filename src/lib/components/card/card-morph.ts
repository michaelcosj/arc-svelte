import { cssEasing, motionTokens as m, springCurve } from '#lib/motion';

type Rect = { left: number; top: number; width: number; height: number };
type Snapshot = { surface: Rect; radius: number; pieces: Map<string, Rect> };
const parts = ['media', 'title', 'description', 'byline', 'action'];

/** Capture both surfaces in screen coordinates before a layout change. */
export function captureCard(node: HTMLElement): Snapshot {
	const pieces = new Map<string, Rect>();
	for (const part of parts) {
		const piece = node.querySelector<HTMLElement>(`.arc-card__${part}`);
		if (piece) pieces.set(part, piece.getBoundingClientRect());
	}
	return {
		surface: node.getBoundingClientRect(),
		radius: parseFloat(getComputedStyle(node).borderTopLeftRadius),
		pieces
	};
}

/** Move one opaque surface and correct its children so position-only text never stretches. */
export class CardMorph {
	#animations: Animation[] = [];

	cancel() {
		for (const animation of this.#animations) animation.cancel();
		this.#animations = [];
	}

	move(node: HTMLElement, from: Snapshot, returning = false) {
		this.cancel();
		const to = captureCard(node);
		const curve = springCurve({ visualDuration: returning ? 0.26 : 0.3, bounce: 0 });
		const count = 60;
		const interpolate = (a: number, b: number, progress: number) => a + (b - a) * progress;
		const frames: Keyframe[] = [];
		const pieceFrames = new Map<string, Keyframe[]>();
		for (let i = 0; i <= count; i++) {
			const progress = curve.easing(i / count);
			const left = interpolate(from.surface.left, to.surface.left, progress);
			const top = interpolate(from.surface.top, to.surface.top, progress);
			const sx = interpolate(from.surface.width / to.surface.width, 1, progress);
			const sy = interpolate(from.surface.height / to.surface.height, 1, progress);
			const radius = interpolate(from.radius, to.radius, progress);
			frames.push({
				transform: `translate(${left - to.surface.left}px, ${top - to.surface.top}px) scale(${sx}, ${sy})`,
				borderRadius: `${radius / sx}px / ${radius / sy}px`,
				transformOrigin: '0 0'
			});
			for (const [part, end] of to.pieces) {
				const start = from.pieces.get(part);
				if (!start) continue;
				const scale = part === 'media' || part === 'title';
				const width = scale ? interpolate(start.width, end.width, progress) : end.width;
				const height = scale ? interpolate(start.height, end.height, progress) : end.height;
				const x =
					(interpolate(start.left, end.left, progress) - left) / sx - (end.left - to.surface.left);
				const y =
					(interpolate(start.top, end.top, progress) - top) / sy - (end.top - to.surface.top);
				const list = pieceFrames.get(part) ?? [];
				list.push({
					transform: `translate(${x}px, ${y}px) scale(${width / end.width / sx}, ${height / end.height / sy})`,
					transformOrigin: '0 0'
				});
				pieceFrames.set(part, list);
			}
		}
		const options = { duration: curve.duration, fill: 'both' as const };
		this.#animations.push(node.animate(frames, options));
		for (const [part, keyframes] of pieceFrames) {
			const piece = node.querySelector<HTMLElement>(`.arc-card__${part}`);
			if (piece) this.#animations.push(piece.animate(keyframes, options));
		}
	}
}

/** The photo eases back faster than it zooms in. */
export function zoomCard(node: HTMLElement, hovered: boolean, reduced: boolean) {
	return node.animate(
		[
			{ transform: getComputedStyle(node).transform },
			{ transform: `scale(${hovered && !reduced ? 1.04 : 1})` }
		],
		{
			duration: reduced ? 0 : m.duration.considered * (hovered ? 2 : 1),
			easing: cssEasing(m.ease.standard),
			fill: 'forwards'
		}
	);
}
