<script lang="ts">
	import { Toolbar } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		children,
		...props
	}: Omit<Toolbar.ButtonProps, 'children' | 'child'> & { children?: Snippet } = $props();
</script>

<Toolbar.Button {...props}>
	{#snippet child({ props: buttonProps })}
		<!-- All tools remain Tab stops, as in the source; Bits still owns arrow navigation. -->
		<button {...buttonProps} tabindex={0}>{@render children?.()}</button>
	{/snippet}
</Toolbar.Button>
