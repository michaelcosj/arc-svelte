<script lang="ts">
	import { CommentThread, type CommentAuthor, type ThreadComment } from '#arc/comment-thread';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	const person = (id: string, name: string): CommentAuthor => ({
		id,
		name,
		avatar: `/media/people/${id}.jpg`
	});
	const emma = person('emma-collins', 'Emma Collins'),
		jasmine = person('jasmine-brooks', 'Jasmine Brooks'),
		marcus = person('marcus-johnson', 'Marcus Johnson'),
		daniel = person('daniel-kim', 'Daniel Kim'),
		chloe = person('chloe-nguyen', 'Chloe Nguyen');
	const people = [emma, jasmine, marcus, daniel, chloe];
	const comments: ThreadComment[] = [
		{
			id: 'first',
			author: jasmine,
			body: 'Can we try a shorter headline here? @Emma Collins had a version that fit on one line at 390 px.',
			createdAt: '2h',
			reactions: [{ emoji: '👍', users: [jasmine.id, emma.id] }],
			replies: [
				{
					id: 'reply-one',
					author: emma,
					body: 'Yes, “Plan less. Ship more.” Dropping it into the file now.',
					createdAt: '1h',
					reactions: [{ emoji: '🎉', users: [jasmine.id] }]
				},
				{
					id: 'reply-two',
					author: marcus,
					body: 'Works for me. It also saves the second line on mobile.',
					createdAt: '48m'
				}
			]
		},
		{
			id: 'second',
			author: daniel,
			body: "Once this lands I'll update the social image copy to match. @Chloe Nguyen can you check the click through numbers after?",
			createdAt: '30m',
			reactions: [{ emoji: '👀', users: [chloe.id] }]
		}
	];
	let reset = $state(0);
</script>

<div class="canvas">
	<div class="demo">
		{#key reset}<CommentThread
				defaultComments={comments}
				currentUser={emma}
				{people}
				title="Hero headline"
			/>{/key}
		<div class="bar">
			<p class="srOnly" aria-live="polite">Signed in as Emma Collins</p>
			<button type="button" class="reset" onclick={() => reset++}
				><RotateCcw size={13} strokeWidth={1.75} />Reset</button
			>
		</div>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.canvas > * {
		width: 100%;
		min-width: 0;
	}
	.demo {
		display: grid;
		width: min(100%, 560px);
		gap: 10px;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-inline: 6px;
	}
	.reset {
		display: inline-flex;
		height: 28px;
		flex: none;
		align-items: center;
		gap: 6px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font: inherit;
		font-size: var(--text-xs);
		font-weight: 500;
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	.reset:focus-visible {
		background: var(--surface-muted);
	}
	.reset:hover {
		background: var(--surface-muted);
		color: var(--foreground);
	}
	.srOnly {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
