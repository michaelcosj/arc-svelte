<script lang="ts">
	import { getArcComponents, type ArcImageProps } from '../arc-provider.svelte';

	let {
		ref = $bindable(null),
		alt,
		fill,
		priority,
		loading,
		style,
		fetchpriority,
		...props
	}: ArcImageProps = $props();
	const arc = getArcComponents();
	const Image = $derived(arc.image);
	const fillStyle = 'position: absolute; inset: 0; width: 100%; height: 100%;';
</script>

<!-- What Arc components render for an image: the provider's image component, or a plain img. -->
{#if Image}
	<Image bind:ref {alt} {fill} {priority} {loading} {style} {fetchpriority} {...props} />
{:else}
	<img
		bind:this={ref}
		{alt}
		decoding="async"
		{...props}
		loading={loading ?? (priority ? 'eager' : 'lazy')}
		fetchpriority={priority ? 'high' : fetchpriority}
		style={fill ? `${fillStyle}${style ?? ''}` : style}
	/>
{/if}
