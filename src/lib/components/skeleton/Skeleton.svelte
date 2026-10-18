<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { HeightMorph, Mounted, easeInOut, motionTokens as m, swap } from '#lib/motion';
	import type { SkeletonProps } from './types';
	import './skeleton.css';
	let {
		label = 'Loading content',
		lines = 3,
		avatar = false,
		class: className,
		children,
		loading = true
	}: SkeletonProps = $props();
	const count = $derived(Math.min(Math.max(Math.floor(lines), 1), 6));
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const height = new HeightMorph(() => ({ reduced }));
	$effect.pre(() => {
		void loading;
		height.changed();
	});
</script>

{#snippet placeholder(extra?: typeof className)}
	<div class={['arc-skeleton', extra]} role="status" aria-label={label} aria-busy="true">
		{#if avatar}<span class="arc-skeleton__avatar" aria-hidden="true"></span>{/if}
		<span class="arc-skeleton__lines" aria-hidden="true"
			>{#each Array.from({ length: count }) as _, index (index)}<span
					class="arc-skeleton__line"
					style:--index={index + (avatar ? 1 : 0)}
				></span>{/each}</span
		>
	</div>
{/snippet}

{#if children === undefined}
	{@render placeholder(className)}
{:else}
	<div class={className} aria-busy={loading} {@attach height.body}>
		<div class="arc-skeleton__frame" {@attach height.content}>
			{#key loading}
				<div
					in:swap={{
						y: !loading && !reduced ? 4 : 0,
						duration: reduced
							? m.duration.instant
							: loading
								? m.duration.fast
								: m.duration.standard,
						easing: loading ? m.ease.standard : m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						duration: reduced ? m.duration.instant : m.duration.fast,
						easing: easeInOut,
						pop: true
					}}
				>
					{#if loading}{@render placeholder()}{:else}{@render children()}{/if}
				</div>
			{/key}
		</div>
	</div>
{/if}
