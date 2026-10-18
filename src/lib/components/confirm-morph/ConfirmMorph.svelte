<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { motionTokens as m, swap, Mounted, TargetSpring, springPhysics } from '#lib/motion';
	import type { ConfirmMorphProps, ConfirmMorphState } from './types';
	import './confirm-morph.css';
	let {
		label,
		icon,
		prompt,
		confirmLabel = 'Delete',
		cancelLabel = 'Cancel',
		pendingLabel = 'Deleting',
		doneLabel = 'Deleted',
		errorLabel = 'Couldn’t finish',
		retryLabel = 'Retry',
		undoLabel = 'Undo',
		undoingLabel = 'Restoring',
		tone = 'danger',
		confirmMode = 'press',
		holdDuration = 1000,
		countdown = 3,
		countdownLabel,
		onConfirm,
		onUndo,
		onCancel,
		state: stateProp = $bindable(),
		defaultState = 'idle',
		onStateChange,
		confirmTimeout = 6000,
		resultTimeout = 5000,
		cancelOnOutsidePress = true,
		disabled = false,
		class: className,
		ref = $bindable(null)
	}: ConfirmMorphProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let inner = $state(untrack(() => defaultState)),
		working = $state<'confirm' | 'undo'>('confirm'),
		counting = $state(false),
		announcement = $state(''),
		hover = $state(false),
		hidden = $state(false);
	const current = $derived(stateProp ?? inner),
		faceKey = $derived(current === 'confirming' && counting ? 'counting' : current);
	const shownPrompt = $derived(
		prompt ?? (typeof label === 'string' || typeof label === 'number' ? `${label}?` : undefined)
	);
	const shownCountdown = $derived(countdownLabel ?? `${pendingLabel} in`);
	const uid = $props.id(),
		promptId = `arc-confirm-morph-${uid}-prompt`,
		holdHintId = `arc-confirm-morph-${uid}-hold`;
	const mounted = new Mounted();
	const width = new TargetSpring(0, springPhysics(m.specs.morph));
	let sized = $state(false),
		target = 0,
		askedAt = 0,
		run = 0,
		pendingFocus = false;
	const remaining = new Tween(1),
		hold = new Tween(0);
	const seconds = $derived(Math.max(1, Math.ceil(remaining.current * countdown)));
	let holding = false,
		holdRun = 0;
	$effect(() => () => {
		run++;
		holdRun++;
	});
	function keepFocus() {
		pendingFocus =
			!!ref && (ref.contains(document.activeElement) || document.activeElement === document.body);
	}
	function go(next: ConfirmMorphState) {
		if (next !== 'confirming') counting = false;
		if (next === current) return;
		keepFocus();
		if (next === 'confirming') askedAt = performance.now();
		inner = next;
		if (!onStateChange) stateProp = next;
		onStateChange?.(next);
	}
	function idle() {
		run++;
		go('idle');
	}
	function cancel() {
		onCancel?.();
		idle();
		announcement = 'Cancelled';
	}
	async function perform(kind: 'confirm' | 'undo') {
		const token = ++run;
		working = kind;
		counting = false;
		let result: void | Promise<unknown>;
		try {
			result = (kind === 'confirm' ? onConfirm : onUndo)?.();
		} catch {
			go('error');
			announcement = errorLabel;
			return;
		}
		if (result && typeof result.then === 'function') {
			go('pending');
			announcement = kind === 'confirm' ? pendingLabel : undoingLabel;
			try {
				await result;
			} catch {
				if (token !== run) return;
				go('error');
				announcement = errorLabel;
				return;
			}
			if (token !== run) return;
		}
		if (kind === 'undo') {
			go('idle');
			announcement = 'Undone';
			return;
		}
		go('done');
		announcement = onUndo ? `${doneLabel}. ${undoLabel} is available.` : doneLabel;
	}
	function answer() {
		if (performance.now() - askedAt < 280) return;
		if (confirmMode === 'countdown') {
			keepFocus();
			counting = true;
			announcement = `${shownCountdown} ${countdown} seconds`;
			return;
		}
		void perform('confirm');
	}
	$effect(() => {
		if (current !== 'confirming') {
			counting = false;
			untrack(() => {
				holding = false;
				holdRun++;
				void hold.set(0, { duration: 0 });
			});
		}
	});
	$effect(() => {
		if (!counting) return;
		let active = true;
		void remaining
			.set(1, { duration: 0 })
			.then(() => remaining.set(0, { duration: Math.max(0, countdown * 1000), easing: (t) => t }))
			.then(() => {
				if (active) void perform('confirm');
			});
		return () => {
			active = false;
			void remaining.set(remaining.current, { duration: 0 });
		};
	});
	function startHold() {
		if (holding) return;
		holding = true;
		const token = ++holdRun;
		void hold
			.set(1, { duration: Math.max(0, holdDuration * (1 - hold.current)), easing: (t) => t })
			.then(() => {
				if (!holding || token !== holdRun) return;
				holding = false;
				void perform('confirm');
			});
	}
	function releaseHold() {
		if (!holding) return;
		holding = false;
		holdRun++;
		if (hold.current < 1) {
			void hold.set(0, reduced ? { duration: 0 } : { ...m.spring.smooth });
			announcement = `Keep holding to ${confirmLabel.toLowerCase()}`;
		}
	}
	function holdKeys(event: KeyboardEvent, down: boolean) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		if (down) {
			if (!event.repeat) startHold();
		} else releaseHold();
	}
	$effect(() => {
		const change = () => (hidden = document.hidden);
		document.addEventListener('visibilitychange', change);
		return () => document.removeEventListener('visibilitychange', change);
	});
	// Timeout elapsed is retained through hover and page visibility pauses.
	let clock = { key: '', remaining: 0, last: 0, duration: 0 };
	$effect(() => {
		const key = `${current}:${counting}`,
			duration =
				current === 'confirming' && !counting
					? confirmTimeout
					: current === 'done' || current === 'error'
						? resultTimeout
						: 0;
		const paused = hover || hidden;
		if (clock.key !== key || clock.duration !== duration) {
			clock = { key, remaining: duration, last: performance.now(), duration };
		}
		if (!duration || paused) return;
		clock.last = performance.now();
		const timer = setTimeout(
			() => {
				clock.remaining = 0;
				if (current === 'confirming') cancel();
				else idle();
			},
			Math.max(0, clock.remaining)
		);
		return () => {
			clearTimeout(timer);
			clock.remaining = Math.max(0, clock.remaining - (performance.now() - clock.last));
		};
	});
	$effect(() => {
		if (current !== 'confirming' || !cancelOnOutsidePress) return;
		const down = (event: PointerEvent) => {
			if (!ref?.contains(event.target as Node)) cancel();
		};
		document.addEventListener('pointerdown', down);
		return () => document.removeEventListener('pointerdown', down);
	});
	$effect(() => {
		void faceKey;
		untrack(() => {
			if (!pendingFocus) return;
			pendingFocus = false;
			void tick().then(() => {
				const face = ref?.querySelector<HTMLElement>(`[data-face="${faceKey}"]:not([inert])`);
				(face?.querySelector<HTMLElement>('[data-autofocus]:not(:disabled)') ?? ref)?.focus({
					preventScroll: true
				});
			});
		});
	});
	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (current === 'confirming') {
				event.preventDefault();
				event.stopPropagation();
				cancel();
			} else if (current === 'done' || current === 'error') {
				event.preventDefault();
				event.stopPropagation();
				idle();
			}
			return;
		}
		if (
			event.key === 'Enter' &&
			current === 'confirming' &&
			!event.repeat &&
			!(event.target instanceof HTMLButtonElement)
		) {
			event.preventDefault();
			if (counting) void perform('confirm');
			else if (confirmMode !== 'hold') answer();
		}
	}
	let liveFace: HTMLElement | undefined;
	function reportFaceSize(node: HTMLElement) {
		if (node !== liveFace || node.inert) return;
		const next = node.getBoundingClientRect().width;
		if (Math.abs(next - target) < 0.25) return;
		const previous = target;
		target = next;
		if (!previous || reduced) {
			void width.set(next, { instant: true });
			sized = true;
			return;
		}
		width.spec = springPhysics(next > width.current ? m.specs.morph : m.specs.smooth);
		// The source starts this motion value at "auto", so its runtime never
		// tracks velocity even though the transition uses physical parameters.
		void width.set(next, { velocity: 0 });
		sized = true;
	}
	function measure(node: HTMLElement) {
		void reduced;
		if (node.inert) return;
		liveFace = node;
		const report = () => reportFaceSize(node);
		untrack(report);
		const observer = new ResizeObserver(report);
		observer.observe(node);
		return () => observer.disconnect();
	}
	$effect(() => {
		const key = faceKey;
		untrack(() => {
			// A keyed face can return before its outro ends without resizing.
			// Republish that face even when ResizeObserver has no new entry.
			const node = ref?.querySelector<HTMLElement>(`[data-face="${key}"]:not([inert])`);
			if (node) {
				liveFace = node;
				reportFaceSize(node);
			}
		});
	});

	function faceOut(node: HTMLElement) {
		node.inert = true;
		return swap(
			node,
			reduced
				? { duration: 100, pop: true }
				: { blur: 2, duration: 120, easing: m.ease.standard, pop: true },
			{ direction: 'out' }
		);
	}
	function partIn(node: HTMLElement) {
		const index = Array.from(
			node.parentElement?.querySelectorAll(':scope > .arc-confirm-morph__part') ?? []
		).indexOf(node);
		return swap(
			node,
			{
				blur: reduced ? 0 : 4,
				duration: reduced ? 0 : 260,
				delay: reduced ? 0 : 50 + Math.max(0, index) * 35,
				easing: m.ease.enter,
				skip: !mounted.current
			},
			{ direction: 'in' }
		);
	}
</script>

{#snippet text(
	value: string | number | Snippet | undefined
)}{#if typeof value === 'function'}{@render value()}{:else}{value ?? ''}{/if}{/snippet}
{#snippet part(children: Snippet, extra = '')}<span
		class={['arc-confirm-morph__part', extra]}
		in:partIn>{@render children()}</span
	>{/snippet}
<!-- svelte-ignore a11y_no_static_element_interactions (root delegates keyboard actions to its native buttons) -->
<div
	bind:this={ref}
	class={['arc-confirm-morph__root', className]}
	data-state={current}
	data-face={faceKey}
	data-tone={tone}
	data-mode={confirmMode}
	data-disabled={disabled || undefined}
	tabindex="-1"
	onkeydown={keydown}
	aria-busy={current === 'pending' || undefined}
	onpointerenter={() => (hover = true)}
	onpointerleave={() => (hover = false)}
	onpointercancel={() => (hover = false)}
>
	<div class="arc-confirm-morph__surface" style:width={sized ? `${width.current}px` : undefined}>
		{#key faceKey}<div
				class="arc-confirm-morph__face"
				data-face={faceKey}
				role={faceKey === 'confirming' ? 'group' : undefined}
				aria-labelledby={faceKey === 'confirming' ? promptId : undefined}
				in:swap={{ duration: reduced ? 140 : 0, skip: !mounted.current }}
				out:faceOut
				{@attach measure}
			>
				{#if faceKey === 'confirming'}
					{#snippet question()}<span id={promptId}
							>{#if shownPrompt !== undefined}{@render text(shownPrompt)}{:else}{@render text(
									label
								)}?{/if}</span
						>{/snippet}{@render part(question, 'arc-confirm-morph__prompt')}
					{#snippet no()}<button type="button" class="arc-confirm-morph__secondary" onclick={cancel}
							>{cancelLabel}</button
						>{/snippet}{@render part(no)}
					{#snippet yes()}{#if confirmMode === 'hold'}<button
								type="button"
								class="arc-confirm-morph__confirm"
								data-autofocus
								aria-describedby={holdHintId}
								onpointerdown={(e) => {
									if (e.button !== 0) return;
									e.currentTarget.setPointerCapture(e.pointerId);
									startHold();
								}}
								onpointerup={releaseHold}
								onpointercancel={releaseHold}
								onlostpointercapture={releaseHold}
								onkeydown={(e) => holdKeys(e, true)}
								onkeyup={(e) => holdKeys(e, false)}
								onblur={releaseHold}
								oncontextmenu={(e) => e.preventDefault()}
								><span>{confirmLabel}</span><span
									class="arc-confirm-morph__fill"
									style:clip-path={`inset(0 ${(1 - hold.current) * 100}% 0 0 round 999px)`}
									aria-hidden="true"><span>{confirmLabel}</span></span
								></button
							>{:else}<button
								type="button"
								class="arc-confirm-morph__confirm"
								data-autofocus
								onclick={answer}
								onkeydown={(e) => {
									if (e.repeat) e.preventDefault();
								}}>{confirmLabel}</button
							>{/if}{/snippet}{@render part(yes)}
					{#if confirmMode === 'hold'}<span id={holdHintId} class="arc-confirm-morph__srOnly"
							>Press and hold</span
						>{/if}
				{:else if faceKey === 'counting'}
					{#snippet count()}<svg
							class="arc-confirm-morph__ring"
							viewBox="0 0 16 16"
							fill="none"
							aria-hidden="true"
							><circle
								class="arc-confirm-morph__ringTrack"
								cx="8"
								cy="8"
								r="6.25"
								stroke-width="1.75"
							/><circle
								class="arc-confirm-morph__ringFill"
								cx="8"
								cy="8"
								r="6.25"
								stroke-width="1.75"
								stroke-linecap="round"
								pathLength="1"
								stroke-dasharray="1"
								stroke-dashoffset={1 - remaining.current}
								style="transform:rotate(-90deg);transform-origin:8px 8px"
							/></svg
						><span class="arc-confirm-morph__statusText"
							>{shownCountdown}
							<span class="arc-confirm-morph__seconds"
								>{#key seconds}<span
										class="arc-confirm-morph__digit"
										in:swap={{
											y: reduced ? 0 : 6,
											blur: reduced ? 0 : 2,
											duration: 220,
											easing: m.ease.enter,
											skip: !mounted.current
										}}
										out:swap={{
											y: reduced ? 0 : -6,
											blur: reduced ? 0 : 2,
											duration: 220,
											easing: m.ease.enter,
											pop: true
										}}>{seconds}</span
									>{/key}</span
							></span
						>{/snippet}{@render part(count, 'arc-confirm-morph__status')}
					{#snippet no()}<button type="button" class="arc-confirm-morph__secondary" onclick={cancel}
							>{cancelLabel}</button
						>{/snippet}{@render part(no)}
				{:else if faceKey === 'pending'}
					{#snippet pending()}<LoaderCircle
							class="arc-confirm-morph__spinner"
							size={16}
							strokeWidth={1.75}
							aria-hidden="true"
						/><span class="arc-confirm-morph__statusText"
							>{working === 'undo' ? undoingLabel : pendingLabel}</span
						>{/snippet}{@render part(pending, 'arc-confirm-morph__status')}
				{:else if faceKey === 'done'}
					{#snippet done()}<svg
							class="arc-confirm-morph__check"
							viewBox="0 0 18 18"
							fill="none"
							aria-hidden="true"
							><circle
								class="arc-confirm-morph__checkDisc"
								cx="9"
								cy="9"
								r="8"
								style="transform-origin:9px 9px"
								in:swap={{ scale: 0.5, ...m.spring.snappy, fade: { duration: 120 }, skip: reduced }}
							/><path
								class="arc-confirm-morph__checkTick"
								d="M5.6 9.3 7.8 11.4 12.4 6.7"
								stroke-width="1.9"
								stroke-linecap="round"
								stroke-linejoin="round"
								pathLength="1"
								{@attach (node: SVGPathElement) => {
									if (reduced) return;
									const a = node.animate(
										[
											{ strokeDasharray: 1, strokeDashoffset: 1 },
											{ strokeDasharray: 1, strokeDashoffset: 0 }
										],
										{
											duration: 300,
											delay: 140,
											easing: 'cubic-bezier(.16,1,.3,1)',
											fill: 'backwards'
										}
									);
									return () => a.cancel();
								}}
							/></svg
						><span class="arc-confirm-morph__statusText">{doneLabel}</span>{/snippet}{@render part(
						done,
						'arc-confirm-morph__status'
					)}
					{#if onUndo}{#snippet undo()}<button
								type="button"
								class="arc-confirm-morph__secondary"
								data-autofocus
								onclick={() => void perform('undo')}>{undoLabel}</button
							>{/snippet}{@render part(undo)}{/if}
				{:else if faceKey === 'error'}
					{#snippet error()}<CircleAlert
							class="arc-confirm-morph__alert"
							size={16}
							strokeWidth={1.75}
							aria-hidden="true"
						/><span class="arc-confirm-morph__statusText">{errorLabel}</span
						>{/snippet}{@render part(error, 'arc-confirm-morph__status')}
					{#snippet retry()}<button
							type="button"
							class="arc-confirm-morph__secondary"
							data-autofocus
							onclick={() => void perform(working)}>{retryLabel}</button
						>{/snippet}{@render part(retry)}
				{:else}
					{#snippet trigger()}<button
							type="button"
							class="arc-confirm-morph__trigger"
							data-autofocus
							{disabled}
							onclick={() => {
								announcement = typeof shownPrompt === 'string' ? shownPrompt : '';
								go('confirming');
							}}
							>{#if icon}<span class="arc-confirm-morph__icon" aria-hidden="true"
									>{@render icon()}</span
								>{/if}<span>{@render text(label)}</span></button
						>{/snippet}{@render part(trigger)}
				{/if}
			</div>{/key}
	</div>
	<span class="arc-confirm-morph__srOnly" role="status" aria-live="polite">{announcement}</span>
</div>
