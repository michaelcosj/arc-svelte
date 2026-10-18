import { Dialog as Primitive } from 'bits-ui';

export { default as Dialog } from './Dialog.svelte';
export { default as DialogContent } from './DialogContent.svelte';
/** Opens the dialog. Use Bits UI's `child` snippet to render your own button (React's `asChild`). */
export const DialogTrigger = Primitive.Trigger;
/** Closes the dialog. Use Bits UI's `child` snippet to render your own button (React's `asChild`). */
export const DialogClose = Primitive.Close;
export type { DialogContentProps, DialogProps } from './types';
