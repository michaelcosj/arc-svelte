import type { InkStroke, InkColor, InkWidth } from './ink';
export interface SignaturePadProps {
	/** Printed under the baseline, such as the signer's name. */
	signer?: string;
	/** Resting hint on the baseline before the first stroke. */
	hint?: string;
	defaultColor?: InkColor;
	defaultWidth?: InkWidth;
	/** Receives the strokes after every change. */
	onChange?: (strokes: InkStroke[]) => void;
	/** File name for exports, without extension. */
	fileName?: string;
	/** Accessible name of the drawing surface. */
	label?: string;
	class?: import('svelte/elements').ClassValue;
}
