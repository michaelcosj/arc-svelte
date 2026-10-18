<script lang="ts">
	import { HoverCard, HoverCardProfile } from '#arc/hover-card';
	import Clock from '@lucide/svelte/icons/clock';
	const image =
		'https://uiarc.dev/_next/image?url=%2Fmedia%2Fpeople%2Fjasmine-brooks.jpg&w=48&q=75';
	const time = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'America/Toronto'
	})
		.format(new Date())
		.replace('AM', 'am')
		.replace('PM', 'pm');
</script>

<div class="demo">
	<HoverCard>
		{#snippet child({ props })}<button {...props} type="button" class="mention" data-scene-target
				><img src={image} alt="" width="48" height="48" class="mentionFace" /><span
					>Jasmine Brooks</span
				></button
			>{/snippet}
		{#snippet content()}<HoverCardProfile
				name="Jasmine Brooks"
				role="Engineering manager, Billing"
				bio="Leads the billing team of seven. Runs the Tuesday launch review."
				stats={[
					{ label: 'Reports', value: '7' },
					{ label: 'Launches this year', value: '18' }
				]}
			>
				{#snippet avatar()}<img src={image} alt="" width="48" height="48" />{/snippet}
				{#snippet meta()}<Clock size={13} strokeWidth={1.75} aria-hidden="true" /><span
						>{time} in Toronto</span
					>{/snippet}
			</HoverCardProfile>{/snippet}
	</HoverCard>
</div>

<style>
	.demo {
		display: grid;
		width: 100%;
		min-height: 160px;
		place-items: center;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.mention {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 3px 14px 3px 3px;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface-muted);
		color: var(--foreground);
		cursor: pointer;
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: var(--leading-body);
		transition:
			background-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
			border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.mentionFace {
		width: 28px;
		height: 28px;
		flex: none;
		border-radius: var(--radius-pill);
		object-fit: cover;
	}
	@media (hover: hover) and (pointer: fine) {
		.mention:hover {
			border-color: var(--border-strong);
		}
	}
	.mention[data-hover-card='open'] {
		border-color: var(--border-strong);
		background: color-mix(in oklab, var(--foreground) 8%, var(--surface));
	}
	@media (prefers-reduced-motion: reduce) {
		.mention {
			transition: none;
		}
	}
</style>
