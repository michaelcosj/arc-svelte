<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { DropdownMenu as Menu } from 'bits-ui';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Monitor from '@lucide/svelte/icons/monitor';
	import SunMoon from '@lucide/svelte/icons/sun-moon';
	import {
		motionTokens as m,
		swap,
		layer,
		springCurve,
		cubicBezier,
		TargetSpring,
		PointerVelocity,
		Mounted
	} from '#lib/motion';
	import type { UserMenuProps, UserStatus, ThemePreference } from './types';
	import { userStatuses } from './types';
	import Face from './Face.svelte';
	import PresenceDot from './PresenceDot.svelte';
	import './user-menu.css';
	let {
		user,
		status = $bindable(),
		defaultStatus = 'available',
		onStatusChange,
		theme = $bindable(),
		defaultTheme = 'system',
		onThemeChange,
		showTheme = true,
		items = [],
		onSignOut,
		signOutKeys,
		align = 'end',
		showName = false,
		open = $bindable(),
		defaultOpen = false,
		onOpenChange,
		portal = true,
		ref = $bindable(null),
		class: className
	}: UserMenuProps = $props();
	let innerOpen = $state(untrack(() => defaultOpen)),
		innerStatus = $state(untrack(() => defaultStatus)),
		innerTheme = $state(untrack(() => defaultTheme));
	const isOpen = $derived(open ?? innerOpen),
		selectedStatus = $derived(status ?? innerStatus),
		selectedTheme = $derived(theme ?? innerTheme);
	const showStatus = $derived(status !== undefined || onStatusChange !== undefined);
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const uid = $props.id(),
		triggerId = `arc-user-menu-${uid}-trigger`;
	const initialized = new Mounted();
	const compactQuery = new MediaQuery('(max-width: 639px)', false);
	const compact = $derived(initialized.current && compactQuery.current);
	let surface = $state<HTMLDivElement>(),
		root = $state<HTMLSpanElement>();
	const sheet = $derived(compact);
	let signingOut = $state(false),
		pending = false,
		mounted = true;
	let why: 'first' | 'last' | 'pointer' | null = null;
	const highlightY = new TargetSpring(0, m.specs.snappy),
		highlightHeight = new TargetSpring(0, m.specs.snappy);
	let highlightShown = false;
	let highlightTone = $state<string | undefined>();
	const highlight = {
		move(node: HTMLElement | null) {
			if (!node) {
				highlightShown = false;
				return;
			}
			const instant = !highlightShown || reduced;
			void highlightY.set(node.offsetTop, { instant });
			void highlightHeight.set(node.offsetHeight, { instant });
			highlightTone = node.dataset.tone;
			highlightShown = true;
		},
		get style() {
			return `transform:translateY(${highlightY.current}px);height:${highlightHeight.current}px;`;
		}
	};
	const alpha = new Tween(0),
		drag = new TargetSpring(0, { stiffness: 200, damping: 40 }, { delta: 1, speed: 10 });
	let pointer:
		| {
				id: number;
				start: number;
				origin: number;
				last: number;
				active: boolean;
				velocity: PointerVelocity;
		  }
		| undefined;
	let typed = '',
		typeTimer: ReturnType<typeof setTimeout>;
	onDestroy(() => {
		mounted = false;
		clearTimeout(typeTimer);
	});
	function setOpen(next: boolean) {
		innerOpen = next;
		if (!onOpenChange) open = next;
		onOpenChange?.(next);
		highlight.move(null);
		void alpha.set(0, { duration: 0 });
		if (next) signingOut = pending;
	}
	function close(focus = true) {
		setOpen(false);
		if (focus) ref?.focus({ preventScroll: true });
	}
	function changeStatus(value: UserStatus) {
		innerStatus = value;
		if (!onStatusChange) status = value;
		onStatusChange?.(value);
	}
	function changeTheme(value: ThemePreference) {
		innerTheme = value;
		if (!onThemeChange) theme = value;
		onThemeChange?.(value);
	}
	function signOut() {
		if (pending) return;
		const result = onSignOut?.();
		if (!result || typeof result.then !== 'function') {
			close();
			return;
		}
		pending = true;
		signingOut = true;
		const done = () => {
			pending = false;
			if (mounted) close(false);
		};
		result.then(done, done);
	}
	const stops = () => Array.from(surface?.querySelectorAll<HTMLElement>('[data-stop]') ?? []);
	function focusStop(stop: HTMLElement | undefined) {
		(stop?.dataset.stop === 'group'
			? (stop.querySelector<HTMLElement>('[aria-checked="true"]') ??
				stop.querySelector<HTMLElement>('button'))
			: stop
		)?.focus({ preventScroll: true });
	}
	function keydown(event: KeyboardEvent) {
		const all = stops(),
			active = document.activeElement instanceof HTMLElement ? document.activeElement : null,
			current = active?.closest<HTMLElement>('[data-stop]'),
			index = current ? all.indexOf(current) : -1;
		const step = (n: HTMLElement | undefined) => {
			event.preventDefault();
			event.stopPropagation();
			focusStop(n);
		};
		if (event.key === 'Tab') {
			event.preventDefault();
			event.stopPropagation();
			close();
			return;
		}
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			if (current?.dataset.stop !== 'group') return;
			event.preventDefault();
			event.stopPropagation();
			const buttons = Array.from(current.querySelectorAll<HTMLButtonElement>('button'));
			const at = Math.max(
				0,
				buttons.findIndex((b) => b.getAttribute('aria-checked') === 'true')
			);
			const next =
				buttons[(at + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
			next?.focus();
			next?.click();
			return;
		}
		// A segmented row is a single vertical stop, unlike individual menu radios.
		if (event.key === 'ArrowDown') return step(all[(index + 1) % all.length]);
		if (event.key === 'ArrowUp') return step(all[index <= 0 ? all.length - 1 : index - 1]);
		if (event.key === 'Home') return step(all[0]);
		if (event.key === 'End') return step(all.at(-1));
		if (
			event.key.length !== 1 ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey ||
			event.key === ' '
		)
			return;
		clearTimeout(typeTimer);
		typed += event.key.toLowerCase();
		typeTimer = setTimeout(() => (typed = ''), 500);
		const ordered = [...all.slice(index + 1), ...all.slice(0, index + 1)];
		const search =
			typed.length > 1 && current?.dataset.label?.toLowerCase().startsWith(typed)
				? [current]
				: ordered;
		const match = search.find((n) => n.dataset.label?.toLowerCase().startsWith(typed));
		if (match) step(match);
	}
	function focusin(event: FocusEvent) {
		const stop =
			event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-stop]') : null;
		highlight.move(stop);
		void alpha.set(stop ? 1 : 0, { duration: reduced ? 0 : m.duration.instant });
	}
	function leave(event: PointerEvent) {
		if (event.pointerType === 'touch') return;
		highlight.move(null);
		void alpha.set(0, { duration: reduced ? 0 : m.duration.instant });
		surface?.focus({ preventScroll: true });
	}
	function pointermove(event: PointerEvent) {
		if (pointer?.active) return;
		if (event.pointerType === 'touch') return;
		const target =
			event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-stop]') : null;
		if (target?.dataset.stop === 'group') {
			if (!target.contains(document.activeElement)) leave(event);
		} else target?.focus({ preventScroll: true });
	}
	function pointerdown(event: PointerEvent) {
		if (!sheet || reduced || event.button !== 0) return;
		pointer = {
			id: event.pointerId,
			start: event.clientY,
			origin: drag.stop(),
			last: event.clientY,
			active: false,
			velocity: new PointerVelocity(event.clientY, event.timeStamp)
		};
	}
	function dragmove(event: PointerEvent) {
		if (!pointer || pointer.id !== event.pointerId) return;
		const delta = event.clientY - pointer.start;
		if (!pointer.active && Math.abs(delta) < 3) return;
		if (!pointer.active) {
			pointer.active = true;
			surface?.setPointerCapture(event.pointerId);
		}
		pointer.last = event.clientY;
		pointer.velocity.push(event.clientY, event.timeStamp);
		const raw = pointer.origin + delta;
		void drag.set(raw * (raw < 0 ? 0.04 : 0.9), { instant: true });
	}
	function release(event: PointerEvent) {
		if (!pointer || pointer.id !== event.pointerId) return;
		const offset = pointer.last - pointer.start,
			velocity = pointer.velocity.at(pointer.last, event.timeStamp);
		pointer = undefined;
		if (offset > 80 || velocity > 500) close();
		void drag.set(0);
	}
	function place(node: HTMLDivElement) {
		surface = node;
		const update = () => {
			if (sheet || !ref) return;
			const r = ref.getBoundingClientRect(),
				w = node.offsetWidth,
				h = node.offsetHeight;
			let left: number, top: number;
			if (!portal) {
				const r = root?.getBoundingClientRect();
				left = (r?.left ?? 0) + node.offsetLeft;
				top = (r?.top ?? 0) + node.offsetTop;
			} else {
				const wanted =
					align === 'start'
						? r.left
						: align === 'center'
							? r.left + r.width / 2 - w / 2
							: r.right - w;
				left = Math.min(Math.max(12, wanted), window.innerWidth - w - 12);
				const below = r.bottom + 8;
				top = below + h > window.innerHeight - 12 && r.top - 8 - h > 12 ? r.top - 8 - h : below;
				node.style.left = `${left}px`;
				node.style.top = `${top}px`;
			}
			const center =
				align === 'end' && r.width > 40
					? r.right - 20 - left
					: r.left + Math.min(r.width, 40) / 2 - left;
			node.style.setProperty('--origin-x', `${Math.min(Math.max(0, center), w)}px`);
			node.style.setProperty('--origin-y', top < r.top ? `${h}px` : '0px');
		};
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
			if (surface === node) surface = undefined;
		};
	}
	$effect(() => {
		if (!isOpen || !surface) return;
		untrack(() => {
			const reason = why;
			why = null;
			if (reason)
				requestAnimationFrame(() => {
					if (reason === 'first') focusStop(stops()[0]);
					else if (reason === 'last') focusStop(stops().at(-1));
					else surface?.focus({ preventScroll: true });
				});
		});
	});
	$effect(() => {
		if (!isOpen || !sheet) return;
		const previous = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		return () => {
			document.documentElement.style.overflow = previous;
		};
	});
	const themes = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor }
	] as const;
	const exitEase = cubicBezier(0.4, 0, 1, 1);
	const panelIn = $derived(
		reduced
			? { duration: 120 }
			: {
					scale: 0.94,
					...springCurve({ visualDuration: 0.3, bounce: 0 }),
					fade: { duration: m.duration.fast, easing: m.ease.enter }
				}
	);
	const panelOut = $derived(
		reduced ? { duration: 120 } : { scale: 0.97, duration: 120, easing: exitEase }
	);
	function row(node: HTMLElement) {
		const all = surface?.querySelectorAll('.arc-user-menu__header,[data-stop]');
		const i = all ? Array.from(all).indexOf(node) : 0;
		return swap(
			node,
			{
				y: 3,
				duration: reduced ? 0 : 200,
				delay: reduced ? 0 : (sheet ? 60 : 30) + Math.max(0, i) * (sheet ? 20 : 16),
				easing: m.ease.enter
			},
			{ direction: 'in' }
		);
	}
</script>

<svelte:window onpointermove={dragmove} onpointerup={release} onpointercancel={release} />
{#snippet keys(values: string[])}<kbd class="arc-user-menu__keys" aria-hidden="true"
		>{#each values as key, i (i)}<kbd class="arc-user-menu__key">{key}</kbd>{/each}</kbd
	>{/snippet}
{#snippet segments(label: string)}
	<div class="arc-user-menu__row" data-stop="group" data-label={label} in:row>
		<span class="arc-user-menu__icon" aria-hidden="true"
			>{#if label === 'Status'}<PresenceDot status={selectedStatus} />{:else}<SunMoon
					size={16}
					strokeWidth={1.75}
				/>{/if}</span
		><span class="arc-user-menu__rowLabel" aria-hidden="true">{label}</span>
		<div
			class="arc-user-menu__segments"
			role="group"
			aria-label={label}
			style={`--index:${
				label === 'Status'
					? Math.max(
							0,
							userStatuses.findIndex((o) => o.value === selectedStatus)
						)
					: Math.max(
							0,
							themes.findIndex((o) => o.value === selectedTheme)
						)
			};--count:3`}
		>
			<span class="arc-user-menu__thumb" aria-hidden="true"></span>
			{#if label === 'Status'}{#each userStatuses as option (option.value)}<button
						type="button"
						role="menuitemradio"
						tabindex="-1"
						aria-checked={option.value === selectedStatus}
						aria-label={option.label}
						title={option.label}
						class="arc-user-menu__segment"
						onclick={() => changeStatus(option.value)}><PresenceDot status={option.value} /></button
					>{/each}
			{:else}{#each themes as option (option.value)}<button
						type="button"
						role="menuitemradio"
						tabindex="-1"
						aria-checked={option.value === selectedTheme}
						aria-label={option.label}
						title={option.label}
						class="arc-user-menu__segment"
						onclick={() => changeTheme(option.value)}
						><option.icon size={14} strokeWidth={1.75} aria-hidden="true" /></button
					>{/each}{/if}
		</div>
	</div>
{/snippet}
{#snippet content()}
	<div class="arc-user-menu__header" in:row>
		<Face {user} status={showStatus ? selectedStatus : undefined} size="md" />
		<div class="arc-user-menu__identity">
			<div class="arc-user-menu__nameRow">
				<span class="arc-user-menu__name">{user.name}</span>{#if user.plan}<span
						class="arc-user-menu__plan">{user.plan}</span
					>{/if}
			</div>
			<span class="arc-user-menu__email" title={user.email}>{user.email}</span>
		</div>
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions (pointer motion decorates menu descendants) -->
	<div
		class="arc-user-menu__list"
		onfocusin={focusin}
		onpointermove={pointermove}
		onpointerleave={leave}
	>
		<span
			class="arc-user-menu__highlight"
			data-tone={highlightTone}
			aria-hidden="true"
			style={`${highlight.style}opacity:${alpha.current}`}
		></span>
		{#if items.length}<Menu.Separator
				class="arc-user-menu__separator"
			/>{#each items as item (item.label)}
				<Menu.Item
					closeOnSelect={false}
					onSelect={() => {
						close();
						item.onSelect?.();
					}}
					>{#snippet child({ props })}<button
							{...props}
							type="button"
							class="arc-user-menu__item"
							data-stop="item"
							data-label={item.label}
							in:row
							><span class="arc-user-menu__icon" aria-hidden="true">{@render item.icon?.()}</span
							><span class="arc-user-menu__itemLabel">{item.label}</span
							>{#if item.keys}{@render keys(item.keys)}{/if}</button
						>{/snippet}</Menu.Item
				>
			{/each}{/if}
		{#if showTheme || showStatus}<Menu.Separator
				class="arc-user-menu__separator"
			/>{#if showStatus}{@render segments('Status')}{/if}{#if showTheme}{@render segments(
					'Theme'
				)}{/if}{/if}
		<Menu.Separator class="arc-user-menu__separator" />
		<Menu.Item closeOnSelect={false} onSelect={signOut}
			>{#snippet child({ props })}<button
					{...props}
					type="button"
					class="arc-user-menu__item"
					data-stop="item"
					data-tone="danger"
					data-label="Sign out"
					aria-busy={signingOut || undefined}
					in:row
					><span class="arc-user-menu__icon" aria-hidden="true"
						>{#if signingOut}<LoaderCircle
								class="arc-user-menu__spinner"
								size={16}
								strokeWidth={1.75}
							/>{:else}<LogOut size={16} strokeWidth={1.75} />{/if}</span
					><span class="arc-user-menu__itemLabel"
						>{#key signingOut}<span
								class="arc-user-menu__rise"
								in:swap={{
									y: reduced ? 0 : '0.35em',
									blur: reduced ? 0 : 2,
									duration: reduced ? 0 : 240,
									easing: m.ease.enter,
									skip: !initialized.current
								}}
								out:swap={{
									y: reduced ? 0 : '-0.35em',
									blur: reduced ? 0 : 2,
									duration: reduced ? 0 : 160,
									easing: m.ease.standard,
									pop: true
								}}>{signingOut ? 'Signing out' : 'Sign out'}</span
							>{/key}</span
					>{#if signOutKeys}{@render keys(signOutKeys)}{/if}</button
				>{/snippet}</Menu.Item
		>
	</div>
{/snippet}
<Menu.Root open={isOpen} onOpenChange={setOpen}>
	<span bind:this={root} class="arc-user-menu__root">
		<Menu.Trigger
			bind:ref
			id={triggerId}
			class={['arc-user-menu__trigger', className]}
			data-name={showName || undefined}
			aria-label={`Account menu, ${user.name}${showStatus ? `, ${userStatuses.find((o) => o.value === selectedStatus)?.label ?? selectedStatus}` : ''}`}
			onpointerdown={() => (why = 'pointer')}
			onkeydowncapture={(e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					e.stopPropagation();
					why = e.key === 'ArrowDown' ? 'first' : 'last';
					setOpen(true);
				} else if (e.key === 'Enter' || e.key === ' ') why = 'first';
			}}
		>
			<Face {user} status={showStatus ? selectedStatus : undefined} size="sm" />{#if showName}<span
					class="arc-user-menu__triggerName">{user.name}</span
				><ChevronDown
					class="arc-user-menu__chevron"
					size={16}
					strokeWidth={1.75}
					aria-hidden="true"
				/>{/if}
		</Menu.Trigger>
		<Menu.Portal disabled={!portal && !sheet}>
			{#if isOpen && sheet}<div
					class="arc-user-menu__scrim"
					aria-hidden="true"
					onclick={() => close()}
					in:swap={{ duration: reduced ? 100 : 200, easing: m.ease.standard }}
					out:swap={{ duration: reduced ? 100 : 200, easing: m.ease.standard }}
				></div>{/if}
			<Menu.Content
				forceMount
				preventScroll={false}
				trapFocus={false}
				loop
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				onkeydowncapture={keydown}
				aria-labelledby={triggerId}
				onEscapeKeydown={(e) => {
					e.preventDefault();
					close();
				}}
			>
				{#snippet child({ props, wrapperProps })}
					<!-- Placement follows the avatar, including the inline and sheet layouts. -->
					<div {...wrapperProps} style="display: contents">
						{#if isOpen}
							<div
								{...props}
								class={['arc-user-menu__panel', sheet && 'arc-user-menu__sheet']}
								data-inline={(!portal && !sheet) || undefined}
								data-align={align}
								aria-modal={sheet ? 'true' : undefined}
								style:translate={sheet ? `0 ${drag.current}px` : undefined}
								onpointerdown={pointerdown}
								onpointermove={pointermove}
								onpointerup={release}
								onpointercancel={release}
								in:layer={sheet && !reduced
									? { y: '100%', ...springCurve({ ...m.specs.smooth, visualDuration: 0.36 }) }
									: panelIn}
								out:layer={sheet && !reduced
									? { y: '100%', duration: 220, easing: exitEase }
									: panelOut}
								{@attach place}
							>
								{#if sheet}<span class="arc-user-menu__handle" aria-hidden="true"
									></span>{/if}{@render content()}
							</div>
						{/if}
					</div>
				{/snippet}
			</Menu.Content>
		</Menu.Portal>
	</span>
</Menu.Root>
