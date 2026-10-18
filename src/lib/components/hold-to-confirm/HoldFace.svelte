<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import HoldCheck from './HoldCheck.svelte';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';

	let {
		icon,
		text,
		done,
		width,
		reduced,
		measure
	}: {
		icon?: Snippet;
		text: string;
		done: boolean;
		width: number | undefined;
		reduced: boolean;
		measure?: Attachment<HTMLSpanElement>;
	} = $props();
	const mounted = new Mounted();
</script>

<span class="arc-hold-to-confirm__face">
	<span class="arc-hold-to-confirm__iconSlot">
		{#key done}
			<span
				class="arc-hold-to-confirm__iconPhase"
				in:swap={reduced
					? { duration: m.duration.fast, skip: !mounted.current }
					: {
							scale: 0.6,
							blur: m.blur.subtle,
							...m.spring.snappy,
							fade: { duration: m.duration.fast, easing: m.ease.enter },
							skip: !mounted.current
						}}
				out:swap={reduced
					? { duration: m.duration.instant }
					: { scale: 0.6, blur: m.blur.subtle, duration: m.duration.fast, easing: m.ease.standard }}
			>
				{#if done}
					<HoldCheck {reduced} animate={mounted.current} />
				{:else if icon}{@render icon()}{:else}<Trash2 strokeWidth={1.75} aria-hidden="true" />{/if}
			</span>
		{/key}
	</span>
	<span
		class="arc-hold-to-confirm__labelFrame"
		style:width={width === undefined ? 'auto' : `${width}px`}
	>
		{#if measure}<span class="arc-hold-to-confirm__measure" {@attach measure}>{text}</span>{/if}
		{#key text}
			<span
				class="arc-hold-to-confirm__label"
				in:swap={reduced
					? { duration: m.duration.fast, easing: m.ease.enter, skip: !mounted.current }
					: {
							y: '0.3em',
							blur: m.blur.soft,
							duration: m.duration.standard,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
				out:swap={reduced
					? { duration: m.duration.instant, pop: true }
					: {
							y: '-0.3em',
							blur: m.blur.subtle,
							duration: m.duration.fast,
							easing: m.ease.standard,
							pop: true
						}}>{text}</span
			>
		{/key}
	</span>
</span>
