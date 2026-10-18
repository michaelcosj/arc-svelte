<script lang="ts">
	import { tick } from 'svelte';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Settings from '@lucide/svelte/icons/settings';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import { UserMenu, type ThemePreference } from '#arc/user-menu';
	import { Button } from '#arc/button';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, swap, Mounted } from '#lib/motion';
	import './user-menu-demo.css';
	let open = $state(false),
		theme = $state<ThemePreference>('system'),
		note = $state(''),
		signedOut = $state(false),
		trigger = $state<HTMLButtonElement | null>(null),
		signIn = $state<HTMLButtonElement | null>(null);
	const mounted = new Mounted(),
		reduced = $derived(Boolean(prefersReducedMotion.current));
	const timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => {
		timers.push(setTimeout(fn, ms));
	};
	$effect(() => {
		if (window.matchMedia('(min-width:640px)').matches) open = true;
		return () => timers.forEach(clearTimeout);
	});
	const user = {
		name: 'Emma Collins',
		email: 'emma@example.com',
		plan: 'Pro',
		avatarSrc: '/media/people/emma-collins.jpg'
	};
	const themes = { light: 'light', dark: 'dark', system: 'match system' };
	function signOut() {
		return new Promise<void>((resolve) => later(resolve, 900)).then(() =>
			later(() => {
				signedOut = true;
				note = 'You signed out';
				void tick().then(() => signIn?.focus());
			}, 160)
		);
	}
</script>

{#snippet profile()}<UserRound size={16} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet settings()}<Settings size={16} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet billing()}<CreditCard size={16} strokeWidth={1.75} aria-hidden="true" />{/snippet}
<div class="arc-user-menu-demo__stage">
	<div class="arc-user-menu-demo__account">
		{#key signedOut}<span
				class="arc-user-menu-demo__control"
				in:swap={{ duration: reduced ? 0 : 160, easing: m.ease.enter, skip: !mounted.current }}
				out:swap={{ duration: reduced ? 0 : 160, easing: m.ease.enter, pop: true }}
			>
				{#if signedOut}<Button
						bind:ref={signIn}
						variant="secondary"
						size="sm"
						label="Sign in"
						onclick={() => {
							signedOut = false;
							note = 'Signed back in';
							void tick().then(() => trigger?.focus());
						}}
					/>
				{:else}<UserMenu
						bind:ref={trigger}
						{user}
						showName
						align="center"
						portal={false}
						{open}
						onOpenChange={(v) => (open = v)}
						{theme}
						onThemeChange={(v) => {
							theme = v;
							note = `Theme set to ${themes[v]}`;
						}}
						onSignOut={signOut}
						signOutKeys={['⇧', '⌘', 'Q']}
						items={[
							{
								label: 'Profile',
								icon: profile,
								keys: ['⌘', 'P'],
								onSelect: () => (note = 'Opened profile')
							},
							{
								label: 'Settings',
								icon: settings,
								keys: ['⌘', ','],
								onSelect: () => (note = 'Opened settings')
							},
							{ label: 'Billing', icon: billing, onSelect: () => (note = 'Opened billing') }
						]}
					/>{/if}</span
			>{/key}
	</div>
	<p class="arc-user-menu-demo__note" role="status">
		{#each note ? [note] : [] as text (text)}<span
				in:swap={{
					y: reduced ? 0 : '.3em',
					blur: reduced ? 0 : 4,
					duration: reduced ? 160 : 240,
					easing: m.ease.enter
				}}
				out:swap={{
					y: reduced ? 0 : '-.3em',
					blur: reduced ? 0 : 2,
					duration: reduced ? 120 : 160,
					easing: m.ease.standard,
					pop: true
				}}>{text}</span
			>{/each}
	</p>
</div>
