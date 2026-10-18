<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Badge } from '#arc/badge';
	import { Button } from '#arc/button';
	import './demo.css';

	let approved = $state(false);
</script>

{#snippet check()}<Check size={13} />{/snippet}
{#snippet info()}<Info size={13} />{/snippet}
{#snippet alert()}<TriangleAlert size={13} />{/snippet}

<div class="demo-canvas">
	<div class="badge-demo">
		<div class="demo-row badge-preview">
			<Badge tone="success" icon={check} label="Ready" />
			<Badge
				tone={approved ? 'success' : 'info'}
				icon={approved ? check : info}
				label={approved ? 'Approved' : 'In review'}
			/>
			<Badge tone="warning" size="sm" icon={alert} label="Needs attention" />
			<Badge size="sm" label="Design system" />
		</div>
		<Button
			variant="secondary"
			size="sm"
			aria-pressed={approved}
			label={approved ? 'Reopen review' : 'Approve review'}
			onclick={() => (approved = !approved)}
		/>
	</div>
</div>

<style>
	.badge-demo {
		display: grid;
		justify-items: center;
		gap: 20px;
	}

	.badge-preview {
		justify-content: center;
		gap: 7px;
	}

	.badge-preview > :global(*) {
		animation: badge-in var(--duration-standard) var(--ease-enter) both;
	}

	.badge-preview > :global(:nth-child(2)) {
		animation-delay: 35ms;
	}

	.badge-preview > :global(:nth-child(3)) {
		animation-delay: 70ms;
	}

	.badge-preview > :global(:nth-child(4)) {
		animation-delay: 105ms;
	}

	@media (prefers-reduced-motion: reduce) {
		.badge-preview > :global(*) {
			animation: none;
		}
	}

	@keyframes badge-in {
		0% {
			opacity: 0;
			transform: translateY(4px) scale(0.98);
		}

		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
