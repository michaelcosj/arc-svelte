<script lang="ts">
	import { shortcutTokens } from './shortcut';
	import { usePlatform } from './shortcut-state.svelte';
	import type { ShortcutKeysProps } from './types';
	import ShortcutKbd from './ShortcutKbd.svelte';
	let {
		shortcut,
		platform: override,
		pressed,
		size = 'md',
		class: className
	}: ShortcutKeysProps = $props();
	const platform = usePlatform();
	const tokens = $derived(shortcutTokens(shortcut, override ?? platform.current));
</script>

<span
	class={['arc-shortcut-recorder__keys', className]}
	role="img"
	aria-label={tokens.map((t) => t.spoken).join(' ')}
	>{#each tokens as token, index (`${index}-${token.id}`)}<ShortcutKbd
			{size}
			pressed={pressed?.has(token.id)}
			aria-hidden="true"
			label={token.label}
		/>{/each}</span
>
