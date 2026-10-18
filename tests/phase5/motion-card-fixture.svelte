<script>
	import { CardStack } from '../../src/lib/components/card-stack';
	import '../../src/lib/foundation.css';
	import '../../src/app.css';
	const events = [];
	window.cardEvents = events;
</script>

{#snippet renderCard(x)}<div data-item={x} style="padding:24px">
		{x}<input aria-label="Nested" />
	</div>{/snippet}
<CardStack
	items={['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta']}
	getKey={(x) => x}
	getLabel={(x) => x}
	{renderCard}
	onDecide={(x, d) => events.push(['decide', x, d])}
	onUndo={(x, d) => events.push(['undo', x, d])}
	onReset={() => events.push(['reset'])}
/>
