<script lang="ts">
	import Package from '@lucide/svelte/icons/package';
	import Truck from '@lucide/svelte/icons/truck';
	import Zap from '@lucide/svelte/icons/zap';
	import Store from '@lucide/svelte/icons/store';
	import { RadioCards } from '#arc/radio-cards';
	let plan = $state('double');
	let delivery = $state('standard');
</script>

{#snippet packageIcon()}<Package size={18} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet truckIcon()}<Truck size={18} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet zapIcon()}<Zap size={18} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet storeIcon()}<Store size={18} strokeWidth={1.75} aria-hidden="true" />{/snippet}

<div class="canvas">
	<div class="demo">
		<fieldset>
			<legend id="radio-cards-plan">Plan</legend>
			<RadioCards
				bind:value={plan}
				name="plan"
				aria-labelledby="radio-cards-plan"
				minColumnWidth={200}
				options={[
					{ value: 'single', label: 'One bag', description: '12 oz, whole bean', meta: '$18' },
					{
						value: 'double',
						label: 'Two bags',
						description: 'Two origins each month',
						meta: '$34'
					},
					{ value: 'bulk', label: 'Bulk', description: '5 lb for the office', meta: '$72' },
					{
						value: 'decaf',
						label: 'Decaf',
						meta: '$19',
						disabled: true,
						disabledReason: 'Back in stock October 14'
					}
				]}
			/>
		</fieldset>
		<fieldset>
			<legend id="radio-cards-delivery">Delivery</legend>
			<RadioCards
				bind:value={delivery}
				name="delivery"
				aria-labelledby="radio-cards-delivery"
				layout="list"
				options={[
					{
						value: 'standard',
						label: 'Standard',
						description: '5 to 7 business days',
						meta: 'Free',
						icon: packageIcon
					},
					{
						value: 'express',
						label: 'Express',
						description: '2 business days',
						meta: '$12',
						icon: truckIcon
					},
					{
						value: 'overnight',
						label: 'Overnight',
						description: 'Tomorrow by 10 am',
						meta: '$29',
						icon: zapIcon
					},
					{
						value: 'pickup',
						label: 'Pickup',
						meta: 'Free',
						icon: storeIcon,
						disabled: true,
						disabledReason: 'Not available for your address'
					}
				]}
			/>
		</fieldset>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.demo {
		display: grid;
		width: min(100%, 640px);
		gap: 24px;
		margin: 0;
		color: var(--foreground);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-body);
		line-height: var(--leading-body);
	}
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 10px;
		padding: 0 2px;
		color: var(--text-secondary);
		font-weight: 500;
	}
</style>
