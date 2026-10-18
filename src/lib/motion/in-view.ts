import type { Attachment } from 'svelte/attachments';

export interface InViewOptions {
	/** Stop observing after the first time the element enters. */
	once?: boolean;
	/** Root margin, as in `IntersectionObserver` (`'-80px 0px'`). */
	margin?: string;
	/** `'some'` (any pixel), `'all'`, or a visible fraction from 0 to 1. Defaults to `'some'`. */
	amount?: 'some' | 'all' | number;
	/** Scroll container to observe against. Defaults to the viewport. */
	root?: Element | null;
	onChange: (inView: boolean) => void;
}

/**
 * `useInView` / `whileInView` as an attachment:
 * `{@attach inView({ once: true, onChange: (v) => (shown = v) })}`.
 */
export function inView(options: InViewOptions): Attachment<Element> {
	return (node) => {
		if (typeof IntersectionObserver === 'undefined') {
			options.onChange(true);
			return;
		}
		const { once, margin, amount = 'some', root, onChange } = options;
		const threshold = amount === 'some' ? 0 : amount === 'all' ? 1 : amount;
		let seen = false;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry) return;
				const visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
				if (visible === seen) return;
				seen = visible;
				onChange(visible);
				if (visible && once) observer.disconnect();
			},
			{ root, rootMargin: margin, threshold }
		);
		observer.observe(node);
		return () => observer.disconnect();
	};
}
