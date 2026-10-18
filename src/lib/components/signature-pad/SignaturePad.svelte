<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, motionTokens as m, swap, cssEasing } from '#lib/motion';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import Eraser from '@lucide/svelte/icons/eraser';
	import Play from '@lucide/svelte/icons/play';
	import Square from '@lucide/svelte/icons/square';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import {
		PAD_WIDTH,
		PAD_HEIGHT,
		INK,
		WIDTHS,
		COLORS,
		SIZES,
		getStrokeOutline,
		outlineToPath,
		strokeOptions,
		strokePath,
		signatureToSvg,
		signatureToPng,
		type InkStroke,
		type InkColor,
		type InkWidth,
		type InkPoint
	} from './ink';
	import PadChoice from './PadChoice.svelte';
	import type { SignaturePadProps } from './types';
	import './signature-pad.css';
	let {
		signer,
		hint = 'Sign here',
		defaultColor = 'black',
		defaultWidth = 'medium',
		onChange,
		fileName = 'signature',
		label = 'Signature pad',
		class: className
	}: SignaturePadProps = $props();
	const rawId = $props.id();
	const uid = rawId.replace(/[^a-zA-Z0-9-]/g, ''),
		mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	let history = $state<{
			past: InkStroke[][];
			present: InkStroke[];
			future: InkStroke[][];
			fresh: string | null;
		}>({ past: [], present: [], future: [], fresh: null }),
		color = $state<InkColor>(untrack(() => defaultColor)),
		width = $state<InkWidth>(untrack(() => defaultWidth)),
		drawing = $state(false),
		wiping = $state(false),
		replay = $state<{ at: number; offsets: number[] } | null>(null),
		saved = $state<null | 'png' | 'svg' | 'failed'>(null),
		status = $state(''),
		liveD = $state('');
	let pad = $state<HTMLDivElement>(),
		ink = $state<HTMLDivElement>(),
		live: { id: number; stroke: InkStroke; stamp: number } | null = null,
		frame = 0,
		counter = 0,
		timer: ReturnType<typeof setTimeout>,
		wipe: Animation | undefined,
		wipeFinish: (() => void) | undefined;
	const strokes = $derived(history.present),
		empty = $derived(!strokes.length),
		replaying = $derived(replay !== null),
		showHint = $derived(empty && !drawing && !wiping);
	$effect(() => {
		const next = strokes;
		untrack(() => onChange?.(next));
	});
	function cleanup() {
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
			wipe?.cancel();
			wipeFinish = undefined;
		};
	}
	function commit(next: InkStroke[], fresh: string | null = null) {
		history = {
			past: [...history.past, history.present].slice(-60),
			present: next,
			future: [],
			fresh
		};
	}
	function stopReplay() {
		cancelAnimationFrame(frame);
		replay = null;
	}
	function settleWipe() {
		wipeFinish?.();
	}
	function toPad(e: { clientX: number; clientY: number }) {
		const r = pad!.getBoundingClientRect();
		return {
			x: ((e.clientX - r.left) / r.width) * PAD_WIDTH,
			y: ((e.clientY - r.top) / r.height) * PAD_HEIGHT
		};
	}
	function paintLive() {
		if (live)
			liveD = outlineToPath(
				getStrokeOutline(live.stroke.points, strokeOptions(live.stroke, false))
			);
	}
	function down(e: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (live || (e.pointerType === 'mouse' && e.button !== 0)) return;
		e.preventDefault();
		settleWipe();
		stopReplay();
		pad?.focus({ preventScroll: true });
		e.currentTarget.setPointerCapture(e.pointerId);
		const { x, y } = toPad(e),
			pen = e.pointerType === 'pen' && e.pressure > 0;
		live = {
			id: e.pointerId,
			stamp: e.timeStamp,
			stroke: {
				id: `${uid}-${++counter}`,
				color,
				width,
				at: e.timeStamp,
				points: [{ x, y, p: pen ? e.pressure : -1, t: 0 }]
			}
		};
		drawing = true;
		paintLive();
	}
	function move(e: PointerEvent) {
		if (!live || live.id !== e.pointerId) return;
		const samples = e.getCoalescedEvents?.() ?? [],
			list = samples.length ? samples : [e];
		for (const sample of list) {
			const { x, y } = toPad(sample),
				pen = sample.pointerType === 'pen' && sample.pressure > 0;
			live.stroke.points.push({
				x,
				y,
				p: pen ? sample.pressure : -1,
				t: Math.max(live.stroke.points.at(-1)!.t, sample.timeStamp - live.stamp)
			});
		}
		paintLive();
	}
	function up(e: PointerEvent) {
		if (!live || live.id !== e.pointerId) return;
		const stroke = live.stroke;
		live = null;
		const count = strokes.length + 1;
		commit([...strokes, stroke], stroke.id);
		liveD = '';
		drawing = false;
		status = `Stroke added. ${count} in the signature.`;
	}
	function undo() {
		if (!history.past.length || live) return;
		settleWipe();
		stopReplay();
		history = {
			past: history.past.slice(0, -1),
			present: history.past.at(-1)!,
			future: [history.present, ...history.future],
			fresh: null
		};
		status = 'Undone';
	}
	function redo() {
		if (!history.future.length || live) return;
		settleWipe();
		stopReplay();
		history = {
			past: [...history.past, history.present],
			present: history.future[0]!,
			future: history.future.slice(1),
			fresh: null
		};
		status = 'Redone';
	}
	function clear() {
		if (empty || wiping || live) return;
		stopReplay();
		const node = ink;
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			wipeFinish = undefined;
			wipe?.cancel();
			wipe = undefined;
			commit([]);
			wiping = false;
			status = 'Signature cleared. Undo brings it back.';
			if (node)
				requestAnimationFrame(() => requestAnimationFrame(() => (node.style.clipPath = '')));
		};
		if (!node || reduced) {
			finish();
			return;
		}
		wiping = true;
		wipeFinish = finish;
		wipe = node.animate(
			[{ clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)' }],
			{ duration: 560, easing: cssEasing(m.ease.inOut), fill: 'forwards' }
		);
		wipe.onfinish = finish;
	}
	function toggleReplay() {
		if (replaying) {
			stopReplay();
			status = 'Replay stopped';
			return;
		}
		if (empty || live) return;
		settleWipe();
		const offsets: number[] = [];
		let cursor = 0;
		strokes.forEach((s, i) => {
			if (i) {
				const prev = strokes[i - 1]!;
				cursor += Math.min(260, Math.max(90, s.at - prev.at - prev.points.at(-1)!.t));
			}
			offsets.push(cursor);
			cursor += s.points.at(-1)!.t;
		});
		const speed = Math.max(1, cursor / 3200),
			total = cursor + 120,
			begin = performance.now();
		const tick = (now: number) => {
			const at = (now - begin) * speed;
			if (at >= total) {
				replay = null;
				status = 'Replay finished';
				return;
			}
			replay = { at, offsets };
			frame = requestAnimationFrame(tick);
		};
		replay = { at: 0, offsets };
		status = 'Replaying signature';
		frame = requestAnimationFrame(tick);
	}
	async function save(kind: 'png' | 'svg') {
		if (empty) return;
		clearTimeout(timer);
		try {
			const blob =
					kind === 'svg'
						? new Blob([signatureToSvg(strokes)], { type: 'image/svg+xml' })
						: await signatureToPng(strokes),
				url = URL.createObjectURL(blob),
				link = document.createElement('a');
			link.href = url;
			link.download = `${fileName}.${kind}`;
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			saved = kind;
			status = `Saved ${fileName}.${kind}`;
		} catch {
			saved = 'failed';
			status = 'Export failed. Try again.';
		}
		timer = setTimeout(() => (saved = null), 1800);
	}
	function key(e: KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey,
			k = e.key.toLowerCase();
		if (mod && k === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
		} else if (mod && k === 'y') {
			e.preventDefault();
			redo();
		} else if (!mod && ['Delete', 'Backspace'].includes(e.key) && e.currentTarget === e.target) {
			e.preventDefault();
			clear();
		} else if (e.key === 'Escape' && replaying) stopReplay();
	}
	const visible = $derived.by(() => {
		let nib: InkPoint | null = null,
			nibColor: InkColor = color;
		const list = strokes.map((stroke, i) => {
			if (replay === null) return { stroke, d: strokePath(stroke) };
			const local = replay.at - (replay.offsets[i] ?? 0),
				last = stroke.points.at(-1)!.t;
			if (local < 0) return { stroke, d: '' };
			if (local >= last) return { stroke, d: strokePath(stroke) };
			nib = stroke.points.findLast((p) => p.t <= local) ?? stroke.points[0]!;
			nibColor = stroke.color;
			return { stroke, d: strokePath(stroke, local) };
		});
		return { list, nib: nib as InkPoint | null, nibColor };
	});
</script>

<div class={['arc-signature-pad__root', className]} data-ink={color} {@attach cleanup}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (The focusable drawing surface exposes an image and delegates keyboard editing commands.) -->
	<div
		bind:this={pad}
		class="arc-signature-pad__pad"
		tabindex="0"
		role="img"
		aria-roledescription="signature pad"
		aria-label={`${label}. ${empty ? 'Empty.' : `${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}.`} Draw with a pointer, pen, or finger.`}
		aria-describedby={`${uid}-keys`}
		data-drawing={drawing ? '' : undefined}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={key}
	>
		<div class="arc-signature-pad__guide" aria-hidden="true">
			<X class="arc-signature-pad__mark" size={14} strokeWidth={1.75} /><span
				class="arc-signature-pad__baseline"
			></span>{#if signer}<span class="arc-signature-pad__signer">{signer}</span
				>{/if}{#each showHint ? ['hint'] : [] as k (k)}<span
					class="arc-signature-pad__hint"
					in:swap={{
						y: reduced ? 0 : 6,
						scale: reduced ? 1 : 0.97,
						blur: reduced ? 0 : 4,
						duration: reduced ? 120 : 240,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						y: reduced ? 0 : 6,
						scale: reduced ? 1 : 0.97,
						blur: reduced ? 0 : 4,
						duration: reduced ? 120 : 160,
						easing: m.ease.standard
					}}>{hint}</span
				>{/each}
		</div>
		<div bind:this={ink} class="arc-signature-pad__ink">
			<svg viewBox={`0 0 ${PAD_WIDTH} ${PAD_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true"
				>{#each visible.list as item (item.stroke.id)}<path
						class="arc-signature-pad__stroke"
						data-color={item.stroke.color}
						d={item.d}
						in:swap={{
							duration: 240,
							easing: m.ease.standard,
							skip: !mounted.current || history.fresh === item.stroke.id
						}}
						out:swap={{ duration: wiping ? 0 : 240, easing: m.ease.standard }}
					/>{/each}<path
					class="arc-signature-pad__stroke"
					data-color={color}
					d={liveD}
				/>{#if visible.nib}<circle
						class="arc-signature-pad__nib"
						data-color={visible.nibColor}
						cx={visible.nib.x}
						cy={visible.nib.y}
						r={WIDTHS[width].size * 0.9}
					/>{/if}</svg
			>
		</div>
		{#if wiping}<span class="arc-signature-pad__sweep" aria-hidden="true"></span>{/if}
	</div>
	<div class="arc-signature-pad__toolbar">
		<div class="arc-signature-pad__group">
			<PadChoice
				label="Ink color"
				options={COLORS}
				value={color}
				onChange={(next) => {
					color = next;
					status = `${INK[next].label} selected`;
				}}
				{reduced}
				name={(o) => INK[o].label}
				>{#snippet render(option)}<span class="arc-signature-pad__swatch" data-color={option}
					></span>{/snippet}</PadChoice
			><span class="arc-signature-pad__divider" aria-hidden="true"></span><PadChoice
				label="Stroke width"
				options={SIZES}
				value={width}
				onChange={(next) => {
					width = next;
					status = `${WIDTHS[next].label} nib selected`;
				}}
				{reduced}
				name={(o) => WIDTHS[o].label}
				>{#snippet render(option)}<span
						class="arc-signature-pad__weight"
						style:width={`${WIDTHS[option].size + 2}px`}
						style:height={`${WIDTHS[option].size + 2}px`}
					></span>{/snippet}</PadChoice
			>
		</div>
		<div class="arc-signature-pad__group">
			{#each [{ label: 'Undo', icon: Undo2, action: undo, disabled: !history.past.length || wiping }, { label: 'Redo', icon: Redo2, action: redo, disabled: !history.future.length || wiping }, { label: replaying ? 'Stop replay' : 'Replay signature', icon: replaying ? Square : Play, action: toggleReplay, disabled: empty || wiping }, { label: 'Clear signature', icon: Eraser, action: clear, disabled: empty || wiping }] as action, i (i)}<button
					type="button"
					class="arc-signature-pad__icon-button"
					aria-label={action.label}
					title={action.label}
					disabled={action.disabled}
					aria-pressed={i === 2 ? replaying : undefined}
					onclick={action.action}
					>{#key action.label}<span
							class="arc-signature-pad__swap"
							in:swap={{ scale: 0.6, ...m.spring.snappy, skip: reduced || !mounted.current }}
							out:swap={{ scale: 0.6, ...m.spring.snappy, skip: reduced }}
							><action.icon
								size={i === 2 ? (replaying ? 15 : 17) : 18}
								strokeWidth={1.75}
								aria-hidden="true"
							/></span
						>{/key}</button
				>{/each}
		</div>
	</div>
	<div class="arc-signature-pad__exports">
		<span class="arc-signature-pad__export-label">Save as</span
		>{#each ['png', 'svg'] as kind (kind)}<button
				type="button"
				class="arc-signature-pad__export"
				onclick={() => save(kind as 'png' | 'svg')}
				disabled={empty}
				aria-label={`Download ${kind.toUpperCase()}`}
				>{#key saved === kind ? 'done' : saved === 'failed' ? 'failed' : 'idle'}<span
						class="arc-signature-pad__export-content"
						in:swap={{
							y: reduced ? 0 : 4,
							blur: reduced ? 0 : 2,
							duration: reduced ? 120 : 160,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
						out:swap={{ y: reduced ? 0 : -4, duration: 120 }}
						>{#if saved === kind}<Check
								size={15}
								strokeWidth={1.75}
								aria-hidden="true"
							/>Saved{:else}<Download
								size={15}
								strokeWidth={1.75}
								aria-hidden="true"
							/>{kind.toUpperCase()}{/if}</span
					>{/key}</button
			>{/each}
	</div>
	<p id={`${uid}-keys`} class="arc-signature-pad__sr-only">
		Press Control or Command Z to undo, add Shift to redo, and Delete to clear.
	</p>
	<p class="arc-signature-pad__sr-only" role="status" aria-live="polite">{status}</p>
</div>
