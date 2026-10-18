<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { RadioGroup } from 'bits-ui';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import {
		RichTextEditor,
		type RichTextValue,
		type RichTextEditorHandle
	} from '#arc/rich-text-editor';
	import { Highlight, swap, motionTokens as m } from '#lib/motion';
	import './rich-text-editor-demo.css';
	import './demo.css';
	const sample =
		'# Release notes\n\nVersion 2.4 ships **Thursday**. Select any text to format it, or type `/` on an empty line for blocks.\n\n## What changed\n\n- Exports stream up to _one million_ rows\n- Shared views keep their filters\n- Comments on [dashboards](https://example.com/changelog)\n\n> Keep the public note under 120 words.';
	let editor = $state<RichTextEditorHandle | null>(null);
	let output = $state<RichTextValue>({ html: '', markdown: '', text: '', empty: true });
	let history = $state({ canUndo: false, canRedo: false });
	let mode = $state('markdown'),
		copied = $state<'idle' | 'done' | 'failed'>('idle');
	let timer: ReturnType<typeof setTimeout>;
	const reduced = $derived(prefersReducedMotion.current);
	const words = $derived(output.text.split(/\s+/).filter(Boolean).length);
	const source = $derived(
		mode === 'markdown'
			? output.markdown
			: output.html
					.replace(/<\/(p|h1|h2|h3|ul|ol|li|blockquote|pre)>/g, '</$1>\n')
					.replace(/<(ul|ol)>/g, '<$1>\n')
					.replace(/<hr>/g, '<hr>\n')
					.trim()
	);
	async function copy() {
		clearTimeout(timer);
		try {
			await navigator.clipboard.writeText(source);
			copied = 'done';
		} catch {
			copied = 'failed';
		}
		timer = setTimeout(() => (copied = 'idle'), 1600);
	}
	onDestroy(() => clearTimeout(timer));
	let segments = $state<HTMLDivElement | null>(null);
	const mark = new Highlight(() => ({ reduced }));
	$effect(() => {
		void mode;
		untrack(() => mark.move(segments?.querySelector<HTMLElement>('[aria-checked=true]'), true));
	});
	function measure(node: HTMLDivElement) {
		const observer = new ResizeObserver(() =>
			mark.move(node.querySelector<HTMLElement>('[aria-checked=true]'), false)
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<div class="demo-canvas">
	<div class="arc-rich-text-editor-demo__demo">
		<div class="arc-rich-text-editor-demo__card">
			<header class="arc-rich-text-editor-demo__header">
				<div class="arc-rich-text-editor-demo__history">
					<button
						type="button"
						class="arc-rich-text-editor-demo__icon"
						aria-label="Undo"
						title="Undo (⌘Z)"
						disabled={!history.canUndo}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => editor?.undo()}
						><Undo2 size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>
					<button
						type="button"
						class="arc-rich-text-editor-demo__icon"
						aria-label="Redo"
						title="Redo (⌘⇧Z)"
						disabled={!history.canRedo}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => editor?.redo()}
						><Redo2 size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>
					<button
						type="button"
						class="arc-rich-text-editor-demo__icon"
						aria-label="Reset sample"
						title="Reset sample"
						onclick={() => {
							editor?.setMarkdown(sample);
							editor?.focus();
						}}><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>
				</div>
				<p class="arc-rich-text-editor-demo__count" aria-live="polite">
					<span class="arc-rich-text-editor-demo__number">{words}</span>
					{words === 1 ? 'word' : 'words'}
				</p>
			</header>
			<div class="arc-rich-text-editor-demo__body">
				<div class="arc-rich-text-editor-demo__writer">
					<RichTextEditor
						bind:ref={editor}
						defaultMarkdown={sample}
						onChange={(value) => (output = value)}
						onHistoryChange={(value) => (history = value)}
						aria-label="Release notes"
						placeholder="Write release notes"
					/>
				</div>
				<section class="arc-rich-text-editor-demo__output" aria-label="Output">
					<div class="arc-rich-text-editor-demo__outputBar">
						<RadioGroup.Root
							bind:value={mode}
							aria-label="Output format"
							class="arc-rich-text-editor-demo__segments"
							bind:ref={segments}
							style="position:relative"
							{@attach measure}
						>
							<span
								aria-hidden="true"
								class="arc-rich-text-editor-demo__segmentHighlight"
								style={mark.style}
							></span>
							{#each [{ value: 'markdown', label: 'Markdown' }, { value: 'html', label: 'HTML' }] as item (item.value)}<RadioGroup.Item
									value={item.value}
									class="arc-rich-text-editor-demo__segment"
									><span class="arc-rich-text-editor-demo__segmentLabel">{item.label}</span
									></RadioGroup.Item
								>{/each}
						</RadioGroup.Root>
						<button
							type="button"
							class="arc-rich-text-editor-demo__copy"
							data-state={copied}
							onclick={copy}
							aria-label={'Copy ' + (mode === 'markdown' ? 'Markdown' : 'HTML')}
						>
							{#key copied}<span
									class="arc-rich-text-editor-demo__copyFace"
									in:swap={reduced
										? { duration: 120 }
										: { y: 6, blur: m.blur.subtle, ...m.spring.snappy }}
									out:swap={reduced
										? { duration: 120, pop: true }
										: { y: 6, blur: m.blur.subtle, duration: m.duration.fast, pop: true }}
									>{#if copied === 'done'}<Check
											size={16}
											strokeWidth={1.75}
											aria-hidden="true"
										/>Copied{:else if copied === 'failed'}<X
											size={16}
											strokeWidth={1.75}
											aria-hidden="true"
										/>Failed{:else}<Copy
											size={16}
											strokeWidth={1.75}
											aria-hidden="true"
										/>Copy{/if}</span
								>{/key}
						</button>
					</div>
					{#key mode}<pre
							class="arc-rich-text-editor-demo__source"
							in:swap={{ duration: m.duration.fast, skip: !output.html }}
							out:swap={{ duration: m.duration.fast, pop: true }}><code>{source}</code></pre>{/key}
				</section>
			</div>
		</div>
	</div>
</div>
