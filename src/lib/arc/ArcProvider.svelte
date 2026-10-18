<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		setArcComponents,
		type ArcImageComponent,
		type ArcLinkComponent
	} from '../arc-provider.svelte';

	let {
		link,
		image,
		children
	}: { link?: ArcLinkComponent; image?: ArcImageComponent; children: Snippet } = $props();

	setArcComponents({
		get link() {
			return link;
		},
		get image() {
			return image;
		}
	});
</script>

{@render children()}
