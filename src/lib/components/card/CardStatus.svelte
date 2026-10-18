<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let { text }: { text: string } = $props();
	const mounted = new Mounted();
</script>

<span class="arc-card__status" role="status">
	<span class="arc-card__sr-only">{text}</span>
	<span class="arc-card__roll" aria-hidden="true">
		{#key text}
			<span
				class="arc-card__line"
				out:swap={{
					y: '-0.3em',
					blur: m.blur.subtle,
					duration: prefersReducedMotion.current ? 0 : m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}}
			>
				{#each text.split(/(\s+)/) as word, index (index)}
					<span
						class="arc-card__word"
						in:swap={{
							y: '0.3em',
							blur: m.blur.soft,
							duration: m.duration.standard,
							easing: m.ease.enter,
							delay: (index / 2) * m.stagger.word,
							skip: !mounted.current || prefersReducedMotion.current
						}}>{word}</span
					>
				{/each}
			</span>
		{/key}
	</span>
</span>
