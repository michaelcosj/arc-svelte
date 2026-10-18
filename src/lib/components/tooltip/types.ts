import type { Snippet } from 'svelte';

export interface TooltipProps {
	/** Plain text crossfades when it changes while open, and the bubble springs to the new size. */
	content: string | number | Snippet;
	/** The trigger, rendered through Bits UI's `child` snippet: spread `props` on your element. */
	child: Snippet<[{ props: Record<string, unknown> }]>;
	side?: 'top' | 'bottom' | 'left' | 'right';
}
