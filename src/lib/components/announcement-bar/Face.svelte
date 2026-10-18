<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { Attachment } from 'svelte/attachments';
	import { swap, springCurve, motionTokens as m } from '#lib/motion';
	import type { Announcement } from './types';
	import Countdown from './Countdown.svelte';
	let {
		announcement,
		exitingBar,
		skip,
		direction,
		reduced,
		position,
		total,
		onSize,
		onAction,
		onCountdownEnd
	}: {
		announcement: Announcement;
		exitingBar: () => boolean;
		skip: boolean;
		direction: number;
		reduced: boolean;
		position: number;
		total: number;
		onSize: (height: number) => void;
		onAction?: (announcement: Announcement) => void;
		onCountdownEnd?: (announcement: Announcement) => void;
	} = $props();

	const rise = springCurve({ visualDuration: 0.46, bounce: 0.1 }, 70);
	const measure: Attachment<HTMLDivElement> = (node) => {
		const report = () => {
			if (!node.inert) onSize(node.offsetHeight);
		};
		report();
		const observer = new ResizeObserver(report);
		observer.observe(node);
		return () => observer.disconnect();
	};
	function action() {
		announcement.action?.onClick?.();
		onAction?.(announcement);
	}
</script>

<div
	class="arc-announcement-bar__face"
	{@attach measure}
	role={total > 1 ? 'group' : undefined}
	aria-roledescription={total > 1 ? 'slide' : undefined}
	aria-label={total > 1 ? `${position} of ${total}` : undefined}
	in:swap|global={{
		y: reduced ? 0 : `${direction * 70}%`,
		blur: reduced ? 0 : m.blur.soft,
		...rise,
		duration: reduced ? m.duration.standard : rise.duration,
		fade: { duration: m.duration.standard, easing: reduced ? m.ease.standard : m.ease.enter },
		skip
	}}
	out:swap|global={{
		skip: exitingBar(),
		y: reduced ? 0 : `${direction * -60}%`,
		blur: reduced ? 0 : m.blur.soft,
		...rise,
		duration: reduced ? m.duration.instant : rise.duration,
		fade: { duration: reduced ? m.duration.instant : m.duration.fast, easing: m.ease.standard }
	}}
>
	<p class="arc-announcement-bar__message">
		<span class="arc-announcement-bar__text"
			>{#if typeof announcement.message === 'function'}{@render announcement.message()}{:else}{announcement.message}{/if}</span
		>{#if announcement.countdown}<Countdown
				{...announcement.countdown}
				{reduced}
				onEnd={() => onCountdownEnd?.(announcement)}
			/>{/if}{#if announcement.action}{#if announcement.action.href}<a
					class="arc-announcement-bar__cta"
					href={announcement.action.href}
					onclick={action}
					>{announcement.action.label}<ArrowRight
						size={14}
						strokeWidth={1.75}
						aria-hidden="true"
					/></a
				>{:else}<button type="button" class="arc-announcement-bar__cta" onclick={action}
					>{announcement.action.label}<ArrowRight
						size={14}
						strokeWidth={1.75}
						aria-hidden="true"
					/></button
				>{/if}{/if}
	</p>
</div>
