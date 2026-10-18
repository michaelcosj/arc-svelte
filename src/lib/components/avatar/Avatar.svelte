<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { ArcImage } from '#lib/arc/index.ts';
	import { motionTokens as m, swap, type SwapParams } from '#lib/motion';
	import type { AvatarProps } from './types';
	import './avatar.css';

	let {
		name,
		src,
		size = 'md',
		status,
		class: className,
		ref = $bindable(null),
		...props
	}: AvatarProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('')
	);
	let failedSrc = $state<string>();
	const showImage = $derived(src && failedSrc !== src);
	const sizes = $derived(
		size === 'xl' ? '88px' : size === 'lg' ? '48px' : size === 'md' ? '36px' : '28px'
	);

	// A photo that is already decoded shows at once. One that is still loading waits, then fades in from a soft blur.
	function loading(node: HTMLImageElement) {
		if (!node.complete) node.dataset.loading = '';
	}

	const dotIn = $derived<SwapParams>(reduced ? { skip: true } : { scale: 0.6, ...m.spring.snappy });
	const dotOut = $derived<SwapParams>(
		reduced ? { skip: true } : { scale: 0.6, duration: m.duration.fast }
	);
</script>

<span
	{...props}
	bind:this={ref}
	class={['arc-avatar', `arc-avatar--${size}`, className]}
	role="img"
	aria-label="{name}{status ? `, ${status}` : ''}"
>
	{#if showImage && src}
		{#key src}
			<ArcImage
				{src}
				alt=""
				fill
				{sizes}
				{@attach loading}
				onload={(event) => delete (event.currentTarget as HTMLImageElement).dataset.loading}
				onerror={() => (failedSrc = src)}
			/>
		{/key}
	{:else}
		<span class={src ? 'arc-avatar__fallback' : undefined} aria-hidden="true">{initials}</span>
	{/if}
	<!-- A keyed one-item list: a new status crossfades with the old, and a first status pops in. -->
	{#each status ? [status] : [] as current (current)}
		<i
			class={['arc-avatar__status', `arc-avatar--${current}`]}
			aria-hidden="true"
			in:swap={dotIn}
			out:swap={dotOut}
		></i>
	{/each}
</span>
