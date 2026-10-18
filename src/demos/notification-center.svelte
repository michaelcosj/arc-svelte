<script lang="ts">
	import { NotificationCenter, type NotificationItem } from '#arc/notification-center';
	const notifications: NotificationItem[] = [
		{
			id: 'review',
			title: 'Review requested',
			description: 'Emma shared the final interaction pass for your feedback.',
			time: '2m',
			actor: { name: 'Emma Collins', photo: '/media/people/emma-collins.jpg' }
		},
		{
			id: 'handoff',
			title: 'Handoff ready',
			description: 'Marcus prepared the component notes for the team.',
			time: '18m',
			actor: { name: 'Marcus Johnson', photo: '/media/people/marcus-johnson.jpg' }
		},
		{
			id: 'check',
			title: 'A check needs attention',
			description: 'The release checklist has one open item.',
			time: '42m',
			tone: 'warning'
		},
		{
			id: 'build',
			title: 'Build published',
			description: 'The latest preview is ready to share.',
			time: '1h',
			tone: 'success',
			read: true
		},
		{
			id: 'comment',
			title: 'Comment resolved',
			description: 'Ava closed the note on the button states.',
			time: 'Yesterday',
			actor: { name: 'Ava Mitchell', photo: '/media/people/ava-mitchell.jpg' },
			read: true
		}
	];
</script>

<div class="preview"><NotificationCenter {notifications} /><span>Open notifications</span></div>

<style>
	.preview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		width: 100%;
		min-width: 0;
		min-height: 118px;
		align-content: center;
		justify-items: center;
		gap: 8px;
		color: var(--foreground);
	}
	span {
		color: var(--text-muted);
		font-size: 12px;
	}
	@media (max-width: 520px) {
		.preview {
			min-height: 132px;
		}
	}
</style>
