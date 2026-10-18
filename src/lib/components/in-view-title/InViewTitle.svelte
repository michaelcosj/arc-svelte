<script lang="ts">
	const lateBoot =
		typeof window !== 'undefined' &&
		performance.now() > 2400 &&
		Boolean(document.querySelector('[data-arc-title-pending]'));

	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, inView, motionTokens as m } from '#lib/motion';
	import type { Attachment } from 'svelte/attachments';
	import type { InViewTitleProps } from './types';
	import './in-view-title.css';
	let {
		text,
		variant = 'blur',
		as = 'h2',
		lines,
		class: className,
		id,
		once = true
	}: InViewTitleProps = $props();
	const mounted = new Mounted();
	let seen = $state(false);
	let passed = $state(false);
	const instant = $derived(prefersReducedMotion.current || lateBoot);
	const visible = $derived(instant || seen || passed);
	const words = $derived(text.split(' ').filter(Boolean));
	const step = $derived(Math.min(m.stagger.word * 1.5, 400 / Math.max(words.length, 1)));
	const observe: Attachment<HTMLDivElement> = (node) => {
		const cleanup = inView({ once, amount: 0.45, onChange: (value) => (seen = value) })(node);
		const read = () => {
			if (node.getBoundingClientRect().top < 0) passed = true;
		};
		read();
		window.addEventListener('scroll', read, { passive: true });
		return () => {
			cleanup?.();
			window.removeEventListener('scroll', read);
		};
	};
	function track(delay: number, settle = 800) {
		return `--delay:${visible ? delay : 0}ms;--settle:${settle}ms;--blur-time:${settle * 0.78}ms;--fade-time:${settle * 0.56}ms`;
	}
</script>

<div
	class={['arc-in-view-title', !mounted.current && 'arc-in-view-title__pending', className]}
	data-arc-title-pending={!mounted.current || undefined}
	data-visible={visible}
	data-instant={instant}
	{@attach observe}
>
	{#if variant === 'wipe'}
		<div class="arc-in-view-title__wipe arc-in-view-title__part" style={track(0, 900)}>
			<svelte:element this={as} {id}>{text}</svelte:element>
		</div>
	{:else}
		<svelte:element this={as} {id} aria-label={text}>
			{#if variant === 'line'}
				{#each lines?.length ? lines : [text] as line, index (`${line}-${index}`)}
					<span class="arc-in-view-title__line-clip" aria-hidden="true"
						><span class="arc-in-view-title__part" style={track(index * m.stagger.line, 860)}
							>{line}</span
						></span
					>
				{/each}
			{:else}
				{#each words as word, index (`${word}-${index}`)}
					{#if variant === 'word'}
						<span class="arc-in-view-title__clip" aria-hidden="true"
							><span class="arc-in-view-title__part" style={track(index * step)}>{word}</span></span
						>
					{:else if variant === 'tracking'}
						<span
							class="arc-in-view-title__track-word arc-in-view-title__part"
							aria-hidden="true"
							style={track(index * m.stagger.char * 2, 900)}
							>{#each Array.from(word) as letter, letterIndex (letterIndex)}<span
									class="arc-in-view-title__part"
									style={`${track(index * m.stagger.char * 2, 1000)};--letter-x:${((Array.from(word).length - 1) / 2 - letterIndex) * 0.06}em`}
									>{letter}</span
								>{/each}</span
						>
					{:else}
						<span
							class="arc-in-view-title__blur-word arc-in-view-title__part"
							aria-hidden="true"
							style={track(index * step)}>{word}</span
						>
					{/if}{index < words.length - 1 ? ' ' : ''}
				{/each}
			{/if}
		</svelte:element>
	{/if}
</div>
