<script lang="ts">
	import FolderClosed from '@lucide/svelte/icons/folder-closed';
	import Trash from '@lucide/svelte/icons/trash';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { ConfirmMorph, type ConfirmMorphMode } from '#arc/confirm-morph';
	import { SegmentedControl } from '#arc/segmented-control';
	import { swap, motionTokens as m, Mounted } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import './confirm-morph-demo.css';
	let exists = $state(true),
		mode = $state<ConfirmMorphMode>('press'),
		outcome = $state('succeed');
	const reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted();
	const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
	async function confirm() {
		await wait(900);
		if (outcome === 'fail') throw new Error('Simulated failure');
		exists = false;
	}
	async function undo() {
		await wait(500);
		exists = true;
	}
</script>

{#snippet icon()}<Trash strokeWidth={1.75} />{/snippet}
<div class="arc-confirm-morph-demo__demo">
	<div class="arc-confirm-morph-demo__stage">
		<div class="arc-confirm-morph-demo__row">
			<div class="arc-confirm-morph-demo__slot">
				{#key exists}<span
						class={exists ? 'arc-confirm-morph-demo__project' : 'arc-confirm-morph-demo__empty'}
						in:swap={{
							blur: !reduced && exists ? 2 : 0,
							duration: 160,
							easing: m.ease.standard,
							skip: !mounted.current
						}}
						out:swap={{
							blur: !reduced && exists ? 2 : 0,
							duration: 160,
							easing: m.ease.standard,
							pop: true
						}}
						>{#if exists}<FolderClosed
								size={16}
								strokeWidth={1.75}
								aria-hidden="true"
								class="arc-confirm-morph-demo__icon"
							/><span class="arc-confirm-morph-demo__name">Northwind redesign</span>{:else}No
							projects{/if}</span
					>{/key}
			</div>
			<ConfirmMorph
				label="Delete project"
				{icon}
				disabled={!exists}
				prompt="Delete project?"
				confirmLabel="Delete"
				pendingLabel="Deleting"
				countdownLabel="Deleting in"
				doneLabel="Deleted"
				errorLabel="Couldn’t delete"
				confirmMode={mode}
				onConfirm={confirm}
				onUndo={undo}
			/>
		</div>
	</div>
	<div class="arc-confirm-morph-demo__controls">
		<SegmentedControl
			label="Confirm with"
			options={[
				{ value: 'press', label: 'Click' },
				{ value: 'hold', label: 'Hold' },
				{ value: 'countdown', label: 'Countdown' }
			]}
			value={mode}
			onValueChange={(v) => (mode = v as ConfirmMorphMode)}
		/><SegmentedControl
			label="Delete outcome"
			options={[
				{ value: 'succeed', label: 'Succeeds' },
				{ value: 'fail', label: 'Fails' }
			]}
			bind:value={outcome}
		/>{#if !exists}<button
				type="button"
				class="arc-confirm-morph-demo__reset"
				onclick={() => (exists = true)}
				><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />Restore</button
			>{/if}
	</div>
</div>
