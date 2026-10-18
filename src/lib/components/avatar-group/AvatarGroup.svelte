<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Avatar } from '#arc/avatar';
	import { Mounted, motionTokens as m, swap, widthPresence, easeOut } from '#lib/motion';
	import type { AvatarGroupProps } from './types';
	import './avatar-group.css';
	let { members, max = 4, size = 'md', label = 'Team members' }: AvatarGroupProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const visible = $derived(members.slice(0, Math.max(0, max)));
	const overflow = $derived(Math.max(0, members.length - visible.length));
	let count = $state(untrack(() => ({ overflow, direction: 1 })));
	$effect.pre(() => {
		const next = overflow;
		untrack(() => {
			if (count.overflow !== next)
				count = { overflow: next, direction: next < count.overflow ? -1 : 1 };
		});
	});
</script>

<div
	class={['arc-avatar-group', `arc-avatar-group--${size}`]}
	role="group"
	aria-label={label}
	style:--count={visible.length + (overflow > 0 ? 1 : 0)}
>
	{#each visible as member, index (member.name)}<span
			class="arc-avatar-group__slot"
			style:--index={index}
			in:widthPresence={{ scale: 0.9, skip: !mounted.current || reduced }}
			out:widthPresence={{ scale: 0.9, skip: reduced }}
			><span class="arc-avatar-group__lift"
				><Avatar
					class="arc-avatar-group__avatar"
					name={member.name}
					src={member.src}
					status={member.status}
					{size}
				/><span class="arc-avatar-group__tip" aria-hidden="true">{member.name}</span></span
			></span
		>{/each}
	{#if overflow > 0}<span
			class="arc-avatar-group__slot"
			style:--index={visible.length}
			in:widthPresence={{ scale: 0.9, skip: !mounted.current || reduced }}
			out:widthPresence={{ scale: 0.9, skip: reduced }}
			><span
				class={[
					'arc-avatar-group__lift',
					'arc-avatar-group__overflow',
					`arc-avatar-group--${size}`
				]}
				role="img"
				aria-label={`${overflow} more ${label.toLowerCase()}`}
				>{#key overflow}<span
						class="arc-avatar-group__count"
						aria-hidden="true"
						in:swap={{
							y: reduced ? 0 : `${0.4 * count.direction}em`,
							blur: reduced ? 0 : m.blur.subtle,
							duration: reduced ? m.duration.instant : m.duration.standard,
							easing: reduced ? easeOut : m.ease.enter,
							skip: !mounted.current
						}}
						out:swap={{
							y: reduced ? 0 : `${-0.4 * count.direction}em`,
							blur: reduced ? 0 : m.blur.subtle,
							duration: reduced ? m.duration.instant : m.duration.fast,
							easing: reduced ? easeOut : m.ease.standard,
							pop: true
						}}>+{overflow}</span
					>{/key}</span
			></span
		>{/if}
</div>
