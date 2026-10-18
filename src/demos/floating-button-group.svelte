<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import Undo from '@lucide/svelte/icons/undo-2';
	import Redo from '@lucide/svelte/icons/redo-2';
	import Comment from '@lucide/svelte/icons/message-circle';
	import Link from '@lucide/svelte/icons/link-2';
	import Check from '@lucide/svelte/icons/check';
	import Play from '@lucide/svelte/icons/play';
	import Square from '@lucide/svelte/icons/square';
	import Copy from '@lucide/svelte/icons/copy';
	import Pin from '@lucide/svelte/icons/pin';
	import Archive from '@lucide/svelte/icons/archive';
	import Trash from '@lucide/svelte/icons/trash-2';
	import ZoomIn from '@lucide/svelte/icons/zoom-in';
	import ZoomOut from '@lucide/svelte/icons/zoom-out';
	import Scan from '@lucide/svelte/icons/scan';
	import Lock from '@lucide/svelte/icons/lock';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { FloatingButtonGroup, type FloatingButtonGroupItem } from '#arc/floating-button-group';
	let undos = $state(3),
		redos = $state(0),
		comment = $state(false),
		shared = $state(false),
		present = $state(false),
		copied = $state(false),
		archived = $state(false),
		pinned = $state(false),
		zoom = $state(2),
		locked = $state(false),
		hidden = $state(false);
	const timers: Record<string, ReturnType<typeof setTimeout>> = {};
	function pulse(key: string, set: (v: boolean) => void) {
		clearTimeout(timers[key]);
		set(true);
		timers[key] = setTimeout(() => set(false), 1600);
	}
	onDestroy(() => Object.values(timers).forEach(clearTimeout));
	function editor(
		undo: Snippet,
		redo: Snippet,
		message: Snippet,
		check: Snippet,
		link: Snippet,
		square: Snippet,
		play: Snippet
	): FloatingButtonGroupItem[] {
		return [
			{
				id: 'undo',
				label: 'Undo',
				icon: undo,
				iconOnly: true,
				shortcut: '⌘Z',
				disabled: !undos,
				onSelect: () => {
					undos--;
					redos++;
				}
			},
			{
				id: 'redo',
				label: 'Redo',
				icon: redo,
				iconOnly: true,
				shortcut: '⇧⌘Z',
				disabled: !redos,
				onSelect: () => {
					redos--;
					undos++;
				}
			},
			{ type: 'separator' },
			{
				id: 'comment',
				label: 'Comment',
				icon: message,
				iconOnly: true,
				shortcut: 'C',
				pressed: comment,
				onSelect: () => {
					comment = !comment;
				}
			},
			{
				id: 'share',
				label: shared ? 'Copied' : 'Share',
				reserveLabels: ['Share', 'Copied'],
				icon: shared ? check : link,
				onSelect: () =>
					pulse('share', (v) => {
						shared = v;
					})
			},
			{ type: 'separator' },
			{
				id: 'present',
				label: present ? 'Stop' : 'Present',
				reserveLabels: ['Present', 'Stop'],
				icon: present ? square : play,
				pressed: present,
				onSelect: () => {
					present = !present;
				}
			}
		];
	}
	function messages(
		check: Snippet,
		copy: Snippet,
		pin: Snippet,
		archive: Snippet,
		trash: Snippet
	): FloatingButtonGroupItem[] {
		return [
			{ id: 'copy', label: copied ? 'Copied' : 'Copy text', icon: copied ? check : copy },
			{ id: 'pin', label: 'Pin message', icon: pin, pressed: pinned },
			{ id: 'archive', label: archived ? 'Archived' : 'Archive', icon: archived ? check : archive },
			{ type: 'separator' },
			{ id: 'delete', label: 'Delete', icon: trash, disabled: true }
		];
	}
	function tools(
		zoomIn: Snippet,
		zoomOut: Snippet,
		scan: Snippet,
		lock: Snippet,
		eyeOff: Snippet,
		eye: Snippet
	): FloatingButtonGroupItem[] {
		return [
			{
				id: 'zoom-in',
				label: 'Zoom in',
				icon: zoomIn,
				disabled: zoom === 4,
				onSelect: () => {
					zoom++;
				}
			},
			{
				id: 'zoom-out',
				label: 'Zoom out',
				icon: zoomOut,
				disabled: zoom === 0,
				onSelect: () => {
					zoom--;
				}
			},
			{
				id: 'fit',
				label: 'Zoom to fit',
				icon: scan,
				disabled: zoom === 2,
				onSelect: () => {
					zoom = 2;
				}
			},
			{ type: 'separator' },
			{
				id: 'lock',
				label: 'Lock layer',
				icon: lock,
				pressed: locked,
				onSelect: () => {
					locked = !locked;
				}
			},
			{
				id: 'hide',
				label: 'Hide layer',
				icon: hidden ? eyeOff : eye,
				pressed: hidden,
				onSelect: () => {
					hidden = !hidden;
				}
			}
		];
	}
</script>

{#snippet undo()}<Undo />{/snippet}{#snippet redo()}<Redo />{/snippet}{#snippet message()}<Comment
	/>{/snippet}{#snippet link()}<Link />{/snippet}{#snippet check()}<Check
	/>{/snippet}{#snippet play()}<Play />{/snippet}{#snippet square()}<Square />{/snippet}
{#snippet copy()}<Copy />{/snippet}{#snippet pin()}<Pin />{/snippet}{#snippet archive()}<Archive
	/>{/snippet}{#snippet trash()}<Trash />{/snippet}
{#snippet zoomIn()}<ZoomIn />{/snippet}{#snippet zoomOut()}<ZoomOut
	/>{/snippet}{#snippet scan()}<Scan />{/snippet}{#snippet lock()}<Lock
	/>{/snippet}{#snippet eye()}<Eye />{/snippet}{#snippet eyeOff()}<EyeOff />{/snippet}
<div class="canvas">
	<div class="demo">
		<div class="wide">
			<FloatingButtonGroup
				label="Editor actions"
				items={editor(undo, redo, message, check, link, square, play)}
			/>
		</div>
		<div class="compact">
			<FloatingButtonGroup
				label="Editor actions"
				items={editor(undo, redo, message, check, link, square, play)}
				iconOnly
			/>
		</div>
		<div class="row">
			<FloatingButtonGroup
				label="Canvas tools"
				orientation="vertical"
				iconOnly
				items={tools(zoomIn, zoomOut, scan, lock, eyeOff, eye)}
			/>
			<FloatingButtonGroup
				label="Message actions"
				variant="floating"
				size="sm"
				iconOnly
				tooltipSide="bottom"
				items={messages(check, copy, pin, archive, trash)}
				onAction={(id) => {
					if (id === 'copy')
						pulse('copy', (v) => {
							copied = v;
						});
					if (id === 'pin') pinned = !pinned;
					if (id === 'archive')
						pulse('archive', (v) => {
							archived = v;
						});
				}}
			/>
		</div>
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
	.canvas > * {
		width: 100%;
		min-width: 0;
	}
	.demo {
		container-type: inline-size;
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		gap: var(--space-8);
	}
	.wide,
	.compact,
	.row {
		display: flex;
		justify-content: center;
	}
	.row {
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-8);
	}
	.compact {
		display: none;
	}
	@container (max-width:359px) {
		.wide {
			display: none;
		}
		.compact {
			display: flex;
		}
	}
</style>
