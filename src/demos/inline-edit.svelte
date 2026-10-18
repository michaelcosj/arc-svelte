<script lang="ts">
	import { InlineEdit } from '#arc/inline-edit';
	import { Switch } from '#arc/switch';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	let failNext = $state(false),
		activity = $state('Last edited by Emma Collins on Mon 15 Sep');
	const mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	const timers: ReturnType<typeof setTimeout>[] = [];
	function save(label: string, text: string) {
		const fail = failNext;
		if (fail) failNext = false;
		activity = `Saving ${label.toLowerCase()}…`;
		return new Promise<void>((resolve, reject) => {
			timers.push(
				setTimeout(() => {
					if (fail) {
						activity = 'The save failed.';
						reject(new Error('Simulated failure'));
					} else {
						activity = `${label} saved as “${text.length > 28 ? `${text.slice(0, 27)}…` : text}”.`;
						resolve();
					}
				}, 900)
			);
		});
	}
	function cleanup() {
		return () => timers.forEach(clearTimeout);
	}
	const validateName = (text: string) =>
		text
			? text.length > 32
				? `Keep it to 32 characters. This one has ${text.length}.`
				: null
			: 'Give the project a name.';
	const validateDescription = (text: string) =>
		text.length > 140 ? `Keep it to 140 characters. This one has ${text.length}.` : null;
</script>

<div class="canvas">
	<section class="panel" aria-label="Project settings" {@attach cleanup}>
		<div class="field">
			<span class="label" aria-hidden="true">Project name</span><InlineEdit
				as="h3"
				value="Atlas web app"
				label="Project name"
				validate={validateName}
				onSave={(text) => save('Name', text)}
			/>
		</div>
		<div class="field">
			<span class="label" aria-hidden="true">Description</span><InlineEdit
				multiline
				variant="body"
				value="Offline-first field notes for the Atlas survey team. Drafts sync the moment a connection returns."
				placeholder="Add a short description"
				label="Description"
				validate={validateDescription}
				onSave={(text) => save('Description', text)}
			/>
		</div>
		<footer class="footer">
			<Switch bind:checked={failNext} label="Fail the next save" />
			<p class="activity">
				<span class="rise"
					>{#key activity}<span
							class="rise-line"
							in:swap={{
								y: reduced ? 0 : '0.3em',
								blur: reduced ? 0 : m.blur.soft,
								duration: reduced ? m.duration.fast : m.duration.standard,
								easing: m.ease.enter,
								skip: !mounted.current
							}}
							out:swap={{
								y: reduced ? 0 : '-0.3em',
								blur: reduced ? 0 : m.blur.subtle,
								duration: reduced ? m.duration.instant : m.duration.fast,
								easing: m.ease.standard,
								pop: true
							}}>{activity}</span
						>{/key}</span
				>
			</p>
		</footer>
	</section>
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
	.panel {
		container-type: inline-size;
		display: grid;
		width: min(100%, 440px);
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		padding: var(--space-6);
		border: 1px solid var(--border);
		border-radius: var(--radius-surface);
		background: var(--surface);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.field {
		display: grid;
		min-width: 0;
		gap: 2px;
	}
	.label {
		color: var(--text-muted);
		font-size: var(--text-xs);
		line-height: var(--leading-body);
	}
	.footer {
		display: grid;
		gap: var(--space-1);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border-subtle);
	}
	.activity {
		min-height: 1.4em;
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-xs);
		line-height: var(--leading-body);
	}
	.rise {
		position: relative;
		display: block;
	}
	.rise-line {
		display: block;
	}
	@container (max-width: 400px) {
		.activity {
			min-height: 2.8em;
		}
	}
	@container (max-width: 360px) {
		.panel {
			padding: var(--space-5);
		}
	}
</style>
