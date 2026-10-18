<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import { tooltipState } from './tooltip-state';
	import { warmth } from '../tooltip/warmth.svelte';
	import '#lib/components/tooltip/tooltip.css';

	let {
		side,
		content,
		child: trigger
	}: {
		side: 'top' | 'bottom' | 'left' | 'right';
		content: Snippet;
		child: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();
	const lateral = $derived(side === 'left' || side === 'right');
	let open = $state(false);
	let instant = $state(false);
	function close() {
		open = false;
	}
	onDestroy(() => {
		if (tooltipState.close === close) tooltipState.close = undefined;
	});
	$effect(() => {
		if (!open || lateral) return;
		warmth.opened();
		return warmth.closed;
	});
</script>

{#snippet root()}
	<Tooltip.Root
		bind:open={
			() => open,
			(next) => {
				if (next) {
					if (tooltipState.close !== close) tooltipState.close?.();
					tooltipState.close = close;
					instant = warmth.warm;
				} else if (tooltipState.close === close) tooltipState.close = undefined;
				open = next;
			}
		}
		delayDuration={lateral ? undefined : warmth.warm ? 0 : 250}
	>
		<Tooltip.Trigger>
			{#snippet child({ props })}{@render trigger({ props })}{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				role="tooltip"
				class={lateral ? 'arc-floating-button-group__sideTip' : 'arc-tooltip'}
				data-instant={!lateral && instant ? true : undefined}
				{side}
				sideOffset={lateral ? 10 : 8}
				collisionPadding={12}
			>
				{@render content()}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
{/snippet}

{#if lateral}
	{@render root()}
{:else}
	<Tooltip.Provider delayDuration={250} skipDelayDuration={0}>
		{@render root()}
	</Tooltip.Provider>
{/if}
