<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { cssEasing, FieldMessage, motionTokens as m, swap, type SwapParams } from '#lib/motion';
	import type { OtpInputProps } from './types';
	import './otp-input.css';

	const generatedId = $props.id();
	let {
		length = 6,
		value = $bindable(''),
		onChange,
		label,
		description,
		error,
		autofocus = false,
		disabled = false,
		inputmode = 'numeric',
		class: className
	}: OtpInputProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const values = $derived(Array.from({ length }, (_, index) => value[index] ?? ''));
	const hintId = $derived(description ? `${generatedId}-description` : undefined);
	const errorId = $derived(error ? `${generatedId}-error` : undefined);
	const describedBy = $derived([hintId, errorId].filter(Boolean).join(' ') || undefined);

	let row = $state<HTMLDivElement>();
	const inputs: (HTMLInputElement | undefined)[] = $state([]);
	const focusAt = (index: number) => inputs[Math.max(0, Math.min(index, length - 1))]?.focus();
	const sanitize = (next: string) => (inputmode === 'numeric' ? next.replace(/\D/g, '') : next);
	const commit = (next: string[]) => {
		value = next.join('');
		onChange?.(value);
	};

	// A paste fills several slots in one update; those digits land as a short left to right wave.
	let fill = untrack(() => ({ value, wave: false }));
	const wave = $derived.by(() => {
		if (fill.value !== value) {
			const changed = Array.from(
				{ length },
				(_, index) => (fill.value[index] ?? '') !== (value[index] ?? '')
			).filter(Boolean).length;
			fill = { value, wave: changed > 1 };
		}
		return fill.wave;
	});

	$effect(() => {
		if (autofocus) untrack(() => inputs[0]?.focus());
	});

	// One ring for the whole row. It glides between slots while focus stays inside, and fades in where focus lands when it arrives from outside.
	const ringX = new Tween(0);
	const ringScale = new Tween(0.94);
	const ringOpacity = new Tween(0);
	let ringWidth = $state(0);
	let ringShown = false;

	function showRing(slot: HTMLElement) {
		const glide = ringShown && !reduced;
		ringShown = true;
		ringWidth = slot.offsetWidth;
		void ringX.set(slot.offsetLeft, glide ? m.spring.snappy : { duration: 0 });
		void ringScale.set(1, reduced ? { duration: 0 } : m.spring.snappy);
		void ringOpacity.set(1, { duration: reduced ? 0 : m.duration.fast });
	}

	function hideRing() {
		ringShown = false;
		void ringScale.set(0.94, reduced ? { duration: 0 } : m.spring.snappy);
		void ringOpacity.set(0, { duration: reduced ? 0 : m.duration.fast });
	}

	// Slots shrink at narrow widths; keep the ring on the focused slot when the row resizes.
	$effect(() => {
		const node = row;
		if (!node || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			const active = document.activeElement;
			const slot = node.contains(active) ? (active?.parentElement ?? null) : null;
			if (!slot) return;
			ringWidth = slot.offsetWidth;
			void ringX.set(slot.offsetLeft, { duration: 0 });
		});
		observer.observe(node);
		return () => observer.disconnect();
	});

	// A new error nudges the row side to side once, so a rejected code reads as a response to the attempt.
	let lastError = untrack(() => error);
	$effect(() => {
		const next = error;
		untrack(() => {
			if (next && next !== lastError && !reduced && row) {
				const easing = cssEasing(m.ease.standard);
				row.animate(
					[0, -6, 5, -3, 2, 0].map((x) => ({ translate: `${x}px`, easing })),
					{ duration: 360 }
				);
			}
			lastError = next;
		});
	});

	function updateAt(index: number, raw: string) {
		const next = values.slice();
		const clean = sanitize(raw).slice(-1);
		next[index] = clean;
		commit(next);
		if (clean && index < length - 1) focusAt(index + 1);
	}

	function handleInput(index: number, event: Event & { currentTarget: HTMLInputElement }) {
		const raw = sanitize(event.currentTarget.value);
		if (raw.length <= 1) {
			updateAt(index, raw);
			// A rejected character leaves the controlled value as it was.
			event.currentTarget.value = values[index] ?? '';
			return;
		}
		const next = values.slice();
		raw
			.slice(0, length - index)
			.split('')
			.forEach((character, offset) => {
				next[index + offset] = character;
			});
		commit(next);
		event.currentTarget.value = values[index] ?? '';
		focusAt(Math.min(index + raw.length, length - 1));
	}

	function handlePaste(index: number, event: ClipboardEvent) {
		event.preventDefault();
		const pasted = sanitize(event.clipboardData?.getData('text') ?? '').slice(0, length - index);
		if (!pasted) return;
		const next = values.slice();
		pasted.split('').forEach((character, offset) => {
			next[index + offset] = character;
		});
		commit(next);
		focusAt(Math.min(index + pasted.length, length - 1));
	}

	function handleKeydown(index: number, event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			focusAt(index - 1);
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			focusAt(index + 1);
		}
		if (event.key === 'Backspace' && !values[index] && index > 0) {
			event.preventDefault();
			const next = values.slice();
			next[index - 1] = '';
			commit(next);
			focusAt(index - 1);
		}
		if (event.key === 'Delete' && values[index]) {
			const next = values.slice();
			next[index] = '';
			commit(next);
		}
	}

	function handleBlur(event: FocusEvent) {
		if (!row?.contains(event.relatedTarget as Node | null)) hideRing();
	}

	/** The input text is transparent; this copy of the digit rises into the slot and unblurs. */
	const glyphIn = (index: number): SwapParams =>
		reduced
			? { duration: m.duration.instant }
			: {
					y: '0.35em',
					blur: m.blur.soft,
					duration: m.duration.standard,
					easing: m.ease.enter,
					delay: wave ? index * m.stagger.item : 0
				};
	const glyphOut = $derived<SwapParams>(
		reduced
			? { duration: 0 }
			: { scale: 0.9, blur: m.blur.subtle, duration: m.duration.instant, easing: m.ease.standard }
	);
	const messageExit = { duration: m.duration.instant, easing: m.ease.standard };
</script>

<div class={['arc-otp-input', className]}>
	<span class="arc-otp-input__label">{label}</span>
	<div
		bind:this={row}
		class="arc-otp-input__inputs"
		role="group"
		aria-label={label}
		data-invalid={error ? 'true' : undefined}
	>
		{#each values as character, index (index)}
			<div class="arc-otp-input__slot">
				<input
					bind:this={inputs[index]}
					class="arc-otp-input__input"
					aria-label="{label}, digit {index + 1} of {length}"
					aria-describedby={describedBy}
					aria-invalid={error ? true : undefined}
					value={character}
					data-filled={character ? 'true' : undefined}
					maxlength="1"
					{inputmode}
					autocomplete={index === 0 ? 'one-time-code' : 'off'}
					{disabled}
					oninput={(event) => handleInput(index, event)}
					onpaste={(event) => handlePaste(index, event)}
					onkeydown={(event) => handleKeydown(index, event)}
					onfocus={(event) => showRing(event.currentTarget.parentElement as HTMLElement)}
					onblur={handleBlur}
				/>
				{#each character ? [character] : [] as glyph (glyph)}
					<span
						class="arc-otp-input__glyph"
						aria-hidden="true"
						in:swap={glyphIn(index)}
						out:swap={glyphOut}>{glyph}</span
					>
				{/each}
			</div>
		{/each}
		<span
			class="arc-otp-input__ring"
			aria-hidden="true"
			style:width="{ringWidth}px"
			style:opacity={ringOpacity.current}
			style:transform="translateX({ringX.current}px) scale({ringScale.current})"
		></span>
	</div>
	<FieldMessage
		id={hintId}
		text={description}
		class="arc-otp-input__description"
		exit={messageExit}
	/>
	<FieldMessage id={errorId} text={error} class="arc-otp-input__error" alert exit={messageExit} />
</div>
