<script>
	import Slider from '../../src/lib/components/slider/Slider.svelte';
	import BottomSheet from '../../src/lib/components/bottom-sheet/BottomSheet.svelte';
	import '../../src/lib/foundation.css';
	const q = new URLSearchParams(location.search),
		kind = q.get('kind'),
		scenario = q.get('case');
	let open = $state(true);
	let props = $state({});
	window.events = [];
	window.fixture = { set: (p) => (props = { ...props, ...p }), open: (v) => (open = v) };
	const record = (type, value) => window.events.push({ type, value });
</script>

<main style="width:500px;margin:40px">
	{#if kind === 'slider'}<Slider
			label="Release slider"
			defaultValue={scenario === 'kick' ? 100 : 40}
			step={10}
			{...props}
			onValueChange={(v) => record('change', v)}
			onValueCommit={(v) => record('commit', v)}
		/>
	{:else}<BottomSheet
			title="Release sheet"
			description="Motion fixture"
			bind:open
			initialDetent={scenario === 'stretch' ? 1 : 0}
			{...props}
			onDetentChange={(v) => record('detent', v)}
			onOpenChange={(v) => {
				open = v;
				record('open', v);
			}}><p>Sheet content</p></BottomSheet
		>{/if}
</main>
