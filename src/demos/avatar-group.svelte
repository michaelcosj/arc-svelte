<script lang="ts">
	import { AvatarGroup, type AvatarGroupMember } from '#arc/avatar-group';
	import { Button } from '#arc/button';
	import UserMinus from '@lucide/svelte/icons/user-minus';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	const members: AvatarGroupMember[] = [
		{ name: 'Emma Collins', src: '/media/people/emma-collins.jpg', status: 'online' },
		{ name: 'Marcus Johnson', src: '/media/people/marcus-johnson.jpg', status: 'online' },
		{ name: 'Ava Mitchell', src: '/media/people/ava-mitchell.jpg', status: 'offline' },
		{ name: 'Ari Singh' },
		{ name: 'Noah Williams' },
		{ name: 'Sofia Ramirez', src: '/media/people/sofia-ramirez.jpg', status: 'online' },
		{ name: 'Jasmine Brooks', src: '/media/people/jasmine-brooks.jpg' }
	];
	let count = $state(5);
	let remove = $state<HTMLButtonElement | null>(null);
	let add = $state<HTMLButtonElement | null>(null);
	function change(amount: number) {
		count = Math.min(members.length, Math.max(1, count + amount));
		if (count === 1) add?.focus();
		if (count === members.length) remove?.focus();
	}
</script>

<div class="canvas">
	<div class="demo">
		<AvatarGroup members={members.slice(0, count)} label="Project team" max={4} />
		<div class="controls">
			<Button
				bind:ref={remove}
				size="sm"
				variant="secondary"
				aria-label="Remove a person from the team"
				disabled={count <= 1}
				onclick={() => change(-1)}><UserMinus size={16} strokeWidth={1.75} /></Button
			><Button
				bind:ref={add}
				size="sm"
				variant="secondary"
				aria-label="Add a person to the team"
				disabled={count >= members.length}
				onclick={() => change(1)}><UserPlus size={16} strokeWidth={1.75} /></Button
			>
		</div>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 580px;
		min-height: 88px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.demo {
		display: grid;
		justify-items: center;
		gap: 20px;
	}
	.controls {
		display: flex;
		gap: 8px;
	}
	.controls :global(button) {
		width: var(--control-height-sm);
		padding-inline: 0;
	}
</style>
