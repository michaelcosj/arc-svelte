<script lang="ts">
	import {
		ShortcutRecorder,
		ShortcutKeys,
		ShortcutList,
		usePlatform,
		matchesShortcut,
		type Platform,
		type ShortcutBinding
	} from '#arc/shortcut-recorder';
	import { SegmentedControl } from '#arc/segmented-control';
	const detected = usePlatform();
	let style = $state<Platform | undefined>(),
		platform = $derived(style ?? detected.current),
		values = $state<(string | null)[]>(['mod+k', 'alt+n', 'mod+.']),
		ran = $state<string | null>(null);
	const defaults = ['mod+k', 'alt+n', 'mod+.'],
		labels = ['Open command menu', 'Create issue', 'Toggle sidebar'];
	const bindings = $derived(
		values.flatMap((shortcut, i) => (shortcut ? [{ shortcut, label: labels[i] }] : []))
	);
	const groups = $derived([
		{
			label: 'Workspace',
			items: values.flatMap((shortcut, i) => (shortcut ? [{ label: labels[i], shortcut }] : []))
		},
		{
			label: 'Navigation',
			items: [
				{ label: 'Go to inbox', shortcut: 'alt+1' },
				{ label: 'Go to projects', shortcut: 'alt+2' },
				{ label: 'Search everything', shortcut: 'mod+shift+f' }
			]
		},
		{
			label: 'Editing',
			items: [
				{ label: 'Bold', shortcut: 'mod+b' },
				{ label: 'Insert link', shortcut: 'mod+shift+l' },
				{ label: 'Save draft', shortcut: 'mod+s' }
			]
		}
	]);
	function changed(index: number) {
		return (value: string | null, details: { replaced?: ShortcutBinding }) => {
			values = values.map((old, i) =>
				i === index ? value : details.replaced?.label === labels[i] ? null : old
			);
		};
	}
	function key(e: KeyboardEvent) {
		const at = values.findIndex((v) => v && matchesShortcut(e, v, platform));
		if (at < 0) return;
		e.preventDefault();
		ran = labels[at];
	}
</script>

<div class="canvas">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Workspace demo handles shortcuts bubbling from its controls.) -->
	<div class="demo" tabindex="-1" onkeydown={key} role="group">
		<div class="panel">
			<section class="settings" aria-label="Workspace shortcuts">
				<header class="header">
					<h3 class="title">Shortcuts</h3>
					<SegmentedControl
						label="Key style"
						value={platform}
						onValueChange={(v) => (style = v as Platform)}
						options={[
							{ value: 'mac', label: 'Mac' },
							{ value: 'other', label: 'Windows' }
						]}
					/>
				</header>
				{#each labels as label, i (label)}<ShortcutRecorder
						{label}
						value={values[i]}
						defaultValue={defaults[i]}
						onValueChange={changed(i)}
						{platform}
						{bindings}
					/>{/each}
				<p class="ran" aria-live="polite">
					<span class="ranText" data-idle={!ran || undefined}
						>{#if ran}{ran}{:else}Press <ShortcutKeys
								shortcut={values[0] ?? defaults[0]}
								{platform}
								size="sm"
							/> here to open the command menu{/if}</span
					>
				</p>
			</section>
			<div class="sheet"><ShortcutList {groups} {platform} /></div>
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
		container-type: inline-size;
		width: min(100%, 760px);
		margin-inline: auto;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.panel {
		display: grid;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-surface);
		background: var(--surface);
	}
	.settings {
		display: grid;
		align-content: start;
		gap: var(--space-4);
		padding: var(--space-6);
	}
	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.title {
		margin: 0;
		color: var(--foreground);
		font-size: var(--text-lg);
		font-weight: 500;
		line-height: var(--leading-body);
	}
	.ran {
		position: relative;
		min-height: 26px;
		margin: 0;
		padding-top: var(--space-2);
		color: var(--text-secondary);
		font-size: var(--text-xs);
		line-height: 22px;
	}
	.ranText {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
	}
	.ranText[data-idle] {
		color: var(--text-muted);
	}
	.sheet {
		display: grid;
		align-content: start;
		gap: var(--space-3);
		min-height: 420px;
		padding: var(--space-6);
		background: color-mix(in oklab, var(--surface-muted) 45%, var(--surface));
	}
	@container (min-width:640px) {
		.panel {
			grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
		}
		.settings {
			border-right: 1px solid var(--border-subtle);
		}
	}
	@container (max-width:639px) {
		.sheet {
			min-height: 0;
			border-top: 1px solid var(--border-subtle);
		}
	}
	@container (max-width:420px) {
		.settings,
		.sheet {
			padding: var(--space-4);
		}
		.panel {
			border-radius: var(--radius-panel);
		}
	}
</style>
