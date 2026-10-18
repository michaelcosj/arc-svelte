<script lang="ts">
	import { Avatar } from '#arc/avatar';
	import { avatar } from '#lib/media.ts';
	import './demo.css';

	const people = [
		{ name: 'Emma Collins', id: 'emma-collins', size: 'sm', status: 'online', label: 'Small' },
		{
			name: 'Marcus Johnson',
			id: 'marcus-johnson',
			size: 'md',
			status: 'offline',
			label: 'Medium'
		},
		{ name: 'Ava Mitchell', id: 'ava-mitchell', size: 'lg', status: undefined, label: 'Large' }
	] as const;
</script>

<div class="demo-canvas">
	<div class="showcase">
		{#each people as person (person.id)}
			<div class="person">
				<div class="image">
					<Avatar
						name={person.name}
						src={avatar(person.id)}
						size={person.size}
						status={person.status}
					/>
				</div>
				<strong>{person.name}</strong>
				<span>{person.label}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.showcase {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: clamp(24px, 4vw, 54px);
	}

	.person {
		display: grid;
		justify-items: center;
		gap: 5px;
		min-width: 94px;
		text-align: center;
	}

	.image {
		display: grid;
		height: 54px;
		align-items: end;
		margin-bottom: 8px;
	}

	.person strong {
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: 1.4;
	}

	.person > span:last-child {
		color: var(--text-muted);
		font-size: var(--text-xs);
		line-height: 1.4;
	}
</style>
