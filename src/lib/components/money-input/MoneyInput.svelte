<script lang="ts">
	import { untrack, tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import {
		motionTokens as m,
		Mounted,
		swap,
		cssEasing,
		springPhysics,
		TargetSpring,
		PhysicalSpring
	} from '#lib/motion';
	import Glyphs from './Glyphs.svelte';
	import SymbolSlot from './SymbolSlot.svelte';
	import {
		currencyInfo,
		localeSymbols,
		pow10,
		toMinor,
		fromMinor,
		settle,
		convertDraft,
		displayOf,
		partsOf,
		isSignificant,
		positionAfter,
		type CurrencyInfo
	} from './format';
	import type { MoneyInputProps } from './types';
	import Message from '#lib/motion/MessageRow.svelte';
	import './money-input.css';
	let {
		label,
		hideLabel = false,
		value = $bindable(undefined),
		defaultValue = null,
		onValueChange,
		currency: currencyProp = $bindable(undefined),
		defaultCurrency = 'USD',
		onCurrencyChange,
		currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR'],
		min,
		max,
		quickAdd = [10, 50, 100],
		step: stepProp,
		locale = 'en-US',
		description,
		error,
		disabled = false,
		name,
		id,
		class: className,
		onblur,
		ref = $bindable(null)
	}: MoneyInputProps = $props();
	type Source = 'type' | 'chip' | 'key' | 'external';
	const MAX_INTEGER_DIGITS = 12;
	const mounted = new Mounted();
	const reduced = $derived(mounted.current && !!prefersReducedMotion.current);
	const uid = $props.id(),
		inputId = $derived(id ?? `${uid}-amount`),
		hintId = $derived(`${inputId}-hint`),
		errorId = $derived(`${inputId}-error`),
		rangeId = $derived(`${inputId}-range`);
	let innerCurrency = $state(untrack(() => defaultCurrency));
	const code = $derived(currencyProp ?? innerCurrency),
		info = $derived(currencyInfo(code, locale)),
		symbols = $derived(localeSymbols(locale)),
		step = $derived(stepProp && stepProp > 0 ? stepProp : pow10(info.digits));
	let draft = $state(
		untrack(() => fromMinor(value !== undefined ? value : defaultValue, info.digits))
	);
	const minor = $derived(toMinor(draft, info.digits));
	let source = $state<Source>('external'),
		direction = $state(1),
		focused = $state(false),
		touched = $state(false),
		limitFlash = $state(0),
		announcement = $state(''),
		caretVersion = $state(0);
	let seenValue = untrack(() => value);
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== seenValue) {
				seenValue = next;
				if (next !== undefined && next !== minor) {
					direction = (next ?? 0) >= (minor ?? 0) ? 1 : -1;
					draft = fromMinor(next, info.digits);
					source = 'external';
				}
			}
		});
	});
	const inputRef = $derived(ref);
	let pendingCaret: number | null = null;
	let latest = $derived({ minor, draft });
	const money = (amount: number | null) =>
		amount === null ? '' : info.full.format(amount / pow10(info.digits));
	const display = $derived(displayOf(draft, symbols)),
		parts = $derived(partsOf(draft, info.digits, symbols));
	let flashTimer: number | undefined,
		bumpX = new PhysicalSpring(0, { visualDuration: 0.42, bounce: 0.3 });
	let wrapRef = $state<HTMLDivElement>(),
		groupRef = $state<HTMLDivElement>();
	function refuse(toward: 1 | -1, limit: number) {
		if (!reduced) bumpX.set(0, { velocity: toward * 160 });
		limitFlash += 1;
		window.clearTimeout(flashTimer);
		flashTimer = window.setTimeout(() => (limitFlash = 0), 1400);
		announcement = `${toward > 0 ? 'Maximum' : 'Minimum'} is ${money(limit)}`;
	}

	function emit(nextMinor: number | null, nextInfo = info) {
		onValueChange?.(nextMinor, {
			currency: nextInfo.code,
			major: nextMinor === null ? null : nextMinor / pow10(nextInfo.digits),
			formatted: nextMinor === null ? '' : nextInfo.full.format(nextMinor / pow10(nextInfo.digits))
		});
	}

	function setAmount(nextDraft: string, nextSource: Source) {
		const previousMinor = minor;
		const nextMinor = toMinor(nextDraft, info.digits);
		direction = (nextMinor ?? 0) >= (latest.minor ?? 0) ? 1 : -1;
		source = nextSource;
		draft = nextDraft;
		latest = { minor: nextMinor, draft: nextDraft };
		if (nextMinor !== previousMinor) emit(nextMinor);
		if (value !== undefined && onValueChange && value !== nextMinor) {
			draft = fromMinor(value, info.digits);
			latest = { minor: toMinor(draft, info.digits), draft };
		} else if (value !== undefined && !onValueChange) value = nextMinor;
		if (nextSource !== 'type') announcement = money(nextMinor);
	}

	/* ---------------------------------------------- Typing ---------------------------------------------- */

	/** Reads what the input holds into a draft and counts the digits and decimal before the caret, so the caret can return to the same spot. */
	function sanitize(raw: string, caret: number) {
		let out = '',
			before = 0,
			dot = false;
		for (let index = 0; index < raw.length; index++) {
			const char = raw[index]!;
			let kept = '';
			if (/\d/.test(char)) kept = char;
			else if (
				(char === symbols.decimal || (char === '.' && symbols.group !== '.')) &&
				info.digits > 0 &&
				!dot
			) {
				kept = '.';
				dot = true;
			}
			if (!kept) continue;
			out += kept;
			if (index < caret) before++;
		}
		const pieces = out.split('.');
		let whole = pieces[0]!;
		const fraction = pieces[1];
		const stripped = whole.length - whole.replace(/^0+/, '').length;
		whole = whole.replace(/^0+/, '');
		let shift = -Math.min(stripped, before);
		if (fraction !== undefined && !whole) {
			whole = '0';
			shift += 1;
		}
		if (fraction === undefined && !whole && stripped) {
			whole = '0';
			shift += 1;
		}
		if (fraction !== undefined && fraction.length > info.digits) return null;
		if (whole.length > MAX_INTEGER_DIGITS) return null;
		return {
			draft: fraction !== undefined ? `${whole}.${fraction}` : whole,
			before: Math.max(0, before + shift)
		};
	}

	function applyRaw(raw: string, caret: number) {
		caretVersion++;
		const result = sanitize(raw, caret);
		// A refused keystroke keeps the caret where it was: one significant character before where the browser left it.
		if (!result) {
			pendingCaret = Math.max(
				0,
				Array.from(raw.slice(0, caret)).filter(
					(char) => isSignificant(char, symbols.decimal) || char === '.'
				).length - 1
			);
			caretVersion++;
			return;
		}
		const nextMinor = toMinor(result.draft, info.digits);
		if (max !== undefined && nextMinor !== null && nextMinor > max) {
			pendingCaret = Math.max(0, result.before - 1);
			refuse(1, max);
			caretVersion++;
			return;
		}
		pendingCaret = result.before;
		setAmount(result.draft, 'type');
	}

	$effect(() => {
		void draft;
		void caretVersion;
		untrack(() => {
			const input = inputRef,
				count = pendingCaret;
			pendingCaret = null;
			if (!input) return;
			input.value = display;
			if (count !== null && document.activeElement === input) {
				const position = positionAfter(input.value, count, symbols.decimal);
				input.setSelectionRange(position, position);
			}
		});
	});
	function onKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const moves: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
		if (event.key in moves) {
			event.preventDefault();
			const amount =
				moves[event.key]! * step * (event.shiftKey && Math.abs(moves[event.key]!) === 1 ? 10 : 1);
			nudge(amount, 'key');
			return;
		}
		if (event.key === 'Enter') {
			draft = settle(draft, info.digits);
			pendingCaret = Number.MAX_SAFE_INTEGER;
			return;
		}
		const start = input.selectionStart ?? 0,
			end = input.selectionEnd ?? 0;
		if (start !== end || event.metaKey || event.ctrlKey || event.altKey) return;
		// Deleting a group separator deletes the digit before it instead of doing nothing.
		if (event.key === 'Backspace' && start > 1 && input.value[start - 1] === symbols.group) {
			event.preventDefault();
			applyRaw(input.value.slice(0, start - 2) + input.value.slice(start - 1), start - 2);
		}
		if (event.key === 'Delete' && input.value[start] === symbols.group) {
			event.preventDefault();
			applyRaw(input.value.slice(0, start + 1) + input.value.slice(start + 2), start);
		}
	}

	function onPaste(event: ClipboardEvent & { currentTarget: HTMLInputElement }) {
		const text = event.clipboardData?.getData('text').trim() ?? '';
		if (!text) return;
		event.preventDefault();
		// "$1,234.56", "1.234,56 €", "1234.5": a final separator followed by one or two digits is the decimal; the rest are groups.
		const match = /[.,](\d{1,2})\s*\D*$/.exec(text);
		const whole = (match ? text.slice(0, match.index) : text).replace(/\D/g, '');
		const pasted = match && info.digits ? `${whole}.${match[1]}` : whole;
		if (!/\d/.test(pasted)) return;
		const input = event.currentTarget;
		const start = input.selectionStart ?? 0,
			end = input.selectionEnd ?? 0;
		const inserted = pasted.replace('.', symbols.decimal);
		const replaceAll = (start === 0 && end === input.value.length) || !input.value;
		const raw = replaceAll
			? inserted
			: input.value.slice(0, start) + inserted + input.value.slice(end);
		applyRaw(raw, replaceAll ? raw.length : start + inserted.length);
	}

	/* ---------------------------------------------- Steps and chips ---------------------------------------------- */

	function nudge(amount: number, nextSource: Source) {
		const from = latest.minor ?? 0;
		const floor = min ?? 0,
			ceiling = max ?? Number.MAX_SAFE_INTEGER;
		let next = from + amount;
		if (next > ceiling) {
			if (from >= ceiling) {
				refuse(1, ceiling);
				return;
			}
			next = ceiling;
			refuse(1, ceiling);
		}
		if (next < floor) {
			if (from <= floor && latest.minor !== null) {
				refuse(-1, floor);
				return;
			}
			next = floor;
		}
		pendingCaret = Number.MAX_SAFE_INTEGER;
		setAmount(fromMinor(next, info.digits), nextSource);
	}

	const scale = new TargetSpring(1, m.specs.smooth);
	function observeFit() {
		if (!wrapRef || !groupRef) return;
		let first = true;
		let frame = 0;
		const fit = () => {
			if (!groupRef || !wrapRef) return;
			const natural = groupRef.offsetWidth,
				room = wrapRef.clientWidth;
			const next = natural > 0 && room > 0 ? Math.min(1, room / natural) : 1;
			const snap = first || reduced || Math.abs(next - scale.current) <= 0.005;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
			// Motion queues a render for jumps and for a spring already inside
			// its normalized rest window. Observer writes enter the next frame.
			if (snap)
				frame = requestAnimationFrame(() => {
					frame = 0;
					void scale.set(next, { instant: true });
				});
			else void scale.set(next);
			first = false;
		};
		const observer = new ResizeObserver(fit);
		observer.observe(wrapRef);
		observer.observe(groupRef);
		return () => {
			observer.disconnect();
			if (frame) cancelAnimationFrame(frame);
			clearTimeout(flashTimer);
			bumpX.destroy();
		};
	}
	let menuOpen = $state(false),
		activeCode = $state(untrack(() => code));
	let menuRef = $state<HTMLDivElement>(),
		listRef = $state<HTMLDivElement>(),
		menuButtonRef = $state<HTMLButtonElement>();
	const options = $derived(currencies.map((entry) => currencyInfo(entry, locale))),
		canSwitch = $derived(options.length > 1);
	const glide = springPhysics({ visualDuration: 0.28, bounce: 0.08 });
	const hy = new TargetSpring(0, glide),
		hh = new TargetSpring(0, glide);
	let ho = $state(0);
	const openMenu = () => {
		if (disabled) return;
		activeCode = code;
		menuOpen = true;
	};
	const closeMenu = (focusButton: boolean) => {
		menuOpen = false;
		if (focusButton) menuButtonRef?.focus({ preventScroll: true });
	};
	$effect(() => {
		if (!menuOpen) return;
		untrack(() => {
			void tick().then(() => listRef?.focus({ preventScroll: true }));
		});
		const down = (event: PointerEvent) => {
			if (!menuRef?.contains(event.target as Node)) closeMenu(false);
		};
		document.addEventListener('pointerdown', down);
		return () => document.removeEventListener('pointerdown', down);
	});
	$effect(() => {
		const active = activeCode,
			open = menuOpen;
		untrack(() => {
			const node = open ? document.getElementById(`${uid}-cur-${active}`) : null;
			if (!node) {
				ho = 0;
				return;
			}
			void hy.set(node.offsetTop, { instant: ho < 0.05 || reduced });
			void hh.set(node.offsetHeight, { instant: ho < 0.05 || reduced });
			ho = 1;
			node.scrollIntoView({ block: 'nearest' });
		});
	});
	function chooseCurrency(next: CurrencyInfo) {
		closeMenu(true);
		if (next.code === code) return;
		const nextDraft = focused
				? convertDraft(draft, next.digits)
				: settle(convertDraft(draft, next.digits), next.digits),
			nextMinor = toMinor(nextDraft, next.digits);
		if (currencyProp === undefined) innerCurrency = next.code;
		else if (!onCurrencyChange) currencyProp = next.code;
		onCurrencyChange?.(next.code);
		source = 'external';
		draft = nextDraft;
		latest = { minor: nextMinor, draft: nextDraft };
		emit(nextMinor, next);
		announcement = `${next.name}${nextMinor === null ? '' : `, ${next.full.format(nextMinor / pow10(next.digits))}`}`;
	}
	const typeahead = { buffer: '', at: 0 };
	function onMenuKeyDown(event: KeyboardEvent) {
		const at = options.findIndex((option) => option.code === activeCode);
		const go = (index: number) => {
			event.preventDefault();
			activeCode = options[Math.max(0, Math.min(options.length - 1, index))]!.code;
		};
		switch (event.key) {
			case 'ArrowDown':
				go(at + 1);
				return;
			case 'ArrowUp':
				go(at - 1);
				return;
			case 'Home':
				go(0);
				return;
			case 'End':
				go(options.length - 1);
				return;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (options[at]) chooseCurrency(options[at]);
				return;
			case 'Escape':
				event.preventDefault();
				event.stopPropagation();
				closeMenu(true);
				return;
			case 'Tab':
				closeMenu(false);
				return;
		}
		if (event.key.length === 1 && /\w/.test(event.key)) {
			const now = performance.now();
			typeahead.buffer =
				now - typeahead.at > 600
					? event.key.toLowerCase()
					: typeahead.buffer + event.key.toLowerCase();
			typeahead.at = now;
			const hit = options.find(
				(option) =>
					option.code.toLowerCase().startsWith(typeahead.buffer) ||
					option.name.toLowerCase().startsWith(typeahead.buffer)
			);
			if (hit) {
				event.preventDefault();
				activeCode = hit.code;
			}
		}
	}
	const range = $derived(
		min !== undefined && max !== undefined
			? `${money(min)} to ${money(max)}`
			: max !== undefined
				? `Up to ${money(max)}`
				: min !== undefined
					? `At least ${money(min)}`
					: ''
	);
	const outOfRange = $derived(
			minor !== null && ((min !== undefined && minor < min) || (max !== undefined && minor > max))
		),
		belowMin = $derived(minor !== null && min !== undefined && minor < min);
	const builtIn = $derived(
			touched && !focused && outOfRange
				? belowMin
					? `The minimum is ${money(min ?? 0)}`
					: `The maximum is ${money(max ?? 0)}`
				: undefined
		),
		message = $derived(error ?? builtIn),
		invalid = $derived(!!message);
	const describedBy = $derived(
			[range ? rangeId : null, description ? hintId : null, message ? errorId : null]
				.filter(Boolean)
				.join(' ') || undefined
		),
		instant = $derived(source === 'type'),
		chips = $derived(quickAdd.filter((amount) => amount > 0));
</script>

<div class={['arc-money-input__field', className]} data-disabled={disabled || undefined}>
	<label for={inputId} class={hideLabel ? 'arc-money-input__srOnly' : 'arc-money-input__label'}
		>{label}</label
	>
	<div
		class="arc-money-input__control"
		data-invalid={invalid || undefined}
		data-focused={focused || undefined}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
		<div
			bind:this={wrapRef}
			class="arc-money-input__amountWrap"
			onmousedown={(event) => {
				if (event.target !== inputRef) event.preventDefault();
			}}
			onclick={(event) => {
				if (!disabled && event.target !== inputRef) {
					inputRef?.focus();
					inputRef?.setSelectionRange(inputRef.value.length, inputRef.value.length);
				}
			}}
		>
			<div
				bind:this={groupRef}
				class="arc-money-input__group"
				style:transform={`translateX(${bumpX.current}px) scale(${scale.current})`}
				{@attach observeFit}
			>
				{#if info.position === 'prefix'}<SymbolSlot symbol={info.symbol} {reduced} />{/if}
				<span class="arc-money-input__number"
					><span class="arc-money-input__mirror" aria-hidden="true" data-empty={!draft || undefined}
						><Glyphs {parts} {direction} {instant} {reduced} /></span
					>
					<input
						bind:this={ref}
						id={inputId}
						class="arc-money-input__input"
						type="text"
						role="spinbutton"
						inputmode={info.digits ? 'decimal' : 'numeric'}
						autocomplete="off"
						spellcheck={false}
						value={display}
						{disabled}
						aria-invalid={invalid || undefined}
						aria-describedby={describedBy}
						aria-label={hideLabel ? label : undefined}
						aria-valuenow={minor === null ? undefined : minor / pow10(info.digits)}
						aria-valuetext={minor === null ? 'Empty' : money(minor)}
						aria-valuemin={min === undefined ? undefined : min / pow10(info.digits)}
						aria-valuemax={max === undefined ? undefined : max / pow10(info.digits)}
						oninput={(event) =>
							applyRaw(
								event.currentTarget.value,
								event.currentTarget.selectionStart ?? event.currentTarget.value.length
							)}
						onkeydown={onKeyDown}
						onpaste={onPaste}
						onfocus={() => (focused = true)}
						onblur={(event) => {
							focused = false;
							touched = true;
							if (draft) draft = settle(draft, info.digits);
							onblur?.(event);
						}}
					/>
				</span>{#if info.position === 'suffix'}<SymbolSlot symbol={info.symbol} {reduced} />{/if}
			</div>
		</div>
		{#if canSwitch}<div bind:this={menuRef} class="arc-money-input__menuAnchor">
				<button
					bind:this={menuButtonRef}
					type="button"
					class="arc-money-input__currencyButton"
					{disabled}
					aria-haspopup="listbox"
					aria-expanded={menuOpen}
					aria-controls={`${uid}-currencies`}
					aria-label={`Currency, ${info.name}`}
					data-open={menuOpen || undefined}
					onclick={() => (menuOpen ? closeMenu(true) : openMenu())}
					onkeydown={(event) => {
						if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
							event.preventDefault();
							openMenu();
						}
					}}
					><span class="arc-money-input__code">{code}</span><span
						class="arc-money-input__chevron"
						aria-hidden="true"
						style:transform={`rotate(${menuOpen ? 180 : 0}deg)`}
						style:transition={reduced
							? 'none'
							: `transform ${m.spring.snappy.duration}ms ${cssEasing(m.spring.snappy.easing)}`}
						><ChevronDown size={16} strokeWidth={1.75} /></span
					></button
				>
				{#if menuOpen}<div
						class="arc-money-input__menu"
						in:swap={reduced
							? { duration: m.duration.instant }
							: {
									scale: 0.96,
									y: -4,
									blur: m.blur.subtle,
									...m.spring.snappy,
									fade: { duration: m.duration.fast, easing: m.ease.enter }
								}}
						out:swap={reduced
							? { duration: m.duration.instant }
							: {
									scale: 0.97,
									y: -2,
									blur: m.blur.subtle,
									duration: m.duration.instant,
									easing: m.ease.standard
								}}
					>
						<div
							bind:this={listRef}
							id={`${uid}-currencies`}
							class="arc-money-input__list"
							role="listbox"
							tabindex={-1}
							aria-label="Currency"
							aria-activedescendant={`${uid}-cur-${activeCode}`}
							onkeydown={onMenuKeyDown}
						>
							<span
								class="arc-money-input__highlight"
								style:transform={`translateY(${hy.current}px)`}
								style:height={`${hh.current}px`}
								style:opacity={ho}
								aria-hidden="true"
							></span>
							{#each options as option (option.code)}
								<!-- Focus stays on the source listbox/combobox via aria-activedescendant. -->
								<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
								<div
									id={`${uid}-cur-${option.code}`}
									role="option"
									aria-selected={option.code === code}
									class="arc-money-input__option"
									data-active={option.code === activeCode || undefined}
									onpointermove={(event) => {
										if (event.pointerType === 'mouse' && option.code !== activeCode)
											activeCode = option.code;
									}}
									onpointerdown={(event) => event.preventDefault()}
									onclick={() => chooseCurrency(option)}
								>
									<span class="arc-money-input__optionSymbol" aria-hidden="true"
										>{option.symbol}</span
									><span class="arc-money-input__optionCode">{option.code}</span><span
										class="arc-money-input__optionName">{option.name}</span
									><span
										class="arc-money-input__check"
										data-on={option.code === code || undefined}
										aria-hidden="true"><Check size={16} strokeWidth={1.75} /></span
									>
								</div>
							{/each}
						</div>
					</div>{/if}
			</div>{:else}<span class="arc-money-input__codeStatic">{code}</span>{/if}
	</div>
	{#if chips.length > 0 || range}<div class="arc-money-input__toolbar">
			{#if chips.length > 0}<div class="arc-money-input__chips" role="group" aria-label="Quick add">
					{#each chips as amount (amount)}<button
							type="button"
							class="arc-money-input__chip"
							{disabled}
							aria-disabled={(max !== undefined && (minor ?? 0) >= max) || undefined}
							aria-controls={inputId}
							aria-label={`Add ${info.whole.format(amount)}`}
							onclick={() => nudge(amount * pow10(info.digits), 'chip')}
							>+{info.whole.format(amount)}</button
						>{/each}
				</div>{/if}{#if range}<span
					id={rangeId}
					class="arc-money-input__range"
					data-flash={limitFlash > 0 || undefined}>{range}</span
				>{/if}
		</div>{/if}
	<Message
		id={message ? errorId : hintId}
		text={message ?? description}
		class={message ? 'arc-money-input__error' : 'arc-money-input__hint'}
		tone={message ? 'error' : 'hint'}
	/>
	{#if name}<input type="hidden" {name} value={minor ?? ''} />{/if}<span
		class="arc-money-input__srOnly"
		role="status"
		aria-live="polite">{announcement}</span
	>
</div>
