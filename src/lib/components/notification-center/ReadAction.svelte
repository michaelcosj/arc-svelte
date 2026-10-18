<script lang="ts">
	import { WidthMorph, Mounted, motionTokens as m, swap } from '#lib/motion';
	import Check from '@lucide/svelte/icons/check';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import NotificationText from './NotificationText.svelte';
	let { read, reduced }: { read?: boolean; reduced: boolean } = $props();
	const width = new WidthMorph(() => ({ reduced })),
		mounted = new Mounted();
	$effect.pre(() => {
		void read;
		width.changed();
	});
</script>

<span class="arc-notification-center__morph" {@attach width.body}
	><span class="arc-notification-center__morph-content" {@attach width.content}
		><span class="arc-notification-center__action-icon"
			>{#key read}<span
					class="arc-notification-center__action-glyph"
					in:swap={{
						scale: reduced ? 1 : 0.6,
						blur: reduced ? 0 : 2,
						...m.spring.snappy,
						skip: reduced || !mounted.current
					}}
					out:swap={{
						scale: reduced ? 1 : 0.6,
						blur: reduced ? 0 : 2,
						duration: reduced ? 120 : 160,
						easing: m.ease.standard,
						pop: true
					}}
					>{#if read}<CircleDot size={14} strokeWidth={1.75} />{:else}<Check
							size={14}
							strokeWidth={1.75}
						/>{/if}</span
				>{/key}</span
		><NotificationText text={read ? 'Mark unread' : 'Mark read'} {reduced} /></span
	></span
>
