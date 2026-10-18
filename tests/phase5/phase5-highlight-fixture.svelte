<script>
	import { Carousel } from '#arc/carousel';
	import { FloatingButtonGroup } from '#arc/floating-button-group';
	import { SwipeActions, SwipeActionsRow } from '#arc/swipe-actions';
	import { UserMenu } from '#arc/user-menu';
	import { ButtonGroup } from '#arc/button-group';
	import '../../src/lib/foundation.css';
	const kind = new URLSearchParams(location.search).get('kind');
	let reset = $state(0),
		events = $state([]);
	window.swipe = {
		reset: () => {
			reset++;
			events = [];
		},
		events: () => events
	};
	const items = [
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Longer Beta' },
		{ id: 'c', label: 'Gamma' }
	];
</script>

{#snippet slideA()}<p>One</p>{/snippet}
{#snippet slideB()}<p>Two</p>{/snippet}
{#snippet slideC()}<p>Three</p>{/snippet}
{#snippet icon()}<svg viewBox="0 0 24 24"><path d="M4 12h16" /></svg>{/snippet}
<main style="margin:40px;width:400px">
	{#if kind === 'user'}<UserMenu
			user={{ name: 'Ada Example', email: 'ada@example.test' }}
			defaultOpen
			portal={false}
			items={[{ label: 'Profile' }, { label: 'Settings' }]}
		/>{:else if kind === 'carousel'}{#key reset}<Carousel
				label="Fixture carousel"
				children={[slideA, slideB, slideC]}
				defaultIndex={1}
				slideSize="200px"
				onIndexChange={(i) => events.push(i)}
			/>{/key}{:else if kind === 'swipe'}{#key reset}<SwipeActions label="Fixture"
				><SwipeActionsRow
					label="Row"
					leading={[{ label: 'Read', icon, keepRow: true, onSelect: () => events.push('read') }]}
					trailing={[{ label: 'Archive', icon, onSelect: () => events.push('archive') }]}
					><p>Message</p></SwipeActionsRow
				></SwipeActions
			>{/key}{:else if kind === 'button'}<ButtonGroup
			label="Fixture"
			{items}
			collapseLabels={false}
		/>{:else}<FloatingButtonGroup label="Fixture" {items} />{/if}
</main>
