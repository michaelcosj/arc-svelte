<script lang="ts">
	import { getArcComponents, type ArcLinkProps } from '../arc-provider.svelte';

	let { ref = $bindable(null), children, ...props }: ArcLinkProps = $props();
	const arc = getArcComponents();
	const Link = $derived(arc.link);
</script>

<!-- What Arc components render for a link: the provider's link component, or a plain anchor. -->
{#if Link}
	<Link bind:ref {...props} {children} />
{:else}
	<a bind:this={ref} {...props}>{@render children?.()}</a>
{/if}
