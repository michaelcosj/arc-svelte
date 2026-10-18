<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import Copy from '@lucide/svelte/icons/copy';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Download from '@lucide/svelte/icons/download';
	import Archive from '@lucide/svelte/icons/archive';
	import { Button } from '#arc/button';
	import { CommandPalette } from '#arc/command-palette';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	let open = $state(false);
	let leaving = $state(false);
	let status = $state('');
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
</script>

{#snippet editIcon()}<Pencil size={16} />{/snippet}
{#snippet copyIcon()}<Copy size={16} />{/snippet}
{#snippet shareIcon()}<Share2 size={16} />{/snippet}
{#snippet downloadIcon()}<Download size={16} />{/snippet}
{#snippet archiveIcon()}<Archive size={16} />{/snippet}

<div class="preview">
	<div class="surface">
		<div class="command-preview">
			{#if open && !leaving}
				<div
					class="palette-surface"
					out:swap={reduced
						? { duration: 0 }
						: { y: 4, scale: 0.985, duration: m.duration.exit, easing: m.ease.exit }}
					onoutroend={() => {
						if (!open) leaving = false;
					}}
				>
					<CommandPalette
						autoFocus
						label="Project commands"
						placeholder="Search project commands"
						items={[
							{
								id: 'edit',
								label: 'Edit project',
								description: 'Update the project details',
								group: 'Project',
								icon: editIcon,
								shortcut: 'E'
							},
							{
								id: 'duplicate',
								label: 'Duplicate project',
								description: 'Create a copy with the same setup',
								group: 'Project',
								icon: copyIcon,
								shortcut: 'D'
							},
							{
								id: 'share',
								label: 'Share project',
								description: 'Invite someone to collaborate',
								group: 'Workspace',
								icon: shareIcon,
								shortcut: 'S'
							},
							{
								id: 'download',
								label: 'Download brief',
								description: 'Save the latest project brief',
								group: 'Workspace',
								icon: downloadIcon
							},
							{
								id: 'archive',
								label: 'Archive project',
								description: 'Move this project out of the workspace',
								group: 'Danger zone',
								icon: archiveIcon
							}
						]}
						onSelect={(item) => {
							status = `${item.label} selected`;
							leaving = true;
							open = false;
						}}
						onClose={() => {
							leaving = true;
							open = false;
						}}
					/>
				</div>
			{:else if !leaving}
				<div
					in:swap={reduced
						? { duration: 0 }
						: {
								scale: 0.97,
								...m.spring.snappy,
								fade: { duration: m.duration.fast, easing: m.ease.enter },
								skip: !mounted.current
							}}
					out:swap={reduced
						? { duration: 0 }
						: { scale: 0.97, duration: m.duration.instant, easing: m.ease.exit }}
					onoutroend={() => {
						if (open) leaving = false;
					}}
				>
					<Button
						variant="secondary"
						label="Open command palette"
						onclick={() => {
							leaving = true;
							open = true;
						}}
					/>
				</div>
			{/if}
		</div>
	</div>
	<div class="status" role="status">{status}</div>
</div>

<style>
	.preview {
		width: min(100%, 620px);
		display: grid;
		gap: 16px;
	}
	.surface {
		display: grid;
		gap: 8px;
		justify-items: center;
		padding: 0;
		background: transparent;
	}
	.surface > * {
		max-width: 100%;
	}
	.command-preview {
		display: grid;
		width: min(100%, 440px);
		min-height: 54px;
		place-items: center;
	}
	.palette-surface {
		width: 100%;
	}
	.status {
		min-height: 18px;
		text-align: center;
		color: var(--text-muted, #64748b);
		font-size: 12px;
	}
</style>
