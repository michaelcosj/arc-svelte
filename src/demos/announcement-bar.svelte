<script lang="ts">
	import { AnnouncementBar } from '#arc/announcement-bar';
	import { prefersReducedMotion } from 'svelte/motion';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { swap, motionTokens as m } from '#lib/motion';
	import './announcement-bar-demo.css';
	let open = $state(true),
		status = $state('');
	const target = Date.now() + 191520000;
	const messages = [
		{
			id: 'launch',
			message: 'Fieldwork 4.0 is here: docs, plans, and cycles in one place',
			action: { label: "See what's new", onClick: () => (status = 'Opened the 4.0 release notes') }
		},
		{
			id: 'pricing',
			message: 'Annual plans are 20% off.',
			countdown: { to: target, label: 'Ends in' },
			action: {
				label: 'Upgrade',
				onClick: () => (status = 'Opened checkout with the annual discount')
			}
		},
		{
			id: 'maintenance',
			message: 'Scheduled maintenance Sunday, 2:00 to 2:30 AM ET',
			action: { label: 'View status', onClick: () => (status = 'Opened the status page') }
		}
	];
</script>

<div class="demo-announcement-bar__canvas">
	<div class="demo-announcement-bar">
		<div class="demo-announcement-bar__stage">
			<AnnouncementBar
				{messages}
				tone="inverted"
				{open}
				onOpenChange={(value) => {
					open = value;
					if (!value) status = 'Announcement dismissed';
				}}
			/>
			<div class="demo-announcement-bar__page" aria-hidden={open || undefined}>
				<span class="demo-announcement-bar__line"></span><span
					class="demo-announcement-bar__line demo-announcement-bar__short"
				></span>{#if !open}<button
						type="button"
						class="demo-announcement-bar__again"
						in:swap={{
							y: prefersReducedMotion.current ? 0 : 4,
							duration: m.duration.standard,
							easing: m.ease.enter
						}}
						out:swap={{ duration: m.duration.instant }}
						onclick={() => {
							open = true;
							status = 'Showing the bar again';
						}}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />Show again</button
					>{/if}
			</div>
		</div>
		<span class="demo-announcement-bar__sr-only" aria-live="polite">{status}</span>
	</div>
</div>
