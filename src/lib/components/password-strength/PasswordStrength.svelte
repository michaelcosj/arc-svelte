<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, EyeMorph, swap, springPosition } from '#lib/motion';
	import {
		defaultPasswordStrengthMessages,
		defaultPasswordRules,
		estimateStrength,
		type PasswordStrengthProps
	} from './rules';
	import { strengthCopy } from './motion';
	import RuleMark from './RuleMark.svelte';
	import MeterFill from './MeterFill.svelte';
	import RollingCount from './RollingCount.svelte';
	import ErrorRow from './ErrorRow.svelte';
	import './password-strength.css';
	const generated = $props.id();
	let {
		label,
		value,
		defaultValue = '',
		onValueChange,
		onchange,
		oninput,
		rules = defaultPasswordRules,
		error,
		revealed,
		onRevealedChange,
		messages: messagesProp,
		shortLength,
		countCharacters,
		id = generated,
		class: className,
		ref = $bindable(null),
		...props
	}: PasswordStrengthProps = $props();
	const mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	const messages = $derived({
		...defaultPasswordStrengthMessages,
		...messagesProp,
		levels: { ...defaultPasswordStrengthMessages.levels, ...messagesProp?.levels }
	});
	const options = $derived({ shortLength, levels: messages.levels, countCharacters });
	let internal = $state(untrack(() => defaultValue)),
		revealedInternal = $state(false);
	const password = $derived(value ?? internal),
		shown = $derived(revealed ?? revealedInternal);
	const strength = $derived(estimateStrength(password, rules, options)),
		met = $derived(new SvelteSet(strength.met));
	const rank = $derived(strength.short ? 0.5 : strength.level),
		metKey = $derived(strength.met.join(' '));
	let track = $state(
		untrack(() => ({
			rank,
			level: strength.level,
			previousLevel: strength.level,
			direction: 1,
			metKey,
			previousMet: metKey
		}))
	);
	$effect.pre(() => {
		const nextRank = rank,
			nextMet = metKey;
		untrack(() => {
			if (track.rank !== nextRank || track.metKey !== nextMet)
				track = {
					rank: nextRank,
					level: strength.level,
					previousLevel: track.rank !== nextRank ? track.level : track.previousLevel,
					direction: track.rank === nextRank ? track.direction : nextRank > track.rank ? 1 : -1,
					metKey: nextMet,
					previousMet: track.metKey !== nextMet ? track.metKey : track.previousMet
				};
		});
	});
	const previousMet = $derived(new SvelteSet(track.previousMet.split(' ').filter(Boolean)));
	const changed = $derived(
		rules.filter((rule) => met.has(rule.id) !== previousMet.has(rule.id)).map((rule) => rule.id)
	);
	let reveal = $state(untrack(() => ({ shown, changed: false })));
	$effect.pre(() => {
		const next = shown;
		untrack(() => {
			if (reveal.shown !== next) reveal = { shown: next, changed: true };
		});
	});
	const copy = $derived(strengthCopy(reduced, track.direction, !mounted.current));
	let shell = $state<HTMLDivElement>();
	let lastError = untrack(() => error);
	$effect(() => {
		const next = error;
		const node = shell;
		const previous = lastError;
		lastError = next;
		if (!next || next === previous || reduced || !node) return;
		const position = springPosition({ stiffness: 900, damping: 15 }, -240);
		const resting = springPosition({ stiffness: 900, damping: 15 });
		const displacement = (time: number) => position(time) - resting(time);
		let seconds = 2;
		for (let time = 1 / 120; time < 2; time += 1 / 120) {
			const velocity = (displacement(time + 0.001) - displacement(time - 0.001)) / 0.002;
			if (Math.abs(displacement(time)) < 0.1 && Math.abs(velocity) < 0.01) {
				seconds = time;
				break;
			}
		}
		const samples = Math.ceil(seconds * 120);
		const frames = Array.from({ length: samples + 1 }, (_, i) => ({
			transform: `translateX(${i === samples ? 0 : displacement((seconds * i) / samples)}px)`
		}));
		const animation = node.animate(frames, { duration: seconds * 1000 });
		return () => animation.cancel();
	});
	const summary = $derived(
		strength.level
			? messages.summary({ label: strength.label, met: strength.met.length, total: rules.length })
			: ''
	);
	const rulesId = $derived(`${id}-rules`),
		errorId = $derived(`${id}-error`);
</script>

<div class="arc-password-strength__field" data-level={strength.level}>
	<label class="arc-password-strength__label" for={id}>{label}</label>
	<div bind:this={shell} class="arc-password-strength__shell">
		<input
			autocomplete="new-password"
			autocapitalize="off"
			autocorrect="off"
			spellcheck={false}
			{...props}
			bind:this={ref}
			{id}
			type={shown ? 'text' : 'password'}
			value={password}
			oninput={(event) => {
				oninput?.(event);
				const next = event.currentTarget.value;
				if (value === undefined) internal = next;
				onchange?.(event);
				onValueChange?.(next, estimateStrength(next, rules, options));
				queueMicrotask(() => {
					if (value !== undefined && ref) ref.value = password;
				});
			}}
			aria-invalid={error ? true : props['aria-invalid']}
			aria-describedby={[props['aria-describedby'], error ? errorId : undefined, rulesId]
				.filter(Boolean)
				.join(' ')}
			data-reveal={reveal.changed ? (shown ? 'shown' : 'hidden') : undefined}
			class={['arc-password-strength__input', className]}
		/><button
			type="button"
			class="arc-password-strength__reveal"
			onclick={() => {
				const next = !shown;
				if (revealed === undefined) revealedInternal = next;
				onRevealedChange?.(next);
			}}
			aria-label={messages.showPassword}
			aria-pressed={shown}
			aria-controls={id}><EyeMorph slashed={shown} path="M3 3l18 18" {reduced} /></button
		>
	</div>
	{#if error}<ErrorRow id={errorId} text={error} {reduced} initial={!mounted.current} />{/if}
	<div class="arc-password-strength__meter-row">
		<div
			class="arc-password-strength__meter"
			role="meter"
			aria-label={messages.meterLabel}
			aria-valuemin="0"
			aria-valuemax="4"
			aria-valuenow={strength.level}
			aria-valuetext={strength.level ? strength.label : messages.noPassword}
		>
			{#each [0, 1, 2, 3] as index (index)}{@const on = index < strength.level}{@const wave = on
					? index - track.previousLevel
					: track.previousLevel - 1 - index}<span class="arc-password-strength__segment"
					><MeterFill {on} delay={Math.max(0, wave) * (on ? 50 : 30)} {reduced} /></span
				>{/each}
		</div>
		<span class="arc-password-strength__word" aria-hidden="true"
			>{#each strength.level ? [strength.label] : [] as word (word)}<span
					class="arc-password-strength__word-text"
					in:swap={copy.enter}
					out:swap={copy.exit}>{word}</span
				>{/each}</span
		>
	</div>
	<ul id={rulesId} class="arc-password-strength__rules" aria-label={messages.rulesLabel}>
		{#each rules as rule (rule.id)}{@const ok = met.has(rule.id)}{@const remaining =
				password && !ok ? (rule.remaining?.(password) ?? 0) : 0}{@const order = changed.indexOf(
				rule.id
			)}
			<li class="arc-password-strength__rule" data-met={ok || undefined}>
				<RuleMark met={ok} delay={order > 0 ? order * 50 : 0} {reduced} /><span
					class="arc-password-strength__rule-label"
					>{rule.label}<span class="arc-password-strength__sr-only"
						>{ok ? messages.ruleMet : messages.ruleNotMet}</span
					></span
				><span class="arc-password-strength__remaining" aria-hidden="true"
					>{#each remaining > 0 ? ['remaining'] : [] as key (key)}<span
							class="arc-password-strength__remaining-text"
							in:swap={strengthCopy(reduced, 1, !mounted.current).enter}
							out:swap={strengthCopy(reduced).exit}
							>{#if messages.remainingPrefix}{`${messages.remainingPrefix} `}{/if}<RollingCount
								value={remaining}
								{reduced}
							/>{#if messages.remainingSuffix}{` ${messages.remainingSuffix}`}{/if}</span
						>{/each}</span
				>
			</li>{/each}
	</ul>
	<span class="arc-password-strength__sr-only" role="status">{summary}</span>
</div>
