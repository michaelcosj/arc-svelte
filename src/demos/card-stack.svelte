<script lang="ts">
	import Plane from '@lucide/svelte/icons/plane';
	import Sun from '@lucide/svelte/icons/sun';
	import Wallet from '@lucide/svelte/icons/wallet';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { CardStack, type CardDecision } from '#arc/card-stack';
	import './card-stack-demo.css';
	const places = [
		{
			code: 'LIS',
			city: 'Lisbon',
			country: 'Portugal',
			dates: '14–17 Oct',
			pitch: 'Tiled hills, long lunches, and a riverside workshop space for 18.',
			flight: '3h 35m direct from Berlin',
			weather: '22° and mostly sunny',
			price: 'From €780 per person'
		},
		{
			code: 'CPH',
			city: 'Copenhagen',
			country: 'Denmark',
			dates: '21–24 Oct',
			pitch: 'Harbour saunas, bikes for everyone, and a studio loft in Nørrebro.',
			flight: '1h 10m direct from Berlin',
			weather: '11° with light rain',
			price: 'From €1,140 per person'
		},
		{
			code: 'OPO',
			city: 'Porto',
			country: 'Portugal',
			dates: '14–17 Oct',
			pitch: 'A river-view warehouse by day and dinners in Ribeira by night.',
			flight: '3h 20m direct from Berlin',
			weather: '19° and clear',
			price: 'From €690 per person'
		},
		{
			code: 'KIX',
			city: 'Kyoto',
			country: 'Japan',
			dates: '3–9 Nov',
			pitch: 'Temple mornings, ryokan evenings, and a long flight to earn them.',
			flight: '15h 40m with one stop',
			weather: '17° and dry',
			price: 'From €2,380 per person'
		},
		{
			code: 'EDI',
			city: 'Edinburgh',
			country: 'Scotland',
			dates: '28–31 Oct',
			pitch: 'Old Town walks and a converted church for the team sessions.',
			flight: '2h 05m direct from Berlin',
			weather: '10° and breezy',
			price: 'From €920 per person'
		},
		{
			code: 'SVQ',
			city: 'Seville',
			country: 'Spain',
			dates: '21–24 Oct',
			pitch: 'Courtyard sessions under orange trees and very late tapas.',
			flight: '3h 30m direct from Berlin',
			weather: '26° and sunny',
			price: 'From €740 per person'
		}
	];
	let decisions = $state<{ city: string; decision: CardDecision }[]>([]);
	const shortlisted = $derived(decisions.filter((d) => d.decision === 'right').map((d) => d.city));
</script>

<div class="arc-card-stack-demo__demo">
	<CardStack
		items={places}
		getKey={(p) => p.code}
		getLabel={(p) => p.city}
		labels={{ left: 'Skip', right: 'Shortlist' }}
		outcomes={{ left: 'skipped', right: 'shortlisted' }}
		label="Offsite destinations"
		onDecide={(p, decision) => (decisions = [...decisions, { city: p.city, decision }])}
		onUndo={() => (decisions = decisions.slice(0, -1))}
		onReset={() => (decisions = [])}
	>
		{#snippet renderCard(place)}<div class="arc-card-stack-demo__destination">
				<div class="arc-card-stack-demo__destTop">
					<span>{place.code}</span><span>{place.dates}</span>
				</div>
				<div class="arc-card-stack-demo__destName">
					<h3>{place.city}</h3>
					<p>{place.country}</p>
				</div>
				<p class="arc-card-stack-demo__pitch">{place.pitch}</p>
				<ul class="arc-card-stack-demo__facts">
					<li><Plane size={16} strokeWidth={1.75} aria-hidden="true" />{place.flight}</li>
					<li><Sun size={16} strokeWidth={1.75} aria-hidden="true" />{place.weather}</li>
					<li><Wallet size={16} strokeWidth={1.75} aria-hidden="true" />{place.price}</li>
				</ul>
			</div>{/snippet}
		{#snippet renderEmpty(reset)}<div class="arc-card-stack-demo__summary">
				<p class="arc-card-stack-demo__summaryTitle">
					{shortlisted.length ? 'Shortlist ready' : 'Nothing shortlisted'}
				</p>
				<p class="arc-card-stack-demo__summaryText">
					{shortlisted.length ? shortlisted.join(', ') : 'Every destination was skipped.'}
				</p>
				<button type="button" class="arc-card-stack-demo__again" onclick={reset}
					><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Start over</button
				>
			</div>{/snippet}
	</CardStack>
</div>
