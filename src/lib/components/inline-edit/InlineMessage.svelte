<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { HeightMorph, Mounted, easeInOut, motionTokens as m, swap } from '#lib/motion';
	import type { EditMessage } from './types';
	let {
		id,
		message,
		reduced,
		onRetry
	}: { id: string; message: EditMessage | null; reduced: boolean; onRetry: () => void } = $props();
	const height = new HeightMorph(() => ({ reduced, follow: true, pinned: true }));
	const mounted = new Mounted();
</script>

<span class="arc-inline-edit__reveal" {@attach height.body}
	><span {id} class="arc-inline-edit__reveal-inner" aria-live="polite" {@attach height.content}>
		{#each message ? [message] : [] as item (item.key)}<span
				class="arc-inline-edit__message"
				data-tone={item.tone}
				in:swap={{
					y: reduced ? 0 : '0.3em',
					blur: reduced ? 0 : m.blur.soft,
					duration: reduced ? m.duration.fast : m.duration.standard,
					easing: reduced ? easeInOut : m.ease.enter,
					skip: !mounted.current
				}}
				out:swap={{
					y: reduced ? 0 : '-0.3em',
					blur: reduced ? 0 : m.blur.subtle,
					duration: reduced ? m.duration.instant : m.duration.fast,
					easing: reduced ? easeInOut : m.ease.standard,
					pop: true
				}}
				><CircleAlert
					class="arc-inline-edit__message-icon"
					size={14}
					strokeWidth={2}
					aria-hidden="true"
				/><span
					>{item.text}{#if item.retry}{' '}
						<button type="button" class="arc-inline-edit__retry" onclick={onRetry}>Try again</button
						>{/if}</span
				></span
			>{/each}
	</span></span
>
