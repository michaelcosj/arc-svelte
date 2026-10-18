<script lang="ts">
	import { Popover } from 'bits-ui';
	import { untrack, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import {
		Mounted,
		PhysicalSpring,
		motionTokens as m,
		swap,
		springCurve,
		cssEasing
	} from '#lib/motion';
	import { TextMorph } from '#arc/text-morph';
	import Check from '@lucide/svelte/icons/check';
	import Pipette from '@lucide/svelte/icons/pipette';
	import Plus from '@lucide/svelte/icons/plus';
	import ColorSlider from './ColorSlider.svelte';
	import {
		parseColor,
		toHex,
		hsvToRgb,
		format,
		contrast,
		level,
		formats,
		formatNames,
		clamp
	} from './colors';
	import type { ColorPickerProps, Hsva, ColorSwatch, ColorFormat } from './types';
	import './color-picker.css';
	const uid = $props.id();
	let {
		value,
		defaultValue = '#2F6BFF',
		onValueChange,
		background = '#FFFFFF',
		label = 'Color',
		swatches: swatchesProp,
		defaultSwatches,
		onSwatchesChange,
		maxSwatches = 7,
		defaultFormat = 'hex',
		class: className
	}: ColorPickerProps = $props();
	let hsva = $state<Hsva>(
			untrack(() => parseColor(value ?? defaultValue) ?? { h: 220, s: 0.8, v: 1, a: 1 })
		),
		ownSwatches = $state<ColorSwatch[]>(untrack(() => defaultSwatches ?? [])),
		open = $state(false),
		kind = $state<ColorFormat>(untrack(() => defaultFormat)),
		draft = $state<string | null>(null),
		invalid = $state(false),
		active = $state<'area' | 'hue' | 'alpha' | null>(null),
		focusSwatch = $state<string | null>(null),
		trigger = $state<HTMLButtonElement | null>(null),
		panel = $state<HTMLDivElement>(),
		areaThumb = $state<HTMLDivElement>(),
		field = $state<HTMLDivElement>(),
		input = $state<HTMLInputElement>(),
		W = $state(300),
		H = $state(420),
		w = $state(160),
		h = $state(44),
		morph = $state<{ id: number; from: string; to: string; phase: 0 | 1 } | null>(null),
		dragId = $state<string | null>(null),
		dragX = $state(0);
	let synced = untrack(() => value),
		counter = 0,
		dragged = false;
	const mounted = new Mounted(),
		reduced = $derived(Boolean(prefersReducedMotion.current) && mounted.current),
		swatches = $derived(swatchesProp ?? ownSwatches),
		hex = $derived(toHex(hsva)),
		rgb = $derived(hsvToRgb(hsva)),
		css = $derived(
			`rgb(${Math.round(rgb.r * 255)} ${Math.round(rgb.g * 255)} ${Math.round(rgb.b * 255)} / ${Math.round(hsva.a * 1000) / 1000})`
		),
		opaque = $derived(
			`rgb(${Math.round(rgb.r * 255)} ${Math.round(rgb.g * 255)} ${Math.round(rgb.b * 255)})`
		),
		pure = $derived(`hsl(${hsva.h} 100% 50%)`),
		bg = $derived(parseColor(background)),
		ratio = $derived(contrast(hsva, bg ? hsvToRgb(bg) : { r: 1, g: 1, b: 1, a: 1 })),
		grade = $derived(level(ratio)),
		text = $derived(format(hsva, kind)),
		swatchTab = $derived(
			swatches.some((e) => e.id === focusSwatch) ? focusSwatch : swatches[0]?.id
		),
		progress = new PhysicalSpring(
			0,
			{ visualDuration: 0.42, bounce: 0.1 },
			{ delta: 0.0005, speed: 0.005 }
		),
		ratioValue = new PhysicalSpring(
			untrack(() => ratio),
			{ visualDuration: 0.26, bounce: 0.22 },
			{ delta: 0.0005, speed: 0.005 }
		),
		areaX = new PhysicalSpring(
			untrack(() => hsva.s),
			{ visualDuration: 0.26, bounce: 0.22 },
			{ delta: 0.0005, speed: 0.005 }
		),
		areaY = new PhysicalSpring(
			untrack(() => 1 - hsva.v),
			{ visualDuration: 0.26, bounce: 0.22 },
			{ delta: 0.0005, speed: 0.005 }
		),
		fade = new Tween(0);
	const q = $derived(clamp(progress.current)),
		opacity = $derived(clamp((progress.current - 0.35) / 0.55)),
		clip = $derived(
			`inset(0px ${Math.max(0, W - w) * (1 - q)}px ${Math.max(0, H - h) * (1 - q)}px 0px round ${22 + 4 * q}px)`
		);
	const canPick = $derived(mounted.current && 'EyeDropper' in window);
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== undefined && next !== synced) {
				synced = next;
				if (next.toUpperCase() !== hex) {
					const parsed = parseColor(next, hsva.h);
					if (parsed) hsva = parsed;
				}
			}
		});
	});
	$effect(() => {
		const targets = [hsva.s, 1 - hsva.v, ratio];
		const isReduced = reduced,
			isActive = active;
		untrack(() => {
			[areaX, areaY, ratioValue].forEach((spring, i) => {
				if (isReduced) spring.jump(targets[i]);
				else
					spring.set(targets[i], {
						spec:
							i < 2 && isActive === 'area'
								? { visualDuration: 0.1, bounce: 0 }
								: { visualDuration: 0.26, bounce: 0.22 }
					});
			});
		});
	});
	$effect(() => {
		if (!morph) return;
		const current = morph;
		if (current.phase === 0) {
			const frame = requestAnimationFrame(() => {
				if (morph?.id === current.id) morph = { ...current, phase: 1 };
			});
			return () => cancelAnimationFrame(frame);
		}
		const timer = setTimeout(() => {
			if (morph?.id === current.id) morph = null;
		}, 620);
		return () => clearTimeout(timer);
	});
	function measure(node: HTMLDivElement) {
		panel = node;
		const fit = () => {
			W = node.offsetWidth;
			H = node.offsetHeight;
			w = trigger?.offsetWidth ?? 160;
			h = trigger?.offsetHeight ?? 44;
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(node);
		return () => observer.disconnect();
	}
	function setOpen(next: boolean) {
		open = next;
		if (next) {
			if (reduced) progress.jump(1);
			else {
				progress.jump(0);
				progress.set(1);
			}
			void fade.set(1, { duration: reduced ? 160 : 0 });
			void tick().then(() => areaThumb?.focus({ preventScroll: true }));
		} else {
			draft = null;
			invalid = false;
		}
	}
	function closeMotion(node: HTMLElement) {
		if (reduced) return { duration: 160, css: (t: number) => `opacity:${t}` };
		const start = progress.current,
			curve = springCurve({ visualDuration: 0.3, bounce: 0 }, start);
		return {
			duration: curve.duration,
			css: (t: number) => {
				const p = start * curve.easing(t),
					r = clamp(p);
				return `clip-path:inset(0px ${Math.max(0, W - w) * (1 - r)}px ${Math.max(0, H - h) * (1 - r)}px 0px round ${22 + 4 * r}px);opacity:1`;
			}
		};
	}
	function commit(next: Hsva) {
		const previous = hex;
		hsva = next;
		const nextHex = toHex(next);
		if (nextHex !== previous) onValueChange?.(nextHex);
	}
	function setSwatches(next: ColorSwatch[]) {
		if (swatchesProp === undefined) ownSwatches = next;
		onSwatchesChange?.(next);
	}
	let pointer: number | null = null;
	function pad(e: PointerEvent) {
		const box = e.currentTarget as HTMLElement;
		const rect = box.getBoundingClientRect();
		commit({
			...hsva,
			s: clamp((e.clientX - rect.left) / rect.width),
			v: 1 - clamp((e.clientY - rect.top) / rect.height)
		});
	}
	function step(e: KeyboardEvent) {
		const n = e.shiftKey ? 10 : 1;
		const steps: Record<string, [number, number]> = {
			ArrowRight: [n, 0],
			ArrowLeft: [-n, 0],
			ArrowUp: [0, n],
			ArrowDown: [0, -n],
			PageUp: [10, 0],
			PageDown: [-10, 0]
		};
		return steps[e.key];
	}
	function cycleFormat() {
		const next = formats[(formats.indexOf(kind) + 1) % formats.length]!;
		const from = text;
		kind = next;
		draft = null;
		invalid = false;
		if (!reduced) morph = { id: Date.now(), from, to: format(hsva, next), phase: 0 };
	}
	function submitDraft() {
		if (draft === null) return true;
		const next = parseColor(draft, hsva.h);
		if (!next) {
			invalid = true;
			if (!reduced)
				field?.animate(
					[
						{ transform: 'translateX(0)' },
						{ transform: 'translateX(-5px)' },
						{ transform: 'translateX(4px)' },
						{ transform: 'translateX(-2px)' },
						{ transform: 'translateX(0)' }
					],
					{ duration: 320, easing: cssEasing(m.ease.standard) }
				);
			return false;
		}
		commit(next);
		draft = null;
		invalid = false;
		return true;
	}
	async function pick() {
		const Ctor = (
			window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
		).EyeDropper;
		if (!Ctor) return;
		try {
			const result = await new Ctor().open(),
				next = parseColor(result.sRGBHex, hsva.h);
			if (next) commit({ ...next, a: hsva.a });
		} catch {
			/* Browser cancellation. */
		}
	}
	function save() {
		const entry = { id: `swatch-${Date.now().toString(36)}-${counter++}`, color: hex };
		setSwatches([entry, ...swatches].slice(0, maxSwatches));
		focusSwatch = entry.id;
	}
	async function focusSaved(id?: string) {
		await tick();
		if (id)
			panel
				?.querySelector<HTMLElement>(`[data-swatch-id="${CSS.escape(id)}"]`)
				?.focus({ preventScroll: true });
		else input?.focus({ preventScroll: true });
	}
	function swatchKey(e: KeyboardEvent, index: number) {
		const item = swatches[index]!,
			move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			const next = swatches.filter((s) => s.id !== item.id);
			setSwatches(next);
			focusSwatch = next[Math.min(index, next.length - 1)]?.id ?? null;
			void focusSaved(focusSwatch ?? undefined);
			return;
		}
		if (!move && e.key !== 'Home' && e.key !== 'End') return;
		e.preventDefault();
		if (move && e.altKey) {
			const to = index + move;
			if (to < 0 || to >= swatches.length) return;
			const next = [...swatches];
			next.splice(index, 1);
			next.splice(to, 0, item);
			setSwatches(next);
			void focusSaved(item.id);
			return;
		}
		const at =
			e.key === 'Home'
				? 0
				: e.key === 'End'
					? swatches.length - 1
					: (index + move + swatches.length) % swatches.length;
		focusSwatch = swatches[at]!.id;
		void focusSaved(focusSwatch);
	}
	let dragOrigin = 0;
	function dragStart(e: PointerEvent, id: string) {
		if (e.button !== 0) return;
		dragId = id;
		dragOrigin = e.clientX;
		dragX = 0;
		dragged = false;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function dragMove(e: PointerEvent) {
		if (!dragId) return;
		dragX = e.clientX - dragOrigin;
		if (Math.abs(dragX) > 3) dragged = true;
		const at = swatches.findIndex((s) => s.id === dragId),
			slots = Array.from(panel?.querySelectorAll<HTMLElement>('[data-swatch-slot]') ?? []),
			target = slots.findIndex((el) => {
				const b = el.getBoundingClientRect();
				return el.dataset.swatchSlot !== dragId && e.clientX >= b.left && e.clientX <= b.right;
			});
		if (target >= 0 && target !== at) {
			const next = [...swatches],
				item = next.splice(at, 1)[0]!;
			next.splice(target, 0, item);
			setSwatches(next);
			dragOrigin += (target - at) * 36;
			dragX = e.clientX - dragOrigin;
		}
	}
	function dragEnd() {
		dragId = null;
		dragX = 0;
		requestAnimationFrame(() => {
			dragged = false;
		});
	}
</script>

{#snippet chip(color: string, extra = '')}<span class={['arc-color-picker__chip', extra]}
		><span style:background={color}></span></span
	>{/snippet}
<div
	class={['arc-color-picker__root', className]}
	style={`--picker-color:${css};--picker-opaque:${opaque};--picker-hue:${pure};--picker-bg:${background}`}
>
	<Popover.Root {open} onOpenChange={setOpen}
		><Popover.Trigger bind:ref={trigger} class="arc-color-picker__trigger"
			>{@render chip(css)}<span class="arc-color-picker__trigger-text"
				><span class="arc-color-picker__name">{label}</span><span class="arc-color-picker__hex"
					>{hex}</span
				></span
			></Popover.Trigger
		>
		<Popover.ContentStatic forceMount trapFocus={false} onOpenAutoFocus={(e) => e.preventDefault()}
			>{#snippet child({ props, open: shown })}{#if shown}<div
						class="arc-color-picker__float"
						data-open={open || undefined}
						out:closeMotion
					>
						<div
							{...props}
							class="arc-color-picker__panel"
							aria-label={`${label} color`}
							style:clip-path={clip}
							style:opacity={fade.current}
							{@attach measure}
						>
							<div class="arc-color-picker__head">
								{@render chip(css)}<span class="arc-color-picker__trigger-text"
									><span class="arc-color-picker__name">{label}</span><span
										class="arc-color-picker__hex">{hex}</span
									></span
								><span class="arc-color-picker__head-actions" style:opacity
									>{#if canPick}<button
											type="button"
											class="arc-color-picker__icon-button"
											aria-label="Pick a color from the screen"
											onclick={pick}
											><Pipette size={18} strokeWidth={1.75} aria-hidden="true" /></button
										>{/if}<button
										type="button"
										class="arc-color-picker__icon-button"
										aria-label="Done"
										onclick={() => setOpen(false)}
										><Check size={18} strokeWidth={1.75} aria-hidden="true" /></button
									></span
								>
							</div>
							<div
								class="arc-color-picker__body"
								style:opacity
								style:transform={`translateY(${-10 * (1 - progress.current)}px)`}
							>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="arc-color-picker__area"
									data-active={active === 'area' || undefined}
									onpointerdown={(e) => {
										if (e.button !== 0 || pointer !== null) return;
										pointer = e.pointerId;
										e.currentTarget.setPointerCapture(e.pointerId);
										active = 'area';
										pad(e);
									}}
									onpointermove={(e) => {
										if (e.pointerId === pointer) pad(e);
									}}
									onpointerup={(e) => {
										if (e.pointerId === pointer) {
											pointer = null;
											active = null;
										}
									}}
									onpointercancel={() => {
										pointer = null;
										active = null;
									}}
								>
									<div
										bind:this={areaThumb}
										class="arc-color-picker__area-thumb"
										role="slider"
										tabindex="0"
										aria-roledescription="2D slider"
										aria-label="Saturation and brightness"
										aria-valuemin={0}
										aria-valuemax={100}
										aria-valuenow={Math.round(hsva.s * 100)}
										aria-valuetext={`Saturation ${Math.round(hsva.s * 100)}%, brightness ${Math.round(hsva.v * 100)}%`}
										style:left={`${areaX.current * 100}%`}
										style:top={`${areaY.current * 100}%`}
										onkeydown={(e) => {
											const delta = step(e);
											if (!delta) return;
											e.preventDefault();
											commit({
												...hsva,
												s: clamp(hsva.s + delta[0] / 100),
												v: clamp(hsva.v + delta[1] / 100)
											});
										}}
									></div>
								</div>
								<ColorSlider
									label="Hue"
									value={hsva.h}
									valueText={`${Math.round(hsva.h)} degrees`}
									max={360}
									onChange={(h) => commit({ ...hsva, h: clamp(h, 0, 359.9) })}
									class="arc-color-picker__hue"
									{reduced}
									fill={pure}
									active={active === 'hue'}
									onActive={(on) => (active = on ? 'hue' : null)}
								/><ColorSlider
									label="Opacity"
									value={hsva.a * 100}
									valueText={`${Math.round(hsva.a * 100)}%`}
									max={100}
									onChange={(a) => commit({ ...hsva, a: clamp(a / 100) })}
									class="arc-color-picker__alpha"
									{reduced}
									fill={css}
									active={active === 'alpha'}
									onActive={(on) => (active = on ? 'alpha' : null)}
								/>
								<div
									bind:this={field}
									class="arc-color-picker__field"
									data-invalid={invalid || undefined}
								>
									<button
										type="button"
										class="arc-color-picker__format"
										onclick={cycleFormat}
										aria-label={`Format: ${formatNames[kind]}. Switch format`}
										><TextMorph text={formatNames[kind]} /></button
									><span class="arc-color-picker__input-wrap"
										><input
											bind:this={input}
											class="arc-color-picker__input"
											value={draft ?? text}
											spellcheck={false}
											autocomplete="off"
											aria-label={`${label} in ${formatNames[kind]}`}
											aria-invalid={invalid || undefined}
											aria-describedby={invalid ? `${uid}-error` : undefined}
											data-morphing={morph ? '' : undefined}
											oninput={(e) => {
												draft = e.currentTarget.value;
												invalid = false;
											}}
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													if (submitDraft()) e.currentTarget.select();
												}
												if (e.key === 'Escape' && draft !== null) {
													e.stopPropagation();
													e.stopImmediatePropagation();
													draft = null;
													invalid = false;
												}
											}}
											onblur={() => {
												if (!submitDraft()) {
													draft = null;
													invalid = false;
												}
											}}
										/>{#if morph}<span class="arc-color-picker__morph" aria-hidden="true"
												><TextMorph text={morph.phase === 0 ? morph.from : morph.to} /></span
											>{/if}</span
									>
								</div>
								<p id={`${uid}-error`} class="arc-color-picker__error" aria-live="polite">
									{invalid ? 'Enter a hex, RGB, HSL, or OKLCH color' : ''}
								</p>
								<div class="arc-color-picker__contrast">
									<span class="arc-color-picker__sample" aria-hidden="true">Aa</span><span
										class="arc-color-picker__ratio"
										><span>{ratioValue.current.toFixed(2)}</span>:1</span
									><span class="arc-color-picker__against">against background</span><span
										class="arc-color-picker__grade"
										data-grade={grade === 'Fails'
											? 'fail'
											: grade === 'AA large'
												? 'large'
												: 'pass'}
										>{#key grade}<span
												in:swap={{
													y: reduced ? 0 : '.3em',
													blur: reduced ? 0 : 2,
													duration: 240,
													skip: !mounted.current
												}}
												out:swap={{ duration: 120, pop: true }}>{grade}</span
											>{/key}</span
									><span class="arc-color-picker__sr-only"
										>{`Contrast ${ratio.toFixed(2)} to 1, ${grade === 'Fails' ? 'fails' : `passes ${grade}`}`}</span
									>
								</div>
								<div class="arc-color-picker__swatches">
									<button
										type="button"
										class="arc-color-picker__add"
										onclick={save}
										aria-label={`Save ${hex}`}
										><Plus size={16} strokeWidth={1.75} aria-hidden="true" /></button
									>
									<div
										class="arc-color-picker__swatch-list"
										role="listbox"
										aria-label="Saved colors"
										aria-orientation="horizontal"
									>
										{#each swatches as entry, index (entry.id)}<div
												class="arc-color-picker__swatch-slot"
												data-swatch-slot={entry.id}
												animate:flip={reduced ? { duration: 0 } : m.spring.smooth}
												in:swap={{
													scale: reduced ? 1 : 0.4,
													...m.spring.snappy,
													skip: !mounted.current
												}}
												out:swap={{ scale: reduced ? 1 : 0.4, duration: 160 }}
											>
												<!-- svelte-ignore a11y_no_static_element_interactions -->
												<div
													style:transform={dragId === entry.id
														? `translateX(${dragX}px) scale(${reduced ? 1 : 1.15})`
														: undefined}
													style:position="relative"
													style:z-index={dragId === entry.id ? 2 : undefined}
													onpointerdown={(e) => dragStart(e, entry.id)}
													onpointermove={dragMove}
													onpointerup={dragEnd}
													onpointercancel={dragEnd}
												>
													<button
														type="button"
														role="option"
														aria-selected={entry.color.toUpperCase() === hex}
														data-swatch-id={entry.id}
														class="arc-color-picker__swatch"
														data-current={entry.color.toUpperCase() === hex || undefined}
														aria-label={`${entry.color}. Alt and arrow keys to move, Delete to remove`}
														tabindex={entry.id === swatchTab ? 0 : -1}
														onfocus={() => (focusSwatch = entry.id)}
														onkeydown={(e) => swatchKey(e, index)}
														onclick={() => {
															if (dragged) return;
															const next = parseColor(entry.color, hsva.h);
															if (next) commit(next);
														}}>{@render chip(entry.color, 'arc-color-picker__swatch-chip')}</button
													>
												</div>
											</div>{/each}
									</div>
								</div>
							</div>
						</div>
					</div>{/if}{/snippet}</Popover.ContentStatic
		></Popover.Root
	>
</div>
