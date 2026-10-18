<script lang="ts">
	import { Countdown, toEpoch } from '#arc/countdown';
	import { Button } from '#arc/button';
	import './countdown-demo.css';
	const id = $props.id();
	const zone = 'America/Los_Angeles';
	const dateParts = new Intl.DateTimeFormat('en-US', {
		timeZone: zone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		weekday: 'short'
	});
	const displayDate = new Intl.DateTimeFormat('en-US', {
		timeZone: zone,
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
	let scheduled = $state<number | null>(null),
		override = $state<number | null>(null),
		live = $state(false);
	const target = $derived(override ?? scheduled);
	const sessions = [
		{ title: 'Keynote', offset: 0 },
		{ title: 'Design systems deep dive', offset: 5400000 },
		{ title: 'Live Q&A with the team', offset: 11700000 }
	];
	$effect(() => {
		const time = Date.now();
		for (let day = 2; day < 10; day++) {
			const p = Object.fromEntries(
				dateParts.formatToParts(new Date(time + 86400000 * day)).map((p) => [p.type, p.value])
			);
			if (p.weekday === 'Tue') {
				scheduled = toEpoch(`${p.year}-${p.month}-${p.day}T10:00:00`, zone);
				break;
			}
		}
		scheduled ??= time + 432000000;
	});
</script>

<div class="demo-countdown__canvas">
	<section class="demo-countdown__card" aria-labelledby={id}>
		<div class="demo-countdown__head">
			<h3 {id} class="demo-countdown__title">Fieldwork 2.0 keynote</h3>
			<p class="demo-countdown__meta">
				{scheduled === null
					? '\u00a0'
					: `${displayDate.format(new Date(scheduled))} · 10:00 AM PT · Streamed online`}
			</p>
		</div>
		<div class="demo-countdown__hero">
			{#if target !== null}<Countdown
					{target}
					label="Keynote starts in"
					completeLabel="Live now"
					onComplete={() => (live = true)}
				/>{/if}
		</div>
		<ul class="demo-countdown__sessions">
			{#each sessions as session (session.title)}<li class="demo-countdown__session">
					<span class="demo-countdown__session-title">{session.title}</span
					>{#if target !== null}<Countdown
							variant="compact"
							target={target + session.offset}
							label={`${session.title} starts in`}
							completeLabel="Live"
						/>{/if}
				</li>{/each}
		</ul>
		<div class="demo-countdown__actions">
			<p class="demo-countdown__sr-only" aria-live="polite">
				{live ? 'The keynote is live.' : override ? 'Schedule moved ten seconds ahead' : ''}
			</p>
			{#if override === null}<Button
					variant="secondary"
					size="sm"
					label="Skip to final 10 seconds"
					onclick={() => {
						override = Date.now() + 10500;
						live = false;
					}}
				/>{:else}<Button
					variant="ghost"
					size="sm"
					label="Reset"
					onclick={() => {
						override = null;
						live = false;
					}}
				/>{/if}
		</div>
	</section>
</div>
