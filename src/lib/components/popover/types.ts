import type {
	PopoverCloseProps as BitsCloseProps,
	PopoverContentProps as BitsContentProps,
	PopoverRootProps as BitsRootProps,
	PopoverTriggerProps as BitsTriggerProps
} from 'bits-ui';

/** Bits UI's Popover root: `bind:open` plus `onOpenChange`. */
export type PopoverProps = BitsRootProps;
export type PopoverCloseProps = BitsCloseProps;
/** The trigger opts out of press-scale (`arc-popover__anchor`); with `child`, spread `props` on your element and keep `props.class`. */
export type PopoverTriggerProps = BitsTriggerProps;
/** Portalled, aligned to the trigger's start edge, 6px away and 10px from the viewport edges by default. */
export type PopoverContentProps = BitsContentProps;
