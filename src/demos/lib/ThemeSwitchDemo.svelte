<script lang="ts">
	import { onMount, flushSync } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { ThemeSwitch, type Theme, type ThemeSwitchVariant } from '#arc/theme-switch';
	import './theme-switch-demo.css';

	let { name, variant }: { name: string; variant: ThemeSwitchVariant } = $props();

	let theme = $state<Theme>('light');
	// Follow the page's appearance, which the layout may set just after this mounts.
	onMount(() => {
		const root = document.documentElement;
		const read = () => (theme = root.dataset.theme === 'dark' ? 'dark' : 'light');
		read();
		const observer = new MutationObserver(read);
		observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
		return () => observer.disconnect();
	});

	/** The gallery's page-wide switch: the new appearance is revealed by a View Transition clip. */
	function apply(next: Theme, motion?: ThemeSwitchVariant) {
		const root = document.documentElement;
		root.dataset.theme = next;
		if (motion) root.dataset.themeMotion = motion;
		else delete root.dataset.themeMotion;
	}

	let current: ViewTransition | null = null;
	function onThemeChange(next: Theme, motion: ThemeSwitchVariant, trigger: HTMLElement) {
		if (next === theme) return;
		const box = trigger.getBoundingClientRect();
		const root = document.documentElement.style;
		root.setProperty('--theme-origin-x', `${box.left + box.width / 2}px`);
		root.setProperty('--theme-origin-y', `${box.top + box.height / 2}px`);
		current?.skipTransition();
		if (prefersReducedMotion.current || !document.startViewTransition) {
			apply(next);
			theme = next;
			return;
		}
		apply(theme, motion);
		const transition = document.startViewTransition(() => {
			apply(next, motion);
			flushSync(() => (theme = next));
		});
		current = transition;
		const done = () => {
			if (current !== transition) return;
			current = null;
			apply(next);
		};
		transition.finished.then(done, done);
	}
</script>

<div data-canvas="compact" style="display: contents">
	<ThemeSwitch
		{theme}
		{variant}
		label={`${name}: switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
		{onThemeChange}
	/>
</div>
