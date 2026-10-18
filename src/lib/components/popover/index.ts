import { Popover as Primitive } from 'bits-ui';

export const Popover = Primitive.Root;
export const PopoverClose = Primitive.Close;
export { default as PopoverTrigger } from './PopoverTrigger.svelte';
export { default as PopoverContent } from './PopoverContent.svelte';
export type {
	PopoverProps,
	PopoverCloseProps,
	PopoverTriggerProps,
	PopoverContentProps
} from './types';
