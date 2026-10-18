<script lang="ts">
	import type { ChatParticipant } from './types';
	import { initials } from './chat';
	let { person, size }: { person: ChatParticipant; size: number } = $props();
</script>

<span
	class="arc-chat-thread__avatar"
	style:width={`${size}px`}
	style:height={`${size}px`}
	style:font-size={`${size * 0.38}px`}
	aria-hidden="true"
	>{#if person.avatar}<img
			src={person.avatar}
			alt=""
			width={size}
			height={size}
			loading="lazy"
		/>{:else}{initials(person.name)}{/if}</span
>
