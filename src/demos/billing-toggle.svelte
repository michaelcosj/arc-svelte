<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { BillingPrice, BillingToggle } from '#arc/billing-toggle';
	import { motionTokens as m, Mounted, swap, type SwapParams } from '#lib/motion';
	import './demo.css';
	import './billing-toggle-demo.css';

	const plans = [
		{ id: 'solo', name: 'Solo', detail: 'One person, every device', monthly: 10, yearly: 8 },
		{ id: 'team', name: 'Team', detail: 'Shared spaces for up to 20', monthly: 20, yearly: 16 },
		{
			id: 'company',
			name: 'Company',
			detail: 'SSO, audit log, and admin roles',
			monthly: 40,
			yearly: 32
		}
	];

	let billing = $state('yearly');
	const yearly = $derived(billing === 'yearly');
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const noteIn = $derived<SwapParams>(
		!mounted.current
			? { skip: true }
			: {
					...(reduced ? {} : { y: 6, blur: m.blur.subtle }),
					duration: m.duration.standard,
					easing: m.ease.enter
				}
	);
	const noteOut = $derived<SwapParams>(
		reduced
			? { duration: 0 }
			: { y: -6, blur: m.blur.subtle, duration: m.duration.fast, easing: m.ease.standard }
	);
</script>

<div class="demo-canvas">
	<section class="demo-billing-card" aria-labelledby="billing-toggle-demo-title">
		<div class="demo-billing-card__head">
			<h3 id="billing-toggle-demo-title" class="demo-billing-card__title">Plans</h3>
			<BillingToggle
				bind:value={billing}
				options={[
					{ value: 'monthly', label: 'Monthly' },
					{ value: 'yearly', label: 'Yearly', badge: 'Save 20%', activeBadge: 'Saving 20%' }
				]}
			/>
		</div>
		<ul class="demo-billing-card__plans">
			{#each plans as plan (plan.id)}
				{@const note = yearly ? `$${plan.yearly * 12} billed yearly` : 'Billed monthly'}
				<li class="demo-billing-card__plan">
					<div class="demo-billing-card__copy">
						<p class="demo-billing-card__name">{plan.name}</p>
						<p class="demo-billing-card__detail">{plan.detail}</p>
					</div>
					<div class="demo-billing-card__price-cell">
						<BillingPrice
							class="demo-billing-card__price"
							amount={yearly ? plan.yearly : plan.monthly}
							was={yearly ? plan.monthly : undefined}
							period="/ mo"
						/>
						<span class="demo-billing-card__note">
							<span class="demo-billing-card__note-sizer" aria-hidden="true"
								>${plan.yearly * 12} billed yearly</span
							>
							{#key note}<span
									class="demo-billing-card__note-text"
									in:swap={noteIn}
									out:swap={noteOut}>{note}</span
								>{/key}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	</section>
</div>
