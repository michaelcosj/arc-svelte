<script lang="ts">
	import { ContextMenu as Primitive } from 'bits-ui';
	import MenuContent from './MenuContent.svelte';
	import type { ContextMenuProps, MenuPoint } from './types';
	import './context-menu.css';

	let { children, items, label = 'Context menu' }: ContextMenuProps = $props();
	let open = $state(false);
	let point = $state<MenuPoint>({ x: 0, y: 0, key: 0 });
	let target = $state<HTMLDivElement | null>(null);
	let pressedWhileOpen = false;
	let viewportScroll = { x: 0, y: 0 };

	function show(x: number, y: number) {
		viewportScroll = { x: window.scrollX, y: window.scrollY };
		point = { x, y, key: point.key + 1 };
		open = true;
	}

	function showBelow() {
		const rect = target?.getBoundingClientRect();
		if (rect) show(rect.left + 12, rect.bottom + 8);
	}

	function viewportChanged(event: Event) {
		if (event.target instanceof Element && event.target.closest('.arc-context-menu__menu')) return;
		// A trigger focus can queue a scroll event before the new menu opens.
		if (
			event.type === 'scroll' &&
			(event.target === document || event.target === window) &&
			window.scrollX === viewportScroll.x &&
			window.scrollY === viewportScroll.y
		)
			return;
		open = false;
	}
</script>

<svelte:window onresize={viewportChanged} onscrollcapture={viewportChanged} />

<Primitive.Root bind:open>
	<Primitive.Trigger
		bind:ref={target}
		class="arc-context-menu__target"
		tabindex={0}
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => {
			if (pressedWhileOpen) {
				pressedWhileOpen = false;
				return;
			}
			showBelow();
		}}
		oncontextmenu={(event) => {
			event.preventDefault();
			show(event.clientX, event.clientY);
		}}
		onkeydown={(event) => {
			if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
				event.preventDefault();
				showBelow();
			}
		}}
	>
		{#snippet child({ props })}
			<div
				{...props}
				onpointerdown={(event) => {
					pressedWhileOpen = open && event.button === 0;
				}}
				onpointermove={undefined}
				onpointerup={undefined}
				onpointercancel={undefined}
			>
				{@render children()}
			</div>
		{/snippet}
	</Primitive.Trigger>
	<Primitive.Portal>
		<Primitive.Content
			forceMount
			preventScroll={false}
			trapFocus={false}
			onCloseAutoFocus={(event) => event.preventDefault()}
			onOpenAutoFocus={(event) => event.preventDefault()}
			onEscapeKeydown={() => target?.focus()}
			loop
		>
			{#snippet child({ props })}
				{#each open ? [true] : [] as shown (shown)}
					<MenuContent
						{props}
						{items}
						{label}
						{point}
						live={() => open}
						focusTarget={() => target?.focus()}
						close={() => (open = false)}
					/>
				{/each}
			{/snippet}
		</Primitive.Content>
	</Primitive.Portal>
</Primitive.Root>
