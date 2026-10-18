<script lang="ts">
	import { ResizablePanels } from '#arc/resizable-panels';
	import './resizable-panels-demo.css';
	const uid = $props.id();
	const panes = [
		{
			id: 'sidebar',
			label: 'Sidebar',
			defaultSize: 24,
			minSize: 96,
			collapsible: true,
			lines: [70, 52, 64]
		},
		{ id: 'content', label: 'Content', defaultSize: 46, minSize: 140, lines: [88, 76, 82, 54] },
		{
			id: 'details',
			label: 'Details',
			defaultSize: 30,
			minSize: 120,
			collapsible: true,
			lines: [62, 80, 46]
		}
	];
	let widths = $state([0, 0, 0]);
	function measure(node: HTMLDivElement, i: number) {
		const observer = new ResizeObserver(() => {
			widths[i] = Math.round(node.parentElement!.parentElement!.getBoundingClientRect().width);
		});
		observer.observe(node.parentElement!.parentElement!);
		return () => observer.disconnect();
	}
</script>

{#snippet pane(i: number)}<div
		class="arc-resizable-panels-demo__pane"
		{@attach (node) => measure(node, i)}
	>
		<div class="arc-resizable-panels-demo__paneTop">
			<span class="arc-resizable-panels-demo__label">{panes[i]!.label}</span><span
				class="arc-resizable-panels-demo__width"
				aria-hidden="true">{widths[i]} px</span
			>
		</div>
		<div class="arc-resizable-panels-demo__lines" aria-hidden="true">
			{#each panes[i]!.lines as width, index (index)}<span
					class="arc-resizable-panels-demo__line"
					style:width={`${width}%`}
				></span>{/each}
		</div>
	</div>{/snippet}
{#snippet a()}{@render pane(0)}{/snippet}{#snippet b()}{@render pane(
		1
	)}{/snippet}{#snippet c()}{@render pane(2)}{/snippet}
<figure class="arc-resizable-panels-demo__demo">
	<div class="arc-resizable-panels-demo__window">
		<ResizablePanels
			label="Three panes"
			children={panes.map((p, i) => ({
				...p,
				id: `${uid}-${p.id}`,
				class: i === 1 ? undefined : 'arc-resizable-panels-demo__side',
				children: [a, b, c][i]
			}))}
		/>
	</div>
</figure>
