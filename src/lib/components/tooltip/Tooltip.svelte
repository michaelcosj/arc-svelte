<script lang="ts">
	import { Tooltip as Primitive } from 'bits-ui';
	import TooltipText from './TooltipText.svelte';
	import type { TooltipProps } from './types';
	import { warmth } from './warmth.svelte';
	import './tooltip.css';

	let { content, child: trigger, side = 'top' }: TooltipProps = $props();

	const DELAY = 250;
	let open = $state(false);
	// Read when the tooltip opens, so the instant flag lands with the content that mounts.
	let instant = $state(false);

	$effect(() => {
		if (!open) return;
		warmth.opened();
		return warmth.closed;
	});
</script>

<Primitive.Provider delayDuration={DELAY} skipDelayDuration={0}>
	<Primitive.Root
		bind:open={
			() => open,
			(next) => {
				if (next) instant = warmth.warm;
				open = next;
			}
		}
		delayDuration={warmth.warm ? 0 : DELAY}
	>
		<Primitive.Trigger>
			{#snippet child({ props })}{@render trigger({ props })}{/snippet}
		</Primitive.Trigger>
		<Primitive.Portal>
			<Primitive.Content
				class="arc-tooltip"
				data-instant={instant || undefined}
				{side}
				sideOffset={8}
				collisionPadding={12}
			>
				{#if typeof content === 'string' || typeof content === 'number'}
					<TooltipText text={String(content)} />
				{:else}
					{@render content()}
				{/if}
			</Primitive.Content>
		</Primitive.Portal>
	</Primitive.Root>
</Primitive.Provider>
