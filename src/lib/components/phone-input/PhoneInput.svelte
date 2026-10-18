<script lang="ts">
	import { untrack, tick } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import {
		motionTokens as m,
		Mounted,
		swap,
		springPhysics,
		TargetSpring,
		cssEasing
	} from '#lib/motion';
	import {
		PHONE_COUNTRIES,
		BY_ISO,
		capDigits,
		onlyDigits,
		splitTrunk,
		lengthsOf,
		formatNational,
		statusOf,
		toE164,
		parsePhoneNumber,
		flagOf,
		matchesQuery,
		caretAfterDigits,
		type PhoneCountry
	} from './phone';
	import type { PhoneInputProps } from './types';
	import Message from '#lib/motion/MessageRow.svelte';
	import './phone-input.css';
	let {
		label,
		hideLabel = false,
		value = $bindable(undefined),
		defaultValue,
		onValueChange,
		country: countryProp = $bindable(undefined),
		defaultCountry = 'US',
		onCountryChange,
		countries,
		preferredCountries = ['US', 'CA', 'GB'],
		description,
		error,
		validate = true,
		disabled = false,
		required,
		name,
		id,
		class: className,
		onblur,
		ref = $bindable(null)
	}: PhoneInputProps = $props();
	const mounted = new Mounted(),
		reduced = $derived(mounted.current && !!prefersReducedMotion.current);
	const uid = $props.id(),
		inputId = $derived(id ?? `${uid}-number`),
		listId = `${uid}-list`,
		hintId = $derived(`${inputId}-hint`),
		errorId = $derived(`${inputId}-error`);
	const optionId = (key: string) => `${uid}-opt-${key}`;
	const pool = $derived(
		countries?.length
			? PHONE_COUNTRIES.filter((entry) => countries.includes(entry.iso))
			: PHONE_COUNTRIES
	);
	const fallback = $derived(BY_ISO.get(defaultCountry) ?? PHONE_COUNTRIES[0]!);
	let phoneState = $state(
		untrack(() => {
			const parsed = parsePhoneNumber(value ?? defaultValue ?? '', pool);
			return parsed
				? { iso: parsed.country.iso, digits: parsed.national }
				: { iso: fallback.iso, digits: '' };
		})
	);
	const iso = $derived(countryProp ?? phoneState.iso),
		current = $derived(BY_ISO.get(iso) ?? fallback),
		digits = $derived(phoneState.digits),
		e164 = $derived(toE164(current, digits));
	let seenValue = untrack(() => value);
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== seenValue) {
				seenValue = next;
				if (next !== undefined && next !== e164) {
					const parsed = parsePhoneNumber(next, pool);
					phoneState = parsed
						? { iso: parsed.country.iso, digits: parsed.national }
						: { iso, digits: '' };
				}
			}
		});
	});
	const formatted = $derived(formatNational(current, digits)),
		status = $derived(statusOf(current, digits));
	let touched = $state(false);
	const lengths = $derived(lengthsOf(current)),
		lengthCopy = $derived(
			lengths.length === 1
				? `${lengths[0]}`
				: `${lengths.slice(0, -1).join(', ')} or ${lengths[lengths.length - 1]}`
		);
	const builtIn = $derived(
			validate && touched && (status === 'incomplete' || status === 'too-long')
				? `Numbers in ${current.name} have ${lengthCopy} digits`
				: undefined
		),
		message = $derived(error ?? builtIn);
	const guide = $derived.by(() => {
		const [trunk, rest] = splitTrunk(current, digits);
		if (rest.length >= current.example.length) return '';
		const full = formatNational(current, trunk + rest + current.example.slice(rest.length));
		return full.startsWith(formatted) ? full.slice(formatted.length) : '';
	});
	const inputRef = $derived(ref);
	let pendingCaret: number | null = null,
		caretVersion = $state(0),
		announcement = $state('');
	function emit(entry: PhoneCountry, nextDigits: string) {
		const nextStatus = statusOf(entry, nextDigits),
			next = toE164(entry, nextDigits);
		onValueChange?.(next, {
			country: entry,
			formatted: formatNational(entry, nextDigits),
			status: nextStatus,
			valid: nextStatus === 'valid'
		});
		if (value !== undefined) {
			if (!onValueChange) value = next;
			else if (value !== next) {
				const parsed = parsePhoneNumber(value, pool);
				phoneState = parsed
					? { iso: parsed.country.iso, digits: parsed.national }
					: { iso, digits: '' };
			}
		}
	}
	const setNumber = (nextDigits: string, caretDigits: number | null, entry = current) => {
		caretVersion++;
		const capped = capDigits(entry, nextDigits);
		pendingCaret = caretDigits === null ? null : Math.min(caretDigits, capped.length);
		if (entry.iso !== current.iso) {
			onCountryChange?.(entry.iso);
			if (countryProp !== undefined && !onCountryChange) countryProp = entry.iso;
		}
		if (capped === digits && entry.iso === current.iso) {
			caretVersion++;
			return;
		}
		phoneState = { iso: entry.iso, digits: capped };
		emit(entry, capped);
	};
	$effect(() => {
		void formatted;
		void caretVersion;
		untrack(() => {
			const input = inputRef,
				count = pendingCaret;
			pendingCaret = null;
			if (!input) return;
			input.value = formatted;
			if (count !== null && document.activeElement === input) {
				const position = caretAfterDigits(input.value, count);
				input.setSelectionRange(position, position);
			}
		});
	});
	function onNumberChange(input: HTMLInputElement) {
		const raw = input.value;
		// Autofill and dropped text arrive as a change: an international number chooses its own country.
		if (raw.includes('+') || (/^\s*00/.test(raw) && onlyDigits(raw).length > 6)) {
			const parsed = parsePhoneNumber(raw.slice(Math.max(0, raw.indexOf('+'))), pool);
			if (parsed && parsed.national) {
				if (parsed.country.iso !== current.iso)
					announcement = `Country set to ${parsed.country.name}`;
				setNumber(parsed.national, parsed.national.length, parsed.country);
				return;
			}
		}
		const caret = input.selectionStart ?? raw.length;
		setNumber(onlyDigits(raw), onlyDigits(raw.slice(0, caret)).length);
	}

	function onNumberKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		if (event.key === '+' && !event.metaKey && !event.ctrlKey) {
			event.preventDefault();
			openList('+');
			return;
		}
		const start = input.selectionStart ?? 0,
			end = input.selectionEnd ?? 0;
		if (start !== end || event.metaKey || event.ctrlKey || event.altKey) return;
		// Deleting a separator deletes the digit beside it instead of doing nothing.
		if (event.key === 'Backspace' && start > 0 && !/\d/.test(input.value[start - 1]!)) {
			event.preventDefault();
			const index = onlyDigits(input.value.slice(0, start)).length;
			if (index > 0) setNumber(digits.slice(0, index - 1) + digits.slice(index), index - 1);
		}
		if (event.key === 'Delete' && start < input.value.length && !/\d/.test(input.value[start]!)) {
			event.preventDefault();
			const index = onlyDigits(input.value.slice(0, start)).length;
			setNumber(digits.slice(0, index) + digits.slice(index + 1), index);
		}
	}

	function onPaste(event: ClipboardEvent & { currentTarget: HTMLInputElement }) {
		const text = event.clipboardData?.getData('text') ?? '';
		if (!text) return;
		event.preventDefault();
		const input = event.currentTarget;
		const parsed = /^\s*(\+|00)/.test(text) ? parsePhoneNumber(text, pool) : null;
		if (parsed) {
			if (parsed.country.iso !== current.iso)
				announcement = `Country set to ${parsed.country.name}`;
			setNumber(parsed.national, parsed.national.length, parsed.country);
			return;
		}
		let pasted = onlyDigits(text);
		// "1 415 555 0132" pasted into a US field: the leading calling code is dropped when the number would not fit otherwise.
		if (pasted.startsWith(current.dial) && pasted.length > capDigits(current, pasted).length)
			pasted = pasted.slice(current.dial.length);
		// A whole number replaces what was there; a fragment goes in at the caret.
		if (pasted.length >= Math.min(...lengthsOf(current))) {
			setNumber(pasted, pasted.length);
			return;
		}
		const a = onlyDigits(input.value.slice(0, input.selectionStart ?? 0)).length;
		const b = onlyDigits(input.value.slice(0, input.selectionEnd ?? 0)).length;
		setNumber(digits.slice(0, a) + pasted + digits.slice(b), a + pasted.length);
	}

	const PANEL_MAX = 340,
		CLOSED_RADIUS = 17,
		OPEN_RADIUS = 22,
		PAGE = 8;
	type Row = { key: string; entry: PhoneCountry };
	type Section = { key: string; label?: string; rows: Row[] };
	let open = $state(false),
		query = $state(''),
		active = $state<string | null>(null),
		roll = $state(1);
	const needle = $derived(query.trim().toLowerCase());
	const sections = $derived.by((): Section[] => {
		const sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name));
		if (needle && needle !== '+') {
			const hits = sorted.filter((entry) => matchesQuery(entry, needle));
			const digitsOnly = onlyDigits(needle);
			if (digitsOnly)
				hits.sort(
					(a, b) =>
						Number(b.dial === digitsOnly) - Number(a.dial === digitsOnly) ||
						a.dial.length - b.dial.length
				);
			return [{ key: 'results', rows: hits.map((entry) => ({ key: `r-${entry.iso}`, entry })) }];
		}
		const preferred = preferredCountries
			.map((code) => pool.find((entry) => entry.iso === code))
			.filter((entry): entry is PhoneCountry => !!entry);
		const all = {
			key: 'all',
			label: preferred.length ? 'All countries' : undefined,
			rows: sorted.map((entry) => ({ key: `a-${entry.iso}`, entry }))
		};
		return preferred.length
			? [
					{
						key: 'preferred',
						label: 'Suggested',
						rows: preferred.map((entry) => ({ key: `p-${entry.iso}`, entry }))
					},
					all
				]
			: [all];
	});
	const rows = $derived(sections.flatMap((section) => section.rows));
	const activeKey = $derived(
		active !== null && rows.some((row) => row.key === active) ? active : (rows[0]?.key ?? null)
	);
	const orderOf = $derived(
		new Map(
			[...pool]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((entry, index) => [entry.iso, index])
		)
	);

	let rootRef = $state<HTMLDivElement>(),
		controlRef = $state<HTMLDivElement>(),
		measureRef = $state<HTMLSpanElement>(),
		listFaceRef = $state<HTMLDivElement>(),
		scrollRef = $state<HTMLDivElement>(),
		triggerRef = $state<HTMLButtonElement>(),
		searchRef = $state<HTMLInputElement>(),
		searchRow = $state<HTMLDivElement>();
	const grow = springPhysics({ visualDuration: 0.4, bounce: 0.12 }),
		shrink = springPhysics({ visualDuration: 0.32, bounce: 0 }),
		glide = springPhysics({ visualDuration: 0.28, bounce: 0.08 });
	const anchorW = new TargetSpring(0, m.specs.morph),
		shapeW = new TargetSpring(0, grow),
		shapeH = new TargetSpring(0, grow),
		radius = new TargetSpring(CLOSED_RADIUS, grow),
		rotation = new TargetSpring(0, glide);
	let measured = $state(false);
	let observedFrame = 0;
	let previousSize = { trigger: 0, lid: 0, panel: 0, list: 0 };
	function place(animated: boolean, fromObserver = false) {
		if (!measureRef || !controlRef || !listFaceRef || !rootRef) return;
		const trigger = measureRef.offsetWidth,
			lid = controlRef.clientHeight,
			panel = Math.min(PANEL_MAX, controlRef.offsetWidth);
		rootRef.style.setProperty('--pi-panel-w', `${panel}px`);
		const list = listFaceRef.offsetHeight,
			instant = !animated || reduced || !measured;
		const previous = previousSize;
		previousSize = { trigger, lid, panel, list };
		if (
			fromObserver &&
			trigger === previous.trigger &&
			lid === previous.lid &&
			panel === previous.panel &&
			(!open || list === previous.list)
		)
			return;
		if (observedFrame) cancelAnimationFrame(observedFrame);
		const apply = () => {
			observedFrame = 0;
			const spec = open ? grow : shrink;
			for (const spring of [shapeW, shapeH, radius]) {
				spring.spec = spec;
			}
			void anchorW.set(trigger, { instant });
			void shapeW.set(open ? Math.max(trigger, panel) : trigger, { instant });
			void shapeH.set(open ? lid + 2 + list : lid, { instant });
			void radius.set(open ? OPEN_RADIUS : CLOSED_RADIUS, { instant });
			measured = true;
		};
		// Observer-triggered instant values enter the source's next render frame.
		if (fromObserver && animated && reduced && measured)
			observedFrame = requestAnimationFrame(apply);
		else apply();
	}
	function observe() {
		untrack(() => place(false, true));
		const observer = new ResizeObserver(() => untrack(() => place(true, true)));
		if (measureRef) observer.observe(measureRef);
		if (controlRef) observer.observe(controlRef);
		if (listFaceRef) observer.observe(listFaceRef);
		return () => {
			observer.disconnect();
			if (observedFrame) cancelAnimationFrame(observedFrame);
		};
	}
	let pendingFocus: 'trigger' | 'search' | 'number' | null = null;
	let searchAnimation: Animation | undefined, listAnimation: Animation | undefined;
	$effect(() => {
		const mode = open;
		untrack(() => {
			place(true);
			void rotation.set(mode ? 180 : 0, { instant: reduced });
			searchAnimation?.cancel();
			listAnimation?.cancel();
			if (searchRow)
				searchAnimation = searchRow.animate(
					mode
						? [
								{ opacity: 0, filter: reduced ? 'none' : 'blur(2px)' },
								{ opacity: 1, filter: 'blur(0px)' }
							]
						: [
								{ opacity: 1, filter: 'blur(0px)' },
								{ opacity: 0, filter: reduced ? 'none' : 'blur(2px)' }
							],
					{
						duration: mode ? 180 : 100,
						delay: mode && !reduced ? 50 : 0,
						easing: cssEasing(mode ? m.ease.enter : m.ease.standard),
						fill: 'both'
					}
				);
			if (listFaceRef)
				listAnimation = listFaceRef.animate(
					mode
						? [
								{
									opacity: 0,
									transform: reduced ? 'none' : 'translateY(-6px)',
									filter: reduced ? 'none' : 'blur(2px)'
								},
								{ opacity: 1, transform: 'none', filter: 'blur(0px)' }
							]
						: [
								{ opacity: 1, transform: 'none', filter: 'blur(0px)' },
								{
									opacity: 0,
									transform: reduced ? 'none' : 'translateY(-6px)',
									filter: reduced ? 'none' : 'blur(2px)'
								}
							],
					{
						duration: mode ? 240 : 100,
						delay: mode && !reduced ? 40 : 0,
						easing: cssEasing(mode ? m.ease.enter : m.ease.standard),
						fill: 'both'
					}
				);
			const target = pendingFocus;
			pendingFocus = null;
			void tick().then(() => {
				if (target === 'search') searchRef?.focus({ preventScroll: true });
				if (target === 'trigger') triggerRef?.focus({ preventScroll: true });
				if (target === 'number') {
					inputRef?.focus({ preventScroll: true });
					inputRef?.setSelectionRange(inputRef.value.length, inputRef.value.length);
				}
			});
		});
		return () => {
			searchAnimation?.cancel();
			listAnimation?.cancel();
		};
	});
	const hy = new TargetSpring(0, glide),
		hh = new TargetSpring(0, glide),
		ho = new Tween(0);
	let scrollIntent = false;
	$effect(() => {
		const key = activeKey,
			mode = open;
		void sections;
		untrack(() => {
			const node = mode && key ? document.getElementById(optionId(key)) : null;
			if (!node) {
				void ho.set(0, { duration: reduced || !mode ? 0 : 120, easing: m.ease.standard });
				return;
			}
			const top = node.offsetTop,
				height = node.offsetHeight;
			void hy.set(top, { instant: ho.current < 0.05 || reduced });
			void hh.set(height, { instant: ho.current < 0.05 || reduced });
			void ho.set(1, { duration: reduced ? 0 : 120, easing: m.ease.enter });
			if (scrollRef && scrollIntent) {
				scrollIntent = false;
				if (top < scrollRef.scrollTop + 6) scrollRef.scrollTop = top - 6;
				else if (top + height > scrollRef.scrollTop + scrollRef.clientHeight - 6)
					scrollRef.scrollTop = top + height - scrollRef.clientHeight + 6;
			}
		});
	});
	function openList(seed = '') {
		if (disabled || open) return;
		query = seed;
		const selectedRow = seed
			? null
			: (sections
					.flatMap((section) => section.rows)
					.find((row) => row.entry.iso === current.iso && !row.key.startsWith('p-')) ?? null);
		active = selectedRow?.key ?? null;
		scrollIntent = true;
		pendingFocus = 'search';
		announcement = '';
		open = true;
	}
	const close = (focus: 'trigger' | 'number' | null) => {
		pendingFocus = focus;
		open = false;
	};

	function pick(entry: PhoneCountry | undefined) {
		if (!entry) return;
		if (entry.iso !== current.iso) {
			roll = Math.sign((orderOf.get(entry.iso) ?? 0) - (orderOf.get(current.iso) ?? 0)) || 1;
			const nextDigits = capDigits(entry, digits);
			if (countryProp === undefined) phoneState = { iso: entry.iso, digits: nextDigits };
			else phoneState = { ...phoneState, digits: nextDigits };
			if (countryProp !== undefined && !onCountryChange) countryProp = entry.iso;
			onCountryChange?.(entry.iso);
			emit(entry, nextDigits);
			announcement = `${entry.name}, +${entry.dial}`;
		}
		close('number');
	}

	function move(key: string | null | undefined) {
		if (!key) return;
		scrollIntent = true;
		active = key;
	}

	function onSearchKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		const at = rows.findIndex((row) => row.key === activeKey);
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				move(rows[Math.min(rows.length - 1, at + 1)]?.key);
				return;
			case 'ArrowUp':
				event.preventDefault();
				move(rows[Math.max(0, at - 1)]?.key);
				return;
			case 'PageDown':
				event.preventDefault();
				move(rows[Math.min(rows.length - 1, at + PAGE)]?.key);
				return;
			case 'PageUp':
				event.preventDefault();
				move(rows[Math.max(0, at - PAGE)]?.key);
				return;
			case 'Home':
				if (query) return;
				event.preventDefault();
				move(rows[0]?.key);
				return;
			case 'End':
				if (query) return;
				event.preventDefault();
				move(rows[rows.length - 1]?.key);
				return;
			case 'Enter':
				event.preventDefault();
				pick(rows[at]?.entry);
				return;
			case 'Escape':
				event.preventDefault();
				event.stopPropagation();
				close('trigger');
				return;
			case 'Tab':
				close(null);
				return;
		}
	}

	function onTriggerKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			openList();
			return;
		}
		if (
			event.key.length === 1 &&
			event.key !== ' ' &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.altKey
		) {
			event.preventDefault();
			openList(event.key);
		}
	}

	function onQuery(next: string) {
		query = next;
		active = null;
		if (scrollRef) scrollRef.scrollTop = 0;
		const text = next.trim().toLowerCase();
		const count =
			text && text !== '+' ? pool.filter((entry) => matchesQuery(entry, text)).length : pool.length;
		announcement = text
			? count
				? `${count} ${count === 1 ? 'country' : 'countries'}`
				: 'No matches'
			: '';
	}

	$effect(() => {
		if (!open) return;
		const down = (event: PointerEvent) => {
			if (!rootRef?.contains(event.target as Node)) close(null);
		};
		document.addEventListener('pointerdown', down);
		return () => document.removeEventListener('pointerdown', down);
	});

	const onRootBlur = (event: FocusEvent & { currentTarget: HTMLDivElement }) => {
		const next = event.relatedTarget as Node | null;
		if (open && next && !event.currentTarget.contains(next)) close(null);
	};

	const showCheck = $derived(status === 'valid'),
		invalid = $derived(!!message),
		describedBy = $derived(
			[description ? hintId : null, message ? errorId : null].filter(Boolean).join(' ') || undefined
		);
</script>

{#snippet face(entry: PhoneCountry)}<span class="arc-phone-input__flag" aria-hidden="true"
		>{flagOf(entry.iso)}</span
	><span class="arc-phone-input__dial">+{entry.dial}</span>{/snippet}
<div
	bind:this={rootRef}
	class={['arc-phone-input__field', className]}
	style="--pi-closed-r:17px"
	data-open={open || undefined}
	data-disabled={disabled || undefined}
	onfocusout={onRootBlur}
	{@attach observe}
>
	<label for={inputId} class={hideLabel ? 'arc-phone-input__srOnly' : 'arc-phone-input__label'}
		>{label}</label
	>
	<div bind:this={controlRef} class="arc-phone-input__control" data-invalid={invalid || undefined}>
		<div class="arc-phone-input__anchor" style:width={measured ? `${anchorW.current}px` : 'auto'}>
			<span
				bind:this={measureRef}
				class="arc-phone-input__trigger arc-phone-input__measure"
				aria-hidden="true">{@render face(current)}</span
			>
			<div
				class="arc-phone-input__shape"
				style:width={measured ? `${shapeW.current}px` : '100%'}
				style:height={measured ? `${shapeH.current}px` : '100%'}
				style:border-radius={`${radius.current}px`}
			>
				<div class="arc-phone-input__lid">
					<button
						bind:this={triggerRef}
						type="button"
						class="arc-phone-input__trigger"
						{disabled}
						inert={open}
						tabindex={open ? -1 : 0}
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-controls={listId}
						aria-label={`Country, ${current.name} +${current.dial}`}
						onclick={() => (open ? close('trigger') : openList())}
						onkeydown={onTriggerKeyDown}
					>
						<span class="arc-phone-input__slot" data-hidden={open || undefined}
							>{#key current.iso}<span
									class="arc-phone-input__layer"
									in:swap={reduced
										? { duration: 120, skip: !mounted.current }
										: {
												y: `${roll * 0.6}em`,
												blur: m.blur.soft,
												...m.spring.snappy,
												fade: { duration: 200, easing: m.ease.enter },
												skip: !mounted.current
											}}
									out:swap={reduced
										? { duration: 80 }
										: {
												y: `${roll * -0.5}em`,
												blur: m.blur.subtle,
												duration: 120,
												easing: m.ease.standard
											}}>{@render face(current)}</span
								>{/key}</span
						></button
					>
					<div
						bind:this={searchRow}
						class="arc-phone-input__searchRow"
						inert={!open}
						style:opacity={open ? 1 : 0}
					>
						<Search
							class="arc-phone-input__searchIcon"
							size={16}
							strokeWidth={1.75}
							aria-hidden="true"
						/>
						<input
							bind:this={searchRef}
							class="arc-phone-input__search"
							type="text"
							role="combobox"
							aria-label="Search countries or calling codes"
							aria-expanded={open}
							aria-controls={listId}
							aria-autocomplete="list"
							aria-activedescendant={open && activeKey ? optionId(activeKey) : undefined}
							placeholder="Country or code"
							value={query}
							autocomplete="off"
							spellcheck={false}
							oninput={(event) => onQuery(event.currentTarget.value)}
							onkeydown={onSearchKeyDown}
						/>
						{#if query}<button
								type="button"
								class="arc-phone-input__clear"
								aria-label="Clear search"
								onpointerdown={(event) => event.preventDefault()}
								onclick={() => {
									onQuery('');
									searchRef?.focus();
								}}
								in:swap={reduced ? { skip: true } : { scale: 0.6, ...m.spring.snappy }}
								out:swap={reduced ? { skip: true } : { scale: 0.6, duration: 100 }}
								><X size={14} strokeWidth={1.75} aria-hidden="true" /></button
							>{/if}<button
							type="button"
							class="arc-phone-input__closeHit"
							aria-label="Close country list"
							onclick={() => close('trigger')}
						></button>
					</div>
					<span
						class="arc-phone-input__chevron"
						aria-hidden="true"
						style:transform={`rotate(${rotation.current}deg)`}
						><ChevronDown size={16} strokeWidth={1.75} /></span
					>
				</div>
				<div
					bind:this={listFaceRef}
					class="arc-phone-input__listFace"
					inert={!open}
					aria-hidden={!open || undefined}
					style:opacity={open ? 1 : 0}
				>
					<div bind:this={scrollRef} class="arc-phone-input__scroll">
						<div id={listId} class="arc-phone-input__options" role="listbox" aria-label="Countries">
							<span
								class="arc-phone-input__highlight"
								style:transform={`translateY(${hy.current}px)`}
								style:height={`${hh.current}px`}
								style:opacity={ho.current}
								aria-hidden="true"
							></span>
							{#each sections as section (section.key)}<div
									role={section.label ? 'group' : 'presentation'}
									aria-labelledby={section.label ? `${uid}-${section.key}` : undefined}
									class="arc-phone-input__group"
								>
									{#if section.label}<div
											id={`${uid}-${section.key}`}
											class="arc-phone-input__groupLabel"
											role="presentation"
										>
											{section.label}
										</div>{/if}
									{#each section.rows as row (row.key)}
										<!-- Focus stays on the source listbox/combobox via aria-activedescendant. -->
										<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
										<div
											id={optionId(row.key)}
											role="option"
											aria-selected={row.entry.iso === current.iso}
											class="arc-phone-input__option"
											data-active={row.key === activeKey || undefined}
											onpointermove={(event) => {
												if (event.pointerType === 'mouse' && row.key !== activeKey)
													active = row.key;
											}}
											onpointerdown={(event) => event.preventDefault()}
											onclick={() => pick(row.entry)}
										>
											<span class="arc-phone-input__flag" aria-hidden="true"
												>{flagOf(row.entry.iso)}</span
											><span class="arc-phone-input__name">{row.entry.name}</span><span
												class="arc-phone-input__meta">+{row.entry.dial}</span
											><span
												class="arc-phone-input__check"
												data-on={row.entry.iso === current.iso || undefined}
												aria-hidden="true"><Check size={16} strokeWidth={1.75} /></span
											>
										</div>
									{/each}
								</div>{/each}
							{#if rows.length === 0}<p class="arc-phone-input__empty">
									No countries match “{query.trim()}”
								</p>{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="arc-phone-input__numberWrap">
			<span class="arc-phone-input__guide" aria-hidden="true"
				><span class="arc-phone-input__guideTyped">{formatted}</span>{guide}</span
			>
			<input
				bind:this={ref}
				id={inputId}
				class="arc-phone-input__number"
				type="tel"
				inputmode="tel"
				autocomplete="tel"
				value={formatted}
				{disabled}
				{required}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				aria-label={hideLabel ? label : undefined}
				oninput={(event) => onNumberChange(event.currentTarget)}
				onkeydown={onNumberKeyDown}
				onpaste={onPaste}
				onblur={(event) => {
					touched = digits.length > 0;
					onblur?.(event);
				}}
			/>
			{#if showCheck}<span
					class="arc-phone-input__valid"
					aria-hidden="true"
					in:swap={reduced
						? { duration: 120, skip: !mounted.current }
						: { scale: 0.6, blur: m.blur.subtle, ...m.spring.snappy, skip: !mounted.current }}
					out:swap={{ scale: reduced ? 1 : 0.8, duration: 100 }}
					><Check size={16} strokeWidth={2} /></span
				>{/if}
		</div>
	</div>
	<Message
		id={message ? errorId : hintId}
		text={message ?? description}
		class={message ? 'arc-phone-input__error' : 'arc-phone-input__hint'}
		tone={message ? 'error' : 'hint'}
	/>
	{#if name}<input type="hidden" {name} value={e164} />{/if}<span
		class="arc-phone-input__srOnly"
		role="status"
		aria-live="polite">{announcement || (showCheck ? `Valid ${current.name} number` : '')}</span
	>
</div>
