import type { Checkbox as CheckboxPrimitive } from 'bits-ui';
import type { ClassValue } from 'svelte/elements';

export interface CheckboxProps extends Omit<
	CheckboxPrimitive.RootProps,
	'class' | 'children' | 'child'
> {
	/** Visible label. Without it, pass aria-label; the fallback name is "Checkbox". */
	label?: string;
	/** Secondary copy under the label, linked through aria-describedby. */
	description?: string;
	class?: ClassValue;
}
