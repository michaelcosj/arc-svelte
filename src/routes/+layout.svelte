<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/geist';
	import '#lib/foundation.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import Sidebar from './Sidebar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// `?compare` renders the bare stage pinned where uiarc.dev's canvas sits, for screenshot diffs.
	const compare = $derived(page.url.searchParams.has('compare'));

	// `?theme=dark` and `?accent=violet` mirror the gallery's appearance switch.
	$effect(() => {
		const root = document.documentElement;
		root.dataset.theme = page.url.searchParams.get('theme') ?? 'light';
		root.dataset.accent = page.url.searchParams.get('accent') ?? 'neutral';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if compare}
	{@render children()}
{:else}
	<div class="shell">
		<Sidebar />
		<div class="body">{@render children()}</div>
	</div>
{/if}

<style>
	.shell {
		display: grid;
		grid-template-columns: 232px minmax(0, 1fr);
		min-height: 100dvh;
		background: var(--shell-bg);
		color: var(--shell-fg);
	}

	.body {
		display: grid;
		min-width: 0;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 32px;
	}

	@media (max-width: 760px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto 1fr;
		}

		.body {
			padding: 16px;
		}
	}
</style>
