import type { Attachment } from 'svelte/attachments';
import { cssEasing } from './easing';
import { springCurve, type SpringSpec } from './spring';

/** Moves a replacement element from the last painted position of another element with the same key.
 * Each instance scopes its keys to one widget. Layout keeps the destination's real size throughout.
 */
export class SharedPosition {
	#positions = new Map<string, { node: HTMLElement; box: DOMRect; animation?: Animation }>();
	constructor(private options: () => { reduced?: boolean; spec: SpringSpec }) {}

	/** Capture before a keyed branch moves its element to a different parent. */
	capture() {
		for (const entry of this.#positions.values()) {
			if (entry.node.isConnected) entry.box = entry.node.getBoundingClientRect();
		}
	}
	target(key: string): Attachment<HTMLElement> {
		return (node) => {
			const previous = this.#positions.get(key);
			const from = previous?.node.isConnected
				? previous.node.getBoundingClientRect()
				: previous?.box;
			previous?.animation?.cancel();
			const entry = {
				node,
				box: node.getBoundingClientRect(),
				animation: undefined as Animation | undefined
			};
			this.#positions.set(key, entry);
			if (from && !this.options().reduced) {
				const to = entry.box,
					x = from.left - to.left,
					y = from.top - to.top;
				if (Math.abs(x) + Math.abs(y) > 0.1) {
					const curve = springCurve(this.options().spec, Math.max(Math.abs(x), Math.abs(y)));
					entry.animation = node.animate(
						[{ transform: `translate(${x}px,${y}px)` }, { transform: 'translate(0px,0px)' }],
						{ duration: curve.duration, easing: cssEasing(curve.easing) }
					);
				}
			}
			return () => {
				if (node.isConnected) entry.box = node.getBoundingClientRect();
				entry.animation?.cancel();
			};
		};
	}
}
