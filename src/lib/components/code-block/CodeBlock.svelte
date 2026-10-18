<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import type { Attachment } from 'svelte/attachments';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import FileCode2 from '@lucide/svelte/icons/file-code-2';
	import { CopyButton } from '#arc/copy-button';
	import { motionTokens as m, Mounted, springCurve, swap, WidthMorph } from '#lib/motion';
	import { highlight, normaliseLanguage } from './highlight';
	import SwapText from './SwapText.svelte';
	import type { CodeBlockProps } from './types';
	import './code-block.css';

	let { code, filename, language = 'tsx', maxLines }: CodeBlockProps = $props();

	const preId = $props.id();
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const displayLanguage = $derived(normaliseLanguage(language));
	const tokens = $derived(highlight(code, displayLanguage));
	const lineCount = $derived(code.split('\n').length);
	const collapsible = $derived(maxLines != null && maxLines > 0 && lineCount > maxLines);
	let expanded = $state(false);
	const open = $derived(!collapsible || expanded);
	const name = $derived(filename ?? 'Source code');
	const expandLabels = $derived([`Show all ${lineCount} lines`, 'Show fewer lines'] as const);

	// A new file name swaps in while its box follows the new width on a spring, then returns to auto so it can still truncate.
	const nameMorph = new WidthMorph(() => ({ reduced, measure: 'offset', contentKey: name }));

	// The source area follows its content on a spring: expanding, collapsing, and new code all resize smoothly.
	// Before the first measurement the clip height comes from CSS, so the server render is already collapsed.
	let measured: { full: number; collapsed: number } | undefined;
	let measuredHeight = $state(false);
	const height = new Tween(0);
	const viewportHeight = $derived(
		measuredHeight ? `${height.current}px` : open ? undefined : 'var(--code-collapsed)'
	);

	function settle(instant: boolean) {
		if (!measured) return;
		const next = open ? measured.full : measured.collapsed;
		if (instant || reduced || !measuredHeight) {
			height.set(next, { duration: 0 });
			measuredHeight = true;
		} else {
			const curve = springCurve(m.specs.smooth, Math.abs(next - height.current));
			height.set(next, curve);
		}
	}

	const observe: Attachment<HTMLPreElement> = (pre) => {
		// Reattach when the line limit changes, even if the source keeps the same size.
		const lines = maxLines;
		const observer = new ResizeObserver(() => {
			const style = getComputedStyle(pre);
			const full = pre.offsetHeight;
			const collapsed = lines
				? Math.min(
						full,
						Math.round(
							lines * parseFloat(style.lineHeight) +
								parseFloat(style.paddingTop) +
								parseFloat(style.paddingBottom)
						)
					)
				: full;
			const first = !measured;
			measured = { full, collapsed };
			untrack(() => settle(first));
		});
		observer.observe(pre);
		return () => observer.disconnect();
	};

	$effect(() => {
		void open;
		void reduced;
		untrack(() => settle(false));
	});

	const codeIn = $derived(
		reduced || !mounted.current
			? { skip: true }
			: { y: 4, duration: m.duration.standard, easing: m.ease.enter }
	);
	const codeOut = $derived(
		reduced
			? { duration: 0, pop: true }
			: { duration: m.duration.instant, easing: m.ease.standard, pop: true }
	);
</script>

<section
	class="arc-code-block"
	aria-label={filename ? `${filename} source code` : `${displayLanguage} source code`}
	style:--code-lines={maxLines || undefined}
>
	<header class="arc-code-block__header">
		<div class="arc-code-block__file">
			<FileCode2 size={16} strokeWidth={1.75} aria-hidden="true" />
			<span class="arc-code-block__swap arc-code-block__filename" {@attach nameMorph.body}>
				<span class="arc-code-block__sizer" aria-hidden="true" {@attach nameMorph.content}
					>{name}</span
				>
				<span class="arc-code-block__swap-stack" aria-hidden="true"
					><SwapText value={name} {reduced} /></span
				>
				<span class="arc-code-block__sr-only">{name}</span>
			</span>
			<span class="arc-code-block__language">{displayLanguage}</span>
		</div>
		<CopyButton value={code} label="Copy code" />
	</header>
	<div class="arc-code-block__viewport" style:height={viewportHeight}>
		<!-- A scrollable region must be focusable so keyboard users can scroll it. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<pre
			id={preId}
			class="arc-code-block__pre"
			tabindex="0"
			aria-label="Selectable source code"
			{@attach observe}>{#key code}<code
					class="arc-code-block__code"
					in:swap={codeIn}
					out:swap={codeOut}
					>{#each tokens as token, index (index)}{#if token.kind}<span
								class="arc-code-block__{token.kind}">{token.text}</span
							>{:else}{token.text}{/if}{/each}</code
				>{/key}</pre>
	</div>
	{#if collapsible}
		<button
			type="button"
			class="arc-code-block__expand"
			aria-expanded={expanded}
			aria-controls={preId}
			onclick={() => (expanded = !expanded)}
		>
			<!-- Both labels reserve the cell, so the chevron never moves when the words change. -->
			<span class="arc-code-block__swap" aria-hidden="true">
				{#each expandLabels as text (text)}<span class="arc-code-block__reserve">{text}</span
					>{/each}
				<span class="arc-code-block__swap-stack"
					><SwapText value={expandLabels[expanded ? 1 : 0]} {reduced} /></span
				>
			</span>
			<span class="arc-code-block__sr-only">{expandLabels[expanded ? 1 : 0]}</span>
			<span class="arc-code-block__chevron" aria-hidden="true" data-expanded={expanded || undefined}
				><ChevronDown size={16} strokeWidth={1.75} /></span
			>
		</button>
	{/if}
</section>
