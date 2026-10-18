<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import X from '@lucide/svelte/icons/x';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		HeightMorph,
		Mounted,
		contentSwap,
		motionTokens as m,
		swap,
		heightPresence
	} from '#lib/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { AlertProps } from './types';
	import './alert.css';
	let {
		tone = 'info',
		title,
		children,
		class: className,
		open,
		onDismiss,
		...props
	}: AlertProps = $props();
	let dismissed = $state(false);
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const motion = $derived(contentSwap(reduced, mounted.current));
	const Icon = $derived(
		{ info: Info, success: Check, warning: TriangleAlert, danger: CircleX }[tone]
	);
	const text = $derived(
		typeof children === 'string' || typeof children === 'number' ? String(children) : null
	);
	const hasDetails = $derived(children !== undefined && children !== null && children !== '');
	const height = new HeightMorph(() => ({ reduced }));
	$effect.pre(() => {
		void title;
		void hasDetails;
		void text;
		height.changed();
	});
	const isOpen = $derived(open ?? !dismissed);
	function dismiss() {
		if (open === undefined) dismissed = true;
		else onDismiss?.();
	}
	function presence(
		node: HTMLElement,
		_: undefined,
		{ direction }: { direction: 'in' | 'out' | 'both' }
	): TransitionConfig {
		const entering = direction !== 'out';

		let notified = false;
		return {
			...heightPresence(node, { reduced, skip: entering && !mounted.current }, { direction }),
			tick: (t) => {
				if (!entering && t === 0 && !notified) {
					notified = true;
					if (open === undefined && dismissed) queueMicrotask(() => onDismiss?.());
				}
			}
		};
	}
</script>

{#snippet box(animated = false)}
	<div
		{...props}
		class={['arc-alert', `arc-alert--${tone}`, className]}
		role={tone === 'danger' ? 'alert' : 'status'}
	>
		<span
			class="arc-alert__icon"
			in:swap|global={{ ...motion.iconIn, skip: !animated || !mounted.current }}
		>
			{#key tone}<span class="arc-alert__glyph" in:swap={motion.iconIn} out:swap={motion.iconOut}
					><Icon width={18} height={18} aria-hidden="true" /></span
				>{/key}
		</span>
		<div class="arc-alert__copy" {@attach height.body}>
			<div class="arc-alert__content" {@attach height.content}>
				<strong class="arc-alert__title"
					>{#key title}<span
							class="arc-alert__line"
							in:swap={motion.textIn}
							out:swap={motion.textOut}>{title}</span
						>{/key}</strong
				>
				{#if hasDetails}<p
						class="arc-alert__description"
						in:swap={motion.textIn}
						out:swap={motion.textOut}
					>
						{#if text !== null}{#key text}<span
									class="arc-alert__line"
									in:swap={motion.textIn}
									out:swap={motion.textOut}>{text}</span
								>{/key}{:else if typeof children === 'function'}{@render children()}{/if}
					</p>{/if}
			</div>
		</div>
		{#if onDismiss}<button
				type="button"
				class="arc-alert__dismiss"
				aria-label={`Dismiss: ${title}`}
				onclick={dismiss}><X width={16} height={16} strokeWidth={1.75} aria-hidden="true" /></button
			>{/if}
	</div>
{/snippet}
{#if open === undefined && !onDismiss}{@render box()}{:else if isOpen}<div
		class="arc-alert__presence"
		in:presence
		out:presence
	>
		{@render box(true)}
	</div>{/if}
