import type { Progress as ProgressPrimitive } from 'bits-ui';
import type { ClassValue } from 'svelte/elements';

export interface ProgressProps extends Omit<
	ProgressPrimitive.RootProps,
	'class' | 'children' | 'child' | 'value' | 'max' | 'min'
> {
	value?: number;
	max?: number;
	/** Caption above the bar and the accessible name; a new label rises in as the old one lifts away. */
	label?: string;
	/** Show the counted percentage, with a check once it reaches 100%. */
	showValue?: boolean;
	class?: ClassValue;
}
