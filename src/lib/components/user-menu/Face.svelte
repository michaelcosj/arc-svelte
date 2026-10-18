<script lang="ts">
	import type { UserMenuUser, UserStatus } from './types';
	import PresenceDot from './PresenceDot.svelte';
	let { user, status, size }: { user: UserMenuUser; status?: UserStatus; size: 'sm' | 'md' } =
		$props();
	let failed = $state<string>();
	const initials = $derived(
		user.name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase())
			.join('')
	);
</script>

<span class="arc-user-menu__face" data-size={size}>
	{#if !user.avatarSrc || failed === user.avatarSrc}<span
			class="arc-user-menu__portrait arc-user-menu__initials">{initials}</span
		>
	{:else}<img
			class="arc-user-menu__portrait"
			src={user.avatarSrc}
			srcset={user.avatarSrcSet}
			alt=""
			decoding="async"
			draggable="false"
			onerror={() => (failed = user.avatarSrc)}
		/>{/if}
	{#if status}<PresenceDot {status} />{/if}
</span>
