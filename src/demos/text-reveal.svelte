<script lang="ts">
	import { TextReveal } from '#arc/text-reveal';
	import { Button } from '#arc/button';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	let replay = $state(0);
</script>

<div class="preview">
	<div class="demo">
		<div class="copy">
			{#key replay}
				<TextReveal
					as="h3"
					class="title"
					text="Small details make every interaction feel considered"
				/>
				<TextReveal
					as="p"
					class="lead"
					delay={0.32}
					text="Each word rises out of its line and sharpens as it lands, once, when the title appears."
				/>
			{/key}
		</div>
		<Button variant="secondary" size="sm" onclick={() => replay++}
			><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />Replay</Button
		>
	</div>
</div>

<style>
	.preview {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.demo {
		display: grid;
		justify-items: start;
		gap: 28px;
		width: min(100%, 600px);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.copy {
		display: grid;
		gap: 16px;
	}
	.copy :global(.title) {
		max-width: 17ch;
		font-family: var(--font-display);
		font-size: clamp(var(--text-3xl), 6.4vw, var(--text-4xl));
		font-weight: 400;
		line-height: var(--leading-display);
		letter-spacing: var(--tracking-display);
	}
	.copy :global(.lead) {
		max-width: 44ch;
		color: var(--text-secondary);
		font-size: var(--text-base);
		line-height: var(--leading-body);
		letter-spacing: var(--tracking-body);
	}
</style>
