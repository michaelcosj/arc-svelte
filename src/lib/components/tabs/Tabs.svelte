<script lang="ts">
	import type { TabsProps } from './types';
	import { Tabs as Primitive } from 'bits-ui';
	import { setTabsState, TabsState } from './tabs-state.svelte';
	import './tabs.css';

	let {
		value = $bindable(''),
		onValueChange,
		ref = $bindable(null),
		class: className,
		children,
		...props
	}: TabsProps = $props();

	const tabs = setTabsState(
		new TabsState({
			get value() {
				return value;
			},
			setValue(next) {
				value = next;
				onValueChange?.(next);
			}
		})
	);

	$effect.pre(() => {
		tabs.root = ref;
	});
</script>

<Primitive.Root
	{...props}
	bind:ref
	bind:value={() => value, (next) => tabs.select(next)}
	class={['arc-tabs', className]}
>
	{@render children?.()}
</Primitive.Root>
