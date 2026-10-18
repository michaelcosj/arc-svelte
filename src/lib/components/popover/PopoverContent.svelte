<script lang="ts">
	import { Popover as Primitive } from 'bits-ui';
	import type { PopoverContentProps } from './types';
	import './popover.css';

	let {
		ref = $bindable(null),
		class: className,
		align = 'start',
		sideOffset = 6,
		collisionPadding = 10,
		// Radix gives the panel role="dialog"; Bits UI doesn't.
		role = 'dialog',
		onInteractOutside,
		onCloseAutoFocus,
		...rest
	}: PopoverContentProps = $props();

	// Like Radix's non-modal popover, a click outside closes without pulling focus back to the trigger.
	let interactedOutside = false;
</script>

<Primitive.Portal>
	<Primitive.Content
		bind:ref
		{...rest}
		{align}
		{sideOffset}
		{collisionPadding}
		{role}
		onInteractOutside={(event) => {
			onInteractOutside?.(event);
			if (!event.defaultPrevented) interactedOutside = true;
		}}
		onCloseAutoFocus={(event) => {
			onCloseAutoFocus?.(event);
			if (!event.defaultPrevented && interactedOutside) event.preventDefault();
			interactedOutside = false;
		}}
		class={['arc-popover', className]}
	/>
</Primitive.Portal>
