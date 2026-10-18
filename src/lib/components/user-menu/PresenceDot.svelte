<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { UserStatus } from './types';
	import './user-menu.css';
	let { status, class: className }: { status: UserStatus | 'offline'; class?: ClassValue } =
		$props();
</script>

<span class={['arc-user-menu__dot', className]} data-status={status} aria-hidden="true"></span>
