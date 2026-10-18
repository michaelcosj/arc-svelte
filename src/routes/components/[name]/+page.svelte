<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import '../../../demos/stage.css';

	let { data }: PageProps = $props();
	const Demo = $derived(data.demo);
	const compare = $derived(page.url.searchParams.has('compare'));
</script>

<svelte:head><title>{page.params.name} · Arc for Svelte</title></svelte:head>

<main class="stage-page" data-compare={compare || undefined}>
	{#if compare}<h1 class="stage-title">{page.params.name}</h1>{:else}<h1 class="stage-name">
			{page.params.name}
		</h1>{/if}
	<div id="preview-canvas" class="docs-canvas">
		<div class="preview-shell">
			<div class="preview-fit">
				{#if Demo}
					<Demo />
				{:else}
					<p>No demo for “{page.params.name}” yet.</p>
				{/if}
			</div>
		</div>
	</div>
</main>
