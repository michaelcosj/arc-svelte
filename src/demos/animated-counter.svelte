<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { AnimatedCounter } from '#arc/animated-counter';
	import './demo.css';

	let total = $state(12840);
</script>

<div class="demo-canvas">
	<button
		type="button"
		class="demo-counter-button"
		aria-label="Increase total"
		onclick={() => (total += 240)}
	>
		<AnimatedCounter value={total} label="Total responses" />
		<span class="demo-counter-hint">Click to simulate new responses <Plus size={14} /></span>
	</button>
</div>
