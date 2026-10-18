<script lang="ts">
	import type { Snippet } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, Mounted, swap, heightPresence, HeightMorph } from '#lib/motion';
	// Whole-message swaps; number fields may supply independently measured word snippets.
	let {
		id,
		text,
		tone = 'hint',
		class: className,
		children
	}: {
		id: string;
		text?: string;
		tone?: 'hint' | 'error';
		class: string;
		children?: Snippet;
	} = $props();
	const mounted = new Mounted();
	const reduced = $derived(prefersReducedMotion.current);
	const height = new HeightMorph(() => ({ reduced, follow: true }));
</script>

{#each text ? [tone] : [] as key (key)}
	<span
		style="position:relative;display:block;overflow:hidden"
		in:heightPresence={{
			skip: !mounted.current,
			reduced,
			fade: { duration: m.duration.fast, easing: m.ease.inOut }
		}}
		out:heightPresence={{ reduced, fade: { duration: m.duration.instant, easing: m.ease.inOut } }}
	>
		<span style="display:block;position:relative" {@attach height.body}
			><span style="display:block" {@attach height.content}>
				{#if children}<span
						{id}
						class={className}
						in:swap={reduced
							? { skip: true }
							: {
									y: '.35em',
									blur: m.blur.soft,
									duration: m.duration.standard,
									easing: m.ease.enter,
									skip: !mounted.current
								}}>{@render children()}</span
					>{:else}
					{#key text}<span
							{id}
							class={className}
							role={tone === 'error' ? 'alert' : undefined}
							in:swap={reduced
								? { duration: m.duration.instant, skip: !mounted.current }
								: {
										y: '.35em',
										blur: m.blur.soft,
										duration: m.duration.standard,
										easing: m.ease.enter,
										skip: !mounted.current
									}}
							out:swap={{ duration: m.duration.instant, pop: true }}>{text}</span
						>{/key}{/if}
			</span></span
		></span
	>
{/each}
