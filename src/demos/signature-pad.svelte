<script lang="ts">
	import { onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { SignaturePad, signatureToSvg, type InkStroke } from '#arc/signature-pad';
	import { Button } from '#arc/button';
	import { HeightMorph, motionTokens as m, swap } from '#lib/motion';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	let strokes = $state<InkStroke[]>([]),
		phase = $state<'signing' | 'saving' | 'signed'>('signing'),
		shown = $state(true),
		visible = $state<'pad' | 'signed'>('pad'),
		version = $state(0),
		image = $state('');
	let timer: ReturnType<typeof setTimeout>;
	const reduced = $derived(Boolean(prefersReducedMotion.current)),
		height = new HeightMorph(() => ({ reduced, follow: true, measure: 'offset', pinned: true }));
	function sign() {
		if (!strokes.length) return;
		phase = 'saving';
		timer = setTimeout(() => {
			image = `data:image/svg+xml;utf8,${encodeURIComponent(signatureToSvg(strokes))}`;
			phase = 'signed';
			shown = false;
		}, 700);
	}
	function again() {
		strokes = [];
		image = '';
		phase = 'signing';
		version++;
		shown = false;
	}
	function exited() {
		visible = phase === 'signed' ? 'signed' : 'pad';
		shown = true;
	}
	onDestroy(() => clearTimeout(timer));
</script>

<div class="canvas">
	<div class="demo">
		<div class="stage" {@attach height.body}>
			<div {@attach height.content}>
				{#if shown}{#key `${visible}-${version}`}{#if visible === 'pad'}<div
								class="body"
								in:swap={{
									y: reduced ? 0 : 10,
									blur: reduced ? 0 : 4,
									duration: reduced ? 160 : 240,
									skip: version === 0
								}}
								out:swap|global={{
									y: reduced ? 0 : -6,
									blur: reduced ? 0 : 4,
									duration: reduced ? 160 : 240
								}}
								onoutroend={(e) => {
									if (e.target === e.currentTarget) exited();
								}}
							>
								<SignaturePad
									signer="Emma Collins"
									fileName="emma-collins-signature"
									onChange={(s) => (strokes = s)}
								/>
								<div class="footer">
									<span></span><Button
										disabled={!strokes.length}
										loading={phase === 'saving'}
										onclick={sign}
										label={phase === 'saving' ? 'Signing' : 'Adopt and sign'}
									/>
								</div>
							</div>{:else}<div
								class="signed"
								in:swap={{
									y: reduced ? 0 : 10,
									blur: reduced ? 0 : 4,
									duration: reduced ? 160 : 240
								}}
								out:swap|global={{
									y: reduced ? 0 : -6,
									blur: reduced ? 0 : 4,
									duration: reduced ? 160 : 240
								}}
								onoutroend={(e) => {
									if (e.target === e.currentTarget) exited();
								}}
							>
								<div class="sheet">
									<img class="signature-preview" src={image} alt="Your signature" /><span
										class="rule"
										aria-hidden="true"
									></span><span class="caption">Emma Collins</span>
								</div>
								<div class="footer">
									<p class="done" role="status">
										<Check size={16} strokeWidth={1.75} aria-hidden="true" />Signed
									</p>
									<Button variant="secondary" size="sm" onclick={again}
										><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />Sign again</Button
									>
								</div>
							</div>{/if}{/key}{/if}
			</div>
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
		display: grid;
		width: min(100%, 560px);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.stage {
		min-width: 0;
		overflow: clip;
	}
	.body {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px 16px;
	}
	.signed {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.sheet {
		position: relative;
		display: grid;
		justify-items: start;
		gap: 6px;
		padding: 28px 7% 22px;
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		background: var(--surface-muted);
	}
	.signature-preview {
		display: block;
		max-width: 70%;
		height: 96px;
		object-fit: contain;
		object-position: left bottom;
	}
	.rule {
		width: 100%;
		border-top: 1.5px solid var(--border-strong);
	}
	.caption {
		color: var(--text-secondary);
		font-size: var(--text-xs);
		line-height: var(--leading-body);
		font-variant-numeric: tabular-nums;
	}
	.done {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding-left: 4px;
		color: var(--foreground);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	.done :global(svg) {
		flex: none;
		color: var(--success);
	}
	:global(:root[data-theme='dark']) .signature-preview {
		padding: 6px 10px;
		border-radius: 12px;
		background: oklch(96% 0 0);
	}
	@container (max-width:400px) {
		.signature-preview {
			max-width: 100%;
			height: 72px;
		}
	}
</style>
