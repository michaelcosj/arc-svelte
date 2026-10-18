<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const names = (paths: string[], prefix: string) =>
		paths.map((path) => path.slice(prefix.length, -'.svelte'.length)).sort();
	const components = names(Object.keys(import.meta.glob('/src/demos/*.svelte')), '/src/demos/');
	const blocks = names(
		Object.keys(import.meta.glob('/src/demos/blocks/*.svelte')),
		'/src/demos/blocks/'
	);

	const dark = $derived(page.url.searchParams.get('theme') === 'dark');
	// Links keep the appearance query, so switching components stays in the chosen theme.
	const query = $derived(page.url.search);
	const current = $derived(page.url.pathname);

	// The appearance switch is a link to the same page with the other theme.
	const themeHref = $derived.by(() => {
		const params = [...page.url.searchParams].filter(([key]) => key !== 'theme');
		if (!dark) params.push(['theme', 'dark']);
		const search = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
		return page.url.pathname + (search ? `?${search}` : '');
	});

	// Bring the active link into view on load and when it changes.
	function reveal(node: HTMLElement, active: boolean) {
		if (active) node.scrollIntoView({ block: 'nearest' });
	}
</script>

<nav class="sidebar" aria-label="Components">
	<div class="head">
		<a class="brand" href={resolve('/') + query}>Arc</a>
		<a
			class="theme"
			href={themeHref}
			data-sveltekit-noscroll
			data-sveltekit-replacestate
			data-sveltekit-keepfocus
			aria-label={dark ? 'Light mode' : 'Dark mode'}><span class="dot"></span></a
		>
	</div>
	<ul>
		{#each components as name (name)}
			{@const href = resolve('/components/[name]', { name })}
			{@const active = current === href}
			<li>
				<a
					href={href + query}
					aria-current={active ? 'page' : undefined}
					{@attach (node) => reveal(node, active)}>{name}</a
				>
			</li>
		{/each}
	</ul>
	{#if blocks.length}
		<p class="group">Blocks</p>
		<ul>
			{#each blocks as name (name)}
				{@const href = resolve('/components/blocks/[name]', { name })}
				{@const active = current === href}
				<li>
					<a
						href={href + query}
						aria-current={active ? 'page' : undefined}
						{@attach (node) => reveal(node, active)}>{name}</a
					>
				</li>
			{/each}
		</ul>
	{/if}
</nav>

<style>
	.sidebar {
		position: sticky;
		top: 0;
		height: 100dvh;
		overflow-y: auto;
		padding: 20px 12px 32px;
		border-right: 1px solid var(--shell-line);
		background: var(--shell-bg);
		scrollbar-width: thin;
	}

	.head {
		position: sticky;
		top: -20px;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -20px -12px 12px;
		padding: 20px 20px 12px;
		background: var(--shell-bg);
	}

	.brand {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.theme {
		display: grid;
		width: 24px;
		height: 24px;
		place-items: center;
		border-radius: 50%;
	}

	.theme:focus-visible,
	a:focus-visible {
		outline: 1.5px solid var(--shell-fg);
		outline-offset: 1px;
	}

	.dot {
		width: 12px;
		height: 12px;
		border: 1.5px solid var(--shell-fg);
		border-radius: 50%;
		background: linear-gradient(90deg, var(--shell-fg) 50%, transparent 50%);
	}

	.group {
		margin: 20px 8px 6px;
		color: var(--shell-muted);
		font-size: 11px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	a:not(.brand, .theme) {
		display: block;
		padding: 5px 8px;
		border-radius: 6px;
		color: var(--shell-muted);
		font-size: 13px;
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			color 120ms,
			background-color 120ms;
	}

	a:not(.brand, .theme):hover {
		color: var(--shell-fg);
	}

	a[aria-current='page'] {
		background: var(--shell-fg);
		color: var(--shell-bg) !important;
	}

	@media (max-width: 760px) {
		.sidebar {
			position: static;
			height: auto;
			max-height: 40dvh;
			border-right: 0;
			border-bottom: 1px solid var(--shell-line);
		}
	}
</style>
