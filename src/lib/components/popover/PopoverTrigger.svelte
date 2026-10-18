<script lang="ts">
	import { Popover as Primitive } from 'bits-ui';
	import type { PopoverTriggerProps } from './types';
	import './popover.css';

	/** The trigger anchors the panel, so it opts out of press-scale: a scaled rect measured on open would shift the panel as the trigger springs back. */
	let { ref = $bindable(null), class: className, ...rest }: PopoverTriggerProps = $props();
</script>

<Primitive.Trigger bind:ref {...rest} class={['arc-popover__anchor', className]} />
