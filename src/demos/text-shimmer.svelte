<script lang="ts">
	import { TextShimmer } from '#arc/text-shimmer';
	import { Button } from '#arc/button';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import FolderSync from '@lucide/svelte/icons/folder-sync';
	import Check from '@lucide/svelte/icons/check';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	let summary = $state<'working' | 'settling' | 'done'>('working');
	let files = $state<'working' | 'settling' | 'done'>('working');
	const mounted = new Mounted();
	let timers: ReturnType<typeof setTimeout>[] = [];
	function clear() {
		timers.forEach(clearTimeout);
		timers = [];
	}
	function toggle() {
		clear();
		if (summary === 'working') {
			summary = 'settling';
			files = 'settling';
			const delay = prefersReducedMotion.current ? 0 : 300;
			timers.push(
				setTimeout(() => (summary = 'done'), delay),
				setTimeout(() => (files = 'done'), delay + (prefersReducedMotion.current ? 0 : 140))
			);
		} else {
			summary = 'working';
			files = 'working';
		}
	}
	$effect(() => () => clear());
</script>

{#snippet icon(done: boolean, small = false)}
	<span class={['icon', done && 'done']} aria-hidden="true"
		>{#key done}<span
				in:swap={{
					scale: 0.6,
					blur: m.blur.subtle,
					...m.spring.snappy,
					fade: { duration: m.duration.fast },
					skip: !mounted.current || prefersReducedMotion.current
				}}
				out:swap={{
					scale: 0.6,
					blur: m.blur.subtle,
					duration: prefersReducedMotion.current ? 0 : m.duration.instant,
					pop: true
				}}
				>{#if done}<Check size={small ? 16 : 18} strokeWidth={1.75} />{:else if small}<FolderSync
						size={16}
						strokeWidth={1.75}
					/>{:else}<Sparkles size={18} strokeWidth={1.75} />{/if}</span
			>{/key}</span
	>
{/snippet}
<div class="canvas">
	<div class="demo">
		<div class="panel">
			<div class="summary">
				{@render icon(summary === 'done')}
				<div class="copy">
					<TextShimmer
						as="p"
						class="title"
						active={summary === 'working'}
						text={summary === 'done' ? 'Summary ready' : 'Generating summary'}
					/>
					<p class="meta">Q3 planning notes · 18 pages</p>
				</div>
			</div>
			<div class="row">
				{@render icon(files === 'done', true)}<TextShimmer
					class="row-label"
					active={files === 'working'}
					text={files === 'done' ? '24 files synced' : 'Syncing 24 files'}
				/><span class="row-meta">Brand assets</span>
			</div>
		</div>
		<Button
			variant="secondary"
			size="sm"
			class="action"
			label={summary === 'working' ? 'Finish' : 'Start again'}
			onclick={toggle}
		/>
		<p class="sr-only" aria-live="polite">
			{summary === 'done' ? 'Summary ready. 24 files synced.' : ''}
		</p>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
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
		width: min(100%, 440px);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.canvas > .demo {
		width: 100%;
	}
	.panel {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		background: var(--surface);
	}
	.summary {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 20px 22px 18px;
	}
	.icon {
		position: relative;
		display: inline-grid;
		flex: 0 0 auto;
		place-items: center;
		color: var(--text-muted);
	}
	.icon > span {
		display: grid;
		place-items: center;
	}
	.summary .icon {
		margin-top: 4px;
	}
	.done {
		color: var(--success);
	}
	.copy {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.copy :global(.title) {
		margin: 0;
		color: var(--foreground);
		font-size: var(--text-lg);
		font-weight: 500;
		line-height: var(--leading-body);
	}
	.meta {
		margin: 0;
		color: var(--text-muted);
	}
	.meta,
	.row {
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 10px;
		border-top: 1px solid var(--border);
		padding: 14px 22px;
	}
	.row :global(.row-label) {
		min-width: 0;
		color: var(--foreground);
	}
	.row-meta {
		margin-left: auto;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.demo :global(.action) {
		min-width: 6.75rem;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	@media (max-width: 380px) {
		.summary {
			padding: 16px 16px 14px;
		}
		.row {
			padding: 12px 16px;
		}
	}
</style>
