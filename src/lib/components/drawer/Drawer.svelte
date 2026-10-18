<script lang="ts">
	import { Dialog as Primitive } from 'bits-ui';
	import { setDrawer } from './drawer-state.svelte';
	import type { DrawerProps } from './types';
	let {
		defaultOpen = false,
		open = $bindable(defaultOpen),
		onOpenChange,
		...props
	}: DrawerProps = $props();
	setDrawer({
		close: () => {
			open = false;
			onOpenChange?.(false);
		}
	});
</script>

<Primitive.Root bind:open {onOpenChange} {...props} />
