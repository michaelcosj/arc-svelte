<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Pencil from '@lucide/svelte/icons/pencil';
	import X from '@lucide/svelte/icons/x';
	import { Mounted, easeInOut, motionTokens as m, swap } from '#lib/motion';
	import type { EditPhase } from './types';
	let {
		slot,
		noun,
		reduced,
		onSave,
		onCancel,
		onStart
	}: {
		slot: EditPhase | 'edit';
		noun: string;
		reduced: boolean;
		onSave: () => void;
		onCancel: () => void;
		onStart: () => void;
	} = $props();
	const mounted = new Mounted();
</script>

<span class="arc-inline-edit__slot">
	{#each [slot] as item (item)}
		<span
			class="arc-inline-edit__slot-item"
			in:swap={{
				scale: reduced ? 1 : 0.6,
				blur: reduced ? 0 : m.blur.subtle,
				...(reduced ? { duration: m.duration.fast } : m.spring.snappy),
				fade: reduced ? undefined : { duration: m.duration.fast, easing: m.ease.enter },
				skip: !mounted.current
			}}
			out:swap={{
				scale: reduced ? 1 : 0.6,
				blur: reduced ? 0 : m.blur.subtle,
				duration: reduced ? m.duration.instant : m.duration.fast,
				easing: reduced ? easeInOut : m.ease.standard
			}}
		>
			{#if item === 'edit'}<span class="arc-inline-edit__actions"
					><button
						type="button"
						class="arc-inline-edit__save"
						aria-label={`Save ${noun}`}
						onpointerdown={(event) => event.preventDefault()}
						onclick={onSave}><Check size={15} strokeWidth={2} aria-hidden="true" /></button
					><button
						type="button"
						class="arc-inline-edit__cancel"
						aria-label="Cancel editing"
						onpointerdown={(event) => event.preventDefault()}
						onclick={onCancel}><X size={15} strokeWidth={2} aria-hidden="true" /></button
					></span
				>
			{:else if item === 'saving'}<span class="arc-inline-edit__spinner" aria-hidden="true"></span>
			{:else if item === 'saved'}<span class="arc-inline-edit__saved" aria-hidden="true"
					><svg
						class="arc-inline-edit__drawn-check"
						width={16}
						height={16}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width={2.25}
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5" pathLength="1" /></svg
					></span
				>
			{:else if item === 'failed'}<CircleAlert
					class="arc-inline-edit__failed-icon"
					size={16}
					strokeWidth={1.75}
					aria-hidden="true"
				/>
			{:else}<Pencil
					class="arc-inline-edit__pencil"
					size={14}
					strokeWidth={1.75}
					aria-hidden="true"
					onclick={onStart}
				/>{/if}
		</span>
	{/each}
</span>
