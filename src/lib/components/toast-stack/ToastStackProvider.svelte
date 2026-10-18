<script lang="ts">
	import { untrack } from 'svelte';
	import { ToastQueue, setQueue } from './toast-stack-state.svelte';
	import type { ToastStackProviderProps } from './types';
	let { children, duration = 5000, limit = 12 }: ToastStackProviderProps = $props();
	setQueue(
		new ToastQueue(
			untrack(() => duration),
			untrack(() => limit)
		)
	);
</script>

{@render children?.()}
