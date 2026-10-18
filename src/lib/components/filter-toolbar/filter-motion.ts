import { cssEasing, motionTokens as m, widthPresence } from '#lib/motion';
import type { TransitionConfig } from 'svelte/transition';
/** Collapse the real slot and its flex gap; the chip owns its own fade and scale. */
export function filterSlot(
	node: HTMLElement,
	{ gap, reduced, skip = false }: { gap: number; reduced: boolean; skip?: boolean },
	options?: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const track = widthPresence(node, { spring: m.spring.smooth, skip: reduced || skip }, options);
	if (!track.duration) return track;
	return {
		...track,
		css: (t, u) =>
			`${track.css?.(t, u).replace(/opacity:[^;]*;/, '')}margin-right:${-gap * (1 - (options?.direction === 'out' ? 1 - m.spring.smooth.easing(1 - t) : m.spring.smooth.easing(t)))}px;overflow:clip;--slot-moving:1;`
	};
}
/** Offset wrapped rows before paint while real slot widths move the neighboring chips. */
export function reflowGlide(node: HTMLElement, options: () => { reduced: boolean; armed: number }) {
	const tracks = new Map<
		HTMLElement,
		{ x: number; y: number; dx: number; dy: number; animation?: Animation }
	>();
	const check = () => {
		for (const child of [...node.children] as HTMLElement[]) {
			const x = child.offsetLeft,
				y = child.offsetTop,
				track = tracks.get(child);
			if (!track) {
				tracks.set(child, { x, y, dx: 0, dy: 0 });
				continue;
			}
			const jx = track.x - x,
				jy = track.y - y;
			track.x = x;
			track.y = y;
			if (
				options().reduced ||
				performance.now() > options().armed ||
				(Math.abs(jy) < 1 && Math.abs(jx) < 40)
			)
				continue;
			const painted = getComputedStyle(child).translate.split(' '),
				dx = (parseFloat(painted[0] ?? '0') || 0) + jx,
				dy = (parseFloat(painted[1] ?? '0') || 0) + jy;
			track.animation?.cancel();
			track.animation = child.animate(
				[{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }],
				{ duration: m.spring.smooth.duration, easing: cssEasing(m.spring.smooth.easing) }
			);
		}
		for (const [child, track] of tracks)
			if (child.parentElement !== node) {
				track.animation?.cancel();
				tracks.delete(child);
			}
	};
	const observer = new ResizeObserver(check),
		watch = () => {
			for (const child of node.children) observer.observe(child);
		};
	const mutations = new MutationObserver(() => {
		watch();
		check();
	});
	observer.observe(node);
	watch();
	mutations.observe(node, { childList: true });
	return () => {
		observer.disconnect();
		mutations.disconnect();
		for (const track of tracks.values()) track.animation?.cancel();
	};
}
