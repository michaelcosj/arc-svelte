<script lang="ts">
	import { onDestroy } from 'svelte';
	import Link from '@lucide/svelte/icons/link';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import CopyPlus from '@lucide/svelte/icons/copy-plus';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';
	import FileCheck from '@lucide/svelte/icons/badge-check';
	import FilePen from '@lucide/svelte/icons/file-pen';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Eye from '@lucide/svelte/icons/eye';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { ButtonGroup } from '#arc/button-group';
	import { AnimatedCounter } from '#arc/animated-counter';
	let share = $state('idle'),
		duplicated = $state(false),
		copies = $state(0),
		archived = $state(false),
		pinned = $state(false),
		final = $state(false),
		saved = $state(false),
		preview = $state(false);
	const zooms = [25, 50, 75, 100, 125, 150, 200, 300, 400];
	let zoomIndex = $state(3);
	const zoom = $derived(zooms[zoomIndex]!);
	const timers: Record<string, ReturnType<typeof setTimeout>> = {};
	function later(key: string, callback: () => void, delay = 1600) {
		clearTimeout(timers[key]);
		timers[key] = setTimeout(callback, delay);
	}
	onDestroy(() => Object.values(timers).forEach(clearTimeout));
	async function copy() {
		try {
			await navigator.clipboard.writeText('https://docs.example.com/planning/q4-roadmap-review');
			share = 'copied';
		} catch {
			share = 'failed';
		}
		later(
			'share',
			() => {
				share = 'idle';
			},
			1800
		);
	}
</script>

{#snippet link()}<Link />{/snippet}
{#snippet check()}<Check />{/snippet}
{#snippet fail()}<X />{/snippet}
{#snippet duplicate()}<CopyPlus />{/snippet}
{#snippet archive()}<Archive />{/snippet}
{#snippet restore()}<ArchiveRestore />{/snippet}
{#snippet pin()}<Pin />{/snippet}
{#snippet unpin()}<PinOff />{/snippet}
{#snippet markFinal()}<FileCheck />{/snippet}
{#snippet markDraft()}<FilePen />{/snippet}
{#snippet trash()}<Trash2 />{/snippet}
{#snippet minus()}<Minus />{/snippet}
{#snippet plus()}<Plus />{/snippet}
{#snippet save()}<Save />{/snippet}
{#snippet eye()}<Eye />{/snippet}
{#snippet edit()}<Pencil />{/snippet}
{#snippet zoomValue()}<span class="zoom-value"
		><span class="zoom-sizer" aria-hidden="true">400%</span><AnimatedCounter
			value={zoom}
			suffix="%"
		/></span
	>{/snippet}
<div class="demo">
	<ButtonGroup
		label="Document actions"
		items={[
			{
				id: 'share',
				label: share === 'copied' ? 'Copied' : share === 'failed' ? 'Failed' : 'Share',
				reserve: ['Share', 'Copied', 'Failed'],
				icon: share === 'copied' ? check : share === 'failed' ? fail : link,
				onSelect: copy
			},
			{
				id: 'duplicate',
				label: duplicated ? 'Duplicated' : 'Duplicate',
				reserve: ['Duplicate', 'Duplicated'],
				icon: duplicated ? check : duplicate,
				onSelect: () => {
					copies++;
					duplicated = true;
					later('duplicate', () => {
						duplicated = false;
					});
				}
			},
			{
				id: 'archive',
				label: archived ? 'Restore' : 'Archive',
				reserve: ['Archive', 'Restore'],
				icon: archived ? restore : archive,
				onSelect: () => {
					archived = !archived;
				}
			}
		]}
		menu={{
			label: 'More actions',
			items: [
				{
					id: 'pin',
					label: pinned ? 'Unpin from sidebar' : 'Pin to sidebar',
					icon: pinned ? unpin : pin,
					onSelect: () => {
						pinned = !pinned;
					}
				},
				{
					id: 'final',
					label: final ? 'Mark as draft' : 'Mark as final',
					icon: final ? markDraft : markFinal,
					onSelect: () => {
						final = !final;
					}
				},
				{
					id: 'delete',
					label: copies > 1 ? `Delete ${copies} copies` : 'Delete copy',
					icon: trash,
					destructive: true,
					disabled: copies === 0,
					onSelect: () => {
						copies = 0;
					}
				}
			]
		}}
	/>
	<ButtonGroup
		label="Zoom"
		size="sm"
		items={[
			{
				id: 'out',
				label: 'Zoom out',
				icon: minus,
				iconOnly: true,
				disabled: zoomIndex === 0,
				onSelect: () => {
					zoomIndex = Math.max(zoomIndex - 1, 0);
				}
			},
			{
				id: 'reset',
				label: `Zoom ${zoom}%, reset to 100%`,
				content: zoomValue,
				onSelect: () => {
					zoomIndex = 3;
				}
			},
			{
				id: 'in',
				label: 'Zoom in',
				icon: plus,
				iconOnly: true,
				disabled: zoomIndex === zooms.length - 1,
				onSelect: () => {
					zoomIndex = Math.min(zoomIndex + 1, zooms.length - 1);
				}
			}
		]}
	/>
	<ButtonGroup
		label="Editor actions"
		variant="solid"
		items={[
			{
				id: 'save',
				label: saved ? 'Saved' : 'Save',
				reserve: ['Save', 'Saved'],
				icon: saved ? check : save,
				onSelect: () => {
					saved = true;
					later('save', () => {
						saved = false;
					});
				}
			},
			{
				id: 'preview',
				label: preview ? 'Edit' : 'Preview',
				reserve: ['Preview', 'Edit'],
				icon: preview ? edit : eye,
				onSelect: () => {
					preview = !preview;
				}
			}
		]}
	/>
</div>

<style>
	.demo {
		display: flex;
		width: 100%;
		max-width: 100%;
		flex-direction: column;
		align-items: center;
		gap: var(--space-6);
	}
	.demo > :global(*) {
		max-width: 100%;
	}
	.zoom-value {
		display: inline-grid;
		place-items: center;
		padding-inline: 2px;
		font-variant-numeric: tabular-nums;
	}
	.zoom-value > :global(*) {
		grid-area: 1 / 1;
	}
	.zoom-sizer {
		visibility: hidden;
		padding-inline: 1px;
	}
	.zoom-value > :global(span) {
		color: inherit;
		font-family: inherit;
		font-size: inherit;
		font-weight: 500;
		letter-spacing: inherit;
		line-height: 1;
	}
</style>
