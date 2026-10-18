import { Mounted } from '#lib/motion';
import { SvelteSet } from 'svelte/reactivity';
import { keyId, type Platform } from './shortcut';
import { untrack } from 'svelte';
export function usePlatform(override?: Platform) {
	const mounted = new Mounted();
	return {
		get current(): Platform {
			if (override) return override;
			if (!mounted.current) return 'mac';
			const hint =
				(navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
					?.platform ??
				navigator.platform ??
				navigator.userAgent;
			return /mac|iphone|ipad|ipod/i.test(hint) ? 'mac' : 'other';
		}
	};
}
export function usePressedKeys(enabled: () => boolean = () => true) {
	const held = new SvelteSet<string>();
	$effect(() => {
		if (!enabled()) {
			untrack(() => held.clear());
			return;
		}
		const down = (e: KeyboardEvent) => {
				const id = keyId(e);
				if (id) held.add(id);
			},
			up = (e: KeyboardEvent) => {
				const id = keyId(e);
				if (id) held.delete(id);
				if (id === 'meta')
					for (const k of held) if (!['ctrl', 'alt', 'shift'].includes(k)) held.delete(k);
				if (!e.metaKey) held.delete('meta');
				if (!e.ctrlKey) held.delete('ctrl');
				if (!e.altKey) held.delete('alt');
				if (!e.shiftKey) held.delete('shift');
			},
			clear = () => held.clear();
		window.addEventListener('keydown', down, true);
		window.addEventListener('keyup', up, true);
		window.addEventListener('blur', clear);
		document.addEventListener('visibilitychange', clear);
		return () => {
			window.removeEventListener('keydown', down, true);
			window.removeEventListener('keyup', up, true);
			window.removeEventListener('blur', clear);
			document.removeEventListener('visibilitychange', clear);
		};
	});
	return held;
}
