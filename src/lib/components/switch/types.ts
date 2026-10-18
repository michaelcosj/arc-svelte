import type { Switch as SwitchPrimitive } from 'bits-ui';
import type { ClassValue } from 'svelte/elements';

export interface SwitchProps extends Omit<
	SwitchPrimitive.RootProps,
	'class' | 'children' | 'child'
> {
	/** Visible label inside the switch; also used as aria-label when none is passed. */
	label?: string;
	class?: ClassValue;
}
