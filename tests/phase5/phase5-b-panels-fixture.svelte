<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { ResizablePanels, ResizablePanel } from '#arc/resizable-panels';
	import { cases } from './phase5-b-panels-data.js';
	let { scenario = 'collapse', initialWidth = 600 }: { scenario?: string; initialWidth?: number } =
		$props();
	let width = $state(untrack(() => initialWidth)),
		shown = $state(true);
	const panels = untrack(() => cases[scenario]);
	onMount(() => {
		window.logs = [];
		window.fixture = { resize: (next) => (width = next), remove: () => (shown = false) };
		return () => {
			delete window.fixture;
		};
	});
	function changed(values: number[]) {
		window.logs.push(values);
	}
</script>

<div id="fixture" style={`width:${width}px;height:240px;margin:24px`}>
	{#if shown}<ResizablePanels
			label="Fixture panels"
			class="custom-group"
			children={panels.map((p, i) => ({
				...p,
				class: ['custom-pane', { first: i === 0 }],
				children: [a, b, c, d][i]
			}))}
			onLayoutChange={changed}
		/>{/if}
</div>
{#snippet content(index: number)}<div style="padding:16px;height:100%">
		<p>{panels[index].label}</p>
		<button id={`button-${panels[index].id}`}>Focusable {panels[index].label}</button>
		<p>Content stays anchored and clipped while resizing.</p>
	</div>{/snippet}
{#snippet a()}{@render content(0)}{/snippet}{#snippet b()}{@render content(
		1
	)}{/snippet}{#snippet c()}{@render content(2)}{/snippet}{#snippet d()}{@render content(
		3
	)}{/snippet}

<div id="standalone">
	<ResizablePanel id="standalone-panel" label="Standalone" defaultSize={1}
		><span>Standalone content</span></ResizablePanel
	>
</div>
