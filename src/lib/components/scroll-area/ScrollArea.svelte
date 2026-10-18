<script lang="ts">
	import { untrack } from 'svelte';
	import type { ScrollAreaProps, ScrollAreaEdges } from './types';
	import './scroll-area.css';

	let {
		children,
		orientation = 'vertical',
		fade = 28,
		scrollbars = 'auto',
		hideDelay = 900,
		maxHeight,
		snap,
		label,
		wheelToHorizontal = true,
		viewportClass,
		viewportStyle,
		viewportRef = $bindable(null),
		ref = $bindable(null),
		onScroll,
		onEdgeChange,
		class: className,
		...props
	}: ScrollAreaProps = $props();
	const vertical = $derived(orientation !== 'horizontal');
	const horizontal = $derived(orientation !== 'vertical');
	const axes = $derived<('x' | 'y')[]>(vertical ? (horizontal ? ['y', 'x'] : ['y']) : ['x']);
	const tracks: Record<'x' | 'y', HTMLDivElement | undefined> = { x: undefined, y: undefined };
	const thumbs: Record<'x' | 'y', HTMLDivElement | undefined> = { x: undefined, y: undefined };
	let hideTimer: ReturnType<typeof setTimeout>;
	let lastEdges = '';
	let drag: { axis: 'x' | 'y'; start: number; scroll: number; ratio: number } | null = null;

	function sync() {
		const node = viewportRef;
		if (!node || !ref) return;
		const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = node;
		const maxY = Math.max(0, scrollHeight - clientHeight);
		const maxX = Math.max(0, scrollWidth - clientWidth);
		const left = Math.abs(scrollLeft);
		const edges: ScrollAreaEdges = {
			top: vertical && scrollTop > 0.5,
			bottom: vertical && maxY - scrollTop > 0.5,
			left: horizontal && left > 0.5,
			right: horizontal && maxX - left > 0.5
		};
		if (fade > 0) {
			for (const [edge, distance] of Object.entries({
				top: vertical ? scrollTop : 0,
				bottom: vertical ? maxY - scrollTop : 0,
				left: horizontal ? left : 0,
				right: horizontal ? maxX - left : 0
			}))
				node.style.setProperty(`--fade-${edge}`, `${Math.min(fade, distance)}px`);
		}
		function place(axis: 'x' | 'y', scroll: number, max: number, client: number, total: number) {
			const track = tracks[axis],
				thumb = thumbs[axis];
			if (!track || !thumb) return;
			track.toggleAttribute('data-hidden', max <= 0.5);
			if (max <= 0.5) return;
			const length = axis === 'y' ? track.clientHeight : track.clientWidth;
			const size = Math.max(28, (length * client) / total);
			const offset = ((length - size) * scroll) / max;
			thumb.style[axis === 'y' ? 'height' : 'width'] = `${size}px`;
			thumb.style.transform =
				axis === 'y' ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`;
		}
		if (vertical) place('y', scrollTop, maxY, clientHeight, scrollHeight);
		if (horizontal) place('x', left, maxX, clientWidth, scrollWidth);
		ref.toggleAttribute('data-overflow', maxY > 0.5 || maxX > 0.5);
		const key = `${edges.top}${edges.bottom}${edges.left}${edges.right}`;
		if (key !== lastEdges) {
			lastEdges = key;
			onEdgeChange?.(edges);
		}
	}

	$effect(() => {
		const node = viewportRef;
		void fade;
		void orientation;
		if (!node) return;
		const observer = new ResizeObserver(() => untrack(sync));
		const observe = () => {
			observer.disconnect();
			observer.observe(node);
			for (const child of node.children) observer.observe(child);
			untrack(sync);
		};
		observe();
		const mutations = new MutationObserver(observe);
		mutations.observe(node, { childList: true });
		return () => {
			observer.disconnect();
			mutations.disconnect();
		};
	});
	$effect(() => () => clearTimeout(hideTimer));
	$effect(() => {
		const node = viewportRef;
		if (!node || orientation !== 'horizontal' || !wheelToHorizontal) return;
		function wheel(event: WheelEvent) {
			if (!node || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
			const max = node.scrollWidth - node.clientWidth,
				at = Math.abs(node.scrollLeft);
			if (max <= 0 || (event.deltaY < 0 && at <= 0) || (event.deltaY > 0 && at >= max - 0.5))
				return;
			event.preventDefault();
			node.scrollLeft += event.deltaY * (getComputedStyle(node).direction === 'rtl' ? -1 : 1);
		}
		node.addEventListener('wheel', wheel, { passive: false });
		return () => node.removeEventListener('wheel', wheel);
	});
	function wake() {
		const root = ref;
		if (!root) return;
		root.setAttribute('data-scrolling', '');
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => root.removeAttribute('data-scrolling'), hideDelay);
	}
	function thumbDown(event: PointerEvent & { currentTarget: HTMLDivElement }, axis: 'x' | 'y') {
		const node = viewportRef,
			track = tracks[axis],
			thumb = thumbs[axis];
		if (!node || !track || !thumb || event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		const length = axis === 'y' ? track.clientHeight : track.clientWidth;
		const size = axis === 'y' ? thumb.offsetHeight : thumb.offsetWidth;
		const max =
			axis === 'y' ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
		drag = {
			axis,
			start: axis === 'y' ? event.clientY : event.clientX,
			scroll: axis === 'y' ? node.scrollTop : node.scrollLeft,
			ratio: max / Math.max(1, length - size)
		};
		ref?.setAttribute('data-dragging', axis);
		node.style.scrollSnapType = 'none';
	}
	function thumbMove(event: PointerEvent) {
		if (!drag || !viewportRef) return;
		const delta = ((drag.axis === 'y' ? event.clientY : event.clientX) - drag.start) * drag.ratio;
		if (drag.axis === 'y') viewportRef.scrollTop = drag.scroll + delta;
		else viewportRef.scrollLeft = drag.scroll + delta;
	}
	function thumbUp(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (!drag) return;
		drag = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		ref?.removeAttribute('data-dragging');
		if (viewportRef) viewportRef.style.scrollSnapType = '';
		wake();
	}
	function trackDown(event: PointerEvent & { currentTarget: HTMLDivElement }, axis: 'x' | 'y') {
		const node = viewportRef,
			thumb = thumbs[axis];
		if (!node || !thumb || event.button !== 0 || event.target !== event.currentTarget) return;
		const rect = thumb.getBoundingClientRect();
		const before = axis === 'y' ? event.clientY < rect.top : event.clientX < rect.left;
		const page = (axis === 'y' ? node.clientHeight : node.clientWidth) * 0.9 * (before ? -1 : 1);
		node.scrollBy({
			[axis === 'y' ? 'top' : 'left']: page,
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
		});
	}
</script>

<div
	bind:this={ref}
	class={['arc-scroll-area', className]}
	data-orientation={orientation}
	data-scrollbars={scrollbars}
	{...props}
>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (Native scrolling must remain keyboard accessible.) -->
	<div
		bind:this={viewportRef}
		class={['arc-scroll-area__viewport', viewportClass]}
		data-fade={fade > 0 ? orientation : undefined}
		style={`max-height: ${typeof maxHeight === 'number' ? `${maxHeight}px` : (maxHeight ?? 'none')}; scroll-snap-type: ${snap ?? 'none'}; ${viewportStyle ?? ''}`}
		tabindex="0"
		role={label ? 'region' : undefined}
		aria-label={label}
		onscroll={(event) => {
			sync();
			wake();
			onScroll?.(event);
		}}
	>
		{@render children?.()}
	</div>
	{#each axes as axis (axis)}
		<div
			{@attach (node) => {
				tracks[axis] = node;
				return () => {
					tracks[axis] = undefined;
				};
			}}
			class="arc-scroll-area__track"
			data-axis={axis}
			data-hidden=""
			aria-hidden="true"
			onpointerdown={(event) => trackDown(event, axis)}
		>
			<div
				{@attach (node) => {
					thumbs[axis] = node;
					return () => {
						thumbs[axis] = undefined;
					};
				}}
				role="presentation"
				class="arc-scroll-area__thumb"
				onpointerdown={(event) => thumbDown(event, axis)}
				onpointermove={thumbMove}
				onpointerup={thumbUp}
				onpointercancel={thumbUp}
			></div>
		</div>
	{/each}
</div>
