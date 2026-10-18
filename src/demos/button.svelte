<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Plus from '@lucide/svelte/icons/plus';
	import { Button } from '#arc/button';
	import { CopyButton } from '#arc/copy-button';
	import './actions.css';

	let status = $state('');
	let upload = $state<'idle' | 'loading' | 'done'>('idle');

	function startUpload() {
		upload = 'loading';
		setTimeout(() => {
			upload = 'done';
			status = 'Upload complete';
			setTimeout(() => (upload = 'idle'), 1800);
		}, 1200);
	}
</script>

{#snippet uploaded()}<Check size={16} /> Uploaded{/snippet}
{#snippet uploadIdle()}Upload file{/snippet}

<div class="actions-preview">
	<div class="actions-surface">
		<div class="examples">
			<div class="example">
				<span class="example-label">Styles</span>
				<div class="example-row">
					<Button onclick={() => (status = 'Changes saved')}>Save changes</Button>
					<Button variant="secondary" onclick={() => (status = 'Draft saved')}>Secondary</Button>
					<Button variant="ghost" onclick={() => (status = 'Preview opened')}>Ghost</Button>
					<Button variant="danger" onclick={() => (status = 'Delete requested')}>Delete</Button>
				</div>
			</div>
			<div class="example">
				<span class="example-label">Icons and sizes</span>
				<div class="example-row">
					<Button variant="secondary" size="sm" onclick={() => (status = 'Item added')}>
						<Plus size={16} /> Add item
					</Button>
					<Button onclick={() => (status = 'Continuing')}>
						Continue <ArrowRight size={16} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="icon-button"
						aria-label="More options"
						title="More options"
						onclick={() => (status = 'More options opened')}
					>
						<Ellipsis size={18} />
					</Button>
					<Button variant="secondary" size="lg" onclick={() => (status = 'Large button selected')}>
						Large
					</Button>
				</div>
			</div>
			<div class="example">
				<span class="example-label">Feedback and states</span>
				<div class="example-row">
					<CopyButton value="https://example.com/components/button" label="Copy link" />
					<CopyButton value="https://example.com/components/button" label="Copy link" iconOnly />
					<Button
						variant="secondary"
						size="sm"
						loading={upload === 'loading'}
						onclick={startUpload}
						children={upload === 'done' ? uploaded : uploadIdle}
					/>
					<Button variant="secondary" size="sm" disabled>Disabled</Button>
				</div>
			</div>
		</div>
	</div>
	<div class="actions-status" role="status">{status}</div>
</div>

<style>
	.examples {
		display: grid;
		width: min(100%, 580px);
		justify-items: center;
		gap: 20px;
	}

	.example {
		display: grid;
		justify-items: center;
		gap: 9px;
	}

	.example-label {
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}

	.example-row {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.example-row :global(.icon-button) {
		width: var(--control-height-sm);
		padding-inline: 0;
	}
</style>
