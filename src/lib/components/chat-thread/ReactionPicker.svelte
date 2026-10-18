<script lang="ts">
	import { Popover, Toolbar } from 'bits-ui';
	import { tick } from 'svelte';
	import SmilePlus from '@lucide/svelte/icons/smile-plus';
	import { swap, springCurve, motionTokens as m } from '#lib/motion';
	import type { ChatThreadLabels } from './types';
	let {
		open,
		mine,
		reactions,
		reduced,
		labels,
		id,
		onToggle,
		onClose,
		onPick
	}: {
		open: boolean;
		mine: boolean;
		reactions: string[];
		reduced: boolean;
		labels: Required<ChatThreadLabels>;
		id: string;
		onToggle: () => void;
		onClose: () => void;
		onPick: (e: string) => void;
	} = $props();
	let wrap = $state<HTMLDivElement>(),
		trigger = $state<HTMLButtonElement | null>(null),
		below = $state(false);
	function toggle() {
		const scroller = wrap?.closest('[data-chat-scroller]');
		if (!open && wrap && scroller)
			below = wrap.getBoundingClientRect().top - scroller.getBoundingClientRect().top < 56;
		onToggle();
	}
</script>

<div
	bind:this={wrap}
	class="arc-chat-thread__picker-wrap"
	data-open={open || undefined}
	data-below={below || undefined}
>
	<Popover.Root
		{open}
		onOpenChange={(next) => {
			if (next) toggle();
			else onClose();
		}}
		><Popover.Trigger
			bind:ref={trigger}
			class="arc-chat-thread__react-button"
			aria-label={labels.addReaction}><SmilePlus size={16} strokeWidth={1.75} /></Popover.Trigger
		><Popover.ContentStatic
			forceMount
			trapFocus={false}
			onCloseAutoFocus={(e) => e.preventDefault()}
			onEscapeKeydown={(e) => {
				e.preventDefault();
				onClose();
				trigger?.focus({ preventScroll: true });
			}}
			onOpenAutoFocus={async (e) => {
				e.preventDefault();
				await tick();
				wrap?.querySelector<HTMLElement>('[data-emoji-index="0"]')?.focus({ preventScroll: true });
			}}
			>{#snippet child({ props, open: shown })}{#if shown}<div
						{...props}
						{id}
						class="arc-chat-thread__picker"
						data-mine={mine || undefined}
						in:swap={{
							scale: reduced ? 1 : 0.85,
							y: reduced ? 0 : below ? -6 : 6,
							...springCurve({ visualDuration: 0.3, bounce: 0.22 })
						}}
						out:swap={{
							scale: reduced ? 1 : 0.9,
							y: reduced ? 0 : below ? -4 : 4,
							duration: reduced ? 160 : 200
						}}
					>
						<Toolbar.Root
							loop
							orientation="horizontal"
							aria-label={labels.reactions}
							style="display:contents"
							>{#each reactions as emoji, index (emoji)}<Toolbar.Button
									class="arc-chat-thread__emoji"
									aria-label={labels.reactWith(emoji)}
									data-emoji-index={index}
									onclick={() => onPick(emoji)}
									><span
										in:swap={{
											y: reduced ? 0 : 6,
											...springCurve({ visualDuration: 0.3, bounce: 0.22 }),
											delay: reduced ? 0 : index * 25
										}}>{emoji}</span
									></Toolbar.Button
								>{/each}</Toolbar.Root
						>
					</div>{/if}{/snippet}</Popover.ContentStatic
		></Popover.Root
	>
</div>
