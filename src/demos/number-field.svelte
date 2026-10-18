<script lang="ts">
	import { NumberField } from '#arc/number-field';
	import './number-field-demo.css';
	let seats = $state(8),
		guests = $state(1);
</script>

<div class="arc-number-field-demo__preview">
	<div class="arc-number-field-demo">
		<NumberField
			label="Seats"
			min={1}
			max={10}
			bind:value={seats}
			scrub
			suffix={(n) => (n === 1 ? ' seat' : ' seats')}
			description={`$${(12 * seats + 4 * guests).toLocaleString('en-US')} per month, billed monthly`}
		/><NumberField
			label="Guest passes"
			size="sm"
			min={0}
			max={3}
			bind:value={guests}
			description="$4 each, up to 3 per workspace"
		/>
	</div>
</div>
