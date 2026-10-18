export { default as SignaturePad } from './SignaturePad.svelte';
export {
	getStrokeOutline,
	outlineToPath,
	strokePath,
	signatureToSvg,
	signatureToPng,
	PAD_WIDTH,
	PAD_HEIGHT,
	type InkPoint,
	type InkColor,
	type InkWidth,
	type InkStroke,
	type OutlineOptions
} from './ink';
export type { SignaturePadProps } from './types';
