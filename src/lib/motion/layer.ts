import type { TransitionConfig } from 'svelte/transition';
import { swap, type SwapParams } from './swap';

/** Keep overlay state current during outros, when Svelte stops updating node attributes.
 * Closed layers can let pointer input through; interrupted intros restore their open state.
 */
export function layer(
	node: HTMLElement,
	params: SwapParams,
	options: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	node.dataset.state = options.direction === 'out' ? 'closed' : 'open';
	return swap(node, params, options);
}
