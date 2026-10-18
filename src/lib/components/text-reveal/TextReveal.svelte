<script lang="ts">
	import { motionTokens as m } from '#lib/motion';
	import type { TextRevealProps } from './types';
	import './text-reveal.css';

	let { text, as = 'h2', class: className, id, delay = 0 }: TextRevealProps = $props();
	const lines = $derived.by(() => {
		let position = 0;
		return text.split('\n').map((line) =>
			line
				.split(' ')
				.filter(Boolean)
				.map((word) => ({ word, position: position++ }))
		);
	});
	const count = $derived(lines.reduce((total, words) => total + words.length, 0));
	const step = $derived(
		Math.min(m.stagger.word, m.duration.considered / Math.max(count, 1)) / 1000
	);
</script>

<svelte:element
	this={as}
	{id}
	class={['arc-text-reveal', className]}
	style:--reveal-blur={`${as === 'p' ? m.blur.soft : m.blur.text}px`}
>
	<span class="arc-text-reveal__sr-only">{text.replaceAll('\n', ' ')}</span>
	{#each lines as words, lineIndex (lineIndex)}
		<span class="arc-text-reveal__line" aria-hidden="true"
			>{#each words as { word, position }, wordIndex (`${word}-${position}`)}<span
					class="arc-text-reveal__clip"
					><span
						class="arc-text-reveal__word"
						style:--reveal-delay={`${delay + position * step + lineIndex * step}s`}>{word}</span
					></span
				>{wordIndex < words.length - 1 ? ' ' : ''}{/each}</span
		>{lineIndex < lines.length - 1 ? ' ' : ''}
	{/each}
</svelte:element>
