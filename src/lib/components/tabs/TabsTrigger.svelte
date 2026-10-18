<script lang="ts">
	import type { TabsTriggerProps } from './types';
	import { Tabs as Primitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		value,
		class: className,
		children,
		...props
	}: TabsTriggerProps = $props();
</script>

<!-- The highlight lives in TabsList, scoped to this Tabs instance, so it glides between triggers but never flies in from another tab set. -->
<Primitive.Trigger {...props} bind:ref {value} class={['arc-tabs__trigger', className]}>
	<span class="arc-tabs__trigger-label">{@render children?.()}</span>
</Primitive.Trigger>
