<script lang="ts">
	import { Accordion } from '#arc/accordion';
</script>

<div class="preview accordion-preview">
	<Accordion
		defaultOpen={0}
		items={[
			{
				title: 'What is included?',
				content:
					'A focused set of accessible primitives, with sensible keyboard behavior and motion that respects reduced motion preferences.'
			},
			{
				title: 'Can I use this in a product?',
				content: 'Yes. Copy the component source and adjust the tokens to fit your product.'
			}
		]}
	/>
</div>

<style>
	/* previews-disclosure-feedback from the uiarc.dev gallery. */
	.preview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		width: 100%;
		min-width: 0;
		min-height: 118px;
		align-content: center;
		justify-items: center;
		gap: 14px;
		color: var(--foreground);
	}

	.preview > :global(*) {
		max-width: 100%;
	}

	.preview.accordion-preview {
		width: min(100%, 460px);
		min-height: 184px;
		margin-inline: auto;
		align-content: start;
		justify-items: stretch;
	}

	@media (max-width: 400px) {
		.preview.accordion-preview {
			min-height: 224px;
		}
	}

	@media (max-width: 520px) {
		.preview {
			min-height: 132px;
		}
	}
</style>
