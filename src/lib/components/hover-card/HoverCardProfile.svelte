<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, swap } from '#lib/motion';
	import type { HoverCardProfileProps } from './types';
	import './hover-card.css';
	let { name, role, avatar, bio, stats = [], meta }: HoverCardProfileProps = $props();
	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('')
	);
	const settle = (order: number) => ({
		skip: prefersReducedMotion.current,
		y: 4,
		duration: m.duration.standard,
		easing: m.ease.enter,
		delay: 40 + order * m.stagger.item
	});
	function portrait(node: HTMLImageElement) {
		if (!node.complete) node.dataset.loading = '';
	}
</script>

<div class="arc-hover-card__profile">
	<div class="arc-hover-card__head" in:swap|global={settle(0)}>
		<span class="arc-hover-card__avatar" aria-hidden="true">
			{#if typeof avatar === 'string'}<img
					src={avatar}
					alt=""
					width="48"
					height="48"
					decoding="async"
					{@attach portrait}
					onload={(event) => {
						delete (event.currentTarget as HTMLImageElement).dataset.loading;
					}}
				/>
			{:else if avatar}{@render avatar()}{:else}<span class="arc-hover-card__initials"
					>{initials}</span
				>{/if}
		</span>
		<span class="arc-hover-card__identity"
			><span class="arc-hover-card__name">{name}</span>{#if role}<span class="arc-hover-card__role"
					>{role}</span
				>{/if}</span
		>
	</div>
	{#if bio}<p class="arc-hover-card__bio" in:swap|global={settle(1)}>{bio}</p>{/if}
	{#if stats.length}<dl class="arc-hover-card__stats" in:swap|global={settle(2)}>
			{#each stats as stat (stat.label)}<div class="arc-hover-card__stat">
					<dt>{stat.label}</dt>
					<dd>{stat.value}</dd>
				</div>{/each}
		</dl>{/if}
	{#if meta}<div class="arc-hover-card__meta" in:swap|global={settle(3)}>{@render meta()}</div>{/if}
</div>
