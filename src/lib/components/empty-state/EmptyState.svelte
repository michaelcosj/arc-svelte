<script lang="ts">
	import Folder from '@lucide/svelte/icons/folder';
	import { prefersReducedMotion } from 'svelte/motion';
	import { HeightMorph, Mounted, contentSwap, swap } from '#lib/motion';
	import type { EmptyStateProps } from './types';
	import './empty-state.css';
	let { title, description, action, icon, class: className, label }: EmptyStateProps = $props();
	const mounted = new Mounted();
	const reduced = $derived(prefersReducedMotion.current);
	const height = new HeightMorph(() => ({ reduced }));
	$effect.pre(() => {
		void title;
		void description;
		height.changed();
	});
	const motion = $derived(contentSwap(Boolean(reduced), mounted.current));
</script>

<section class={['arc-empty-state', className]} aria-label={label}>
	<div class="arc-empty-state__icon" aria-hidden="true">
		{#key icon}<span
				class="arc-empty-state__glyph"
				in:swap={motion.iconIn}
				out:swap={motion.iconOut}
				>{#if icon}{@render icon()}{:else}<Folder
						width={24}
						height={24}
						strokeWidth={1.5}
					/>{/if}</span
			>{/key}
	</div>
	<div class="arc-empty-state__frame" {@attach height.body}>
		<div class="arc-empty-state__copy" {@attach height.content}>
			<h3>
				{#key title}<span
						class="arc-empty-state__line"
						in:swap={motion.textIn}
						out:swap={motion.textOut}>{title}</span
					>{/key}
			</h3>
			<p>
				{#key description}<span
						class="arc-empty-state__line"
						in:swap={motion.textIn}
						out:swap={motion.textOut}>{description}</span
					>{/key}
			</p>
		</div>
	</div>
	{#if action}<div class="arc-empty-state__action">{@render action()}</div>{/if}
</section>
