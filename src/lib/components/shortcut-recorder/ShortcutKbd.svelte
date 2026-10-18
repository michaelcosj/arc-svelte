<script lang="ts">
	import type { ShortcutKbdProps } from './types';
	import './shortcut-recorder.css';
	let {
		children,
		label,
		pressed = false,
		size = 'md',
		class: className,
		ref = $bindable(null),
		...props
	}: ShortcutKbdProps = $props();
</script>

<kbd
	bind:this={ref}
	{...props}
	class={['arc-shortcut-recorder__kbd', className]}
	data-size={size}
	data-pressed={pressed || undefined}>{label ?? ''}{@render children?.()}</kbd
>
