import { onDestroy } from 'svelte';

export type CopyFeedbackState = 'idle' | 'copied' | 'error';

/**
 * Shared clipboard state for actions that render their own button or menu.
 * Create it during component init (`const feedback = new CopyFeedback()`); the pending reset is
 * cleared when the component is destroyed.
 */
export class CopyFeedback {
	state = $state<CopyFeedbackState>('idle');
	activeKey = $state<string | null>(null);
	#duration: number;
	#timeout: ReturnType<typeof setTimeout> | null = null;

	constructor(duration = 1900) {
		this.#duration = duration;
		try {
			onDestroy(() => this.#clear());
		} catch {
			// Created outside component init: the caller owns cleanup through reset().
		}
	}

	#clear() {
		if (this.#timeout) clearTimeout(this.#timeout);
		this.#timeout = null;
	}

	reset = () => {
		this.#clear();
		this.state = 'idle';
		this.activeKey = null;
	};

	copy = async (value: string, key = 'default') => {
		this.#clear();
		this.activeKey = key;
		try {
			await navigator.clipboard.writeText(value);
			this.state = 'copied';
			this.#timeout = setTimeout(this.reset, this.#duration);
			return true;
		} catch {
			this.state = 'error';
			this.#timeout = setTimeout(this.reset, this.#duration);
			return false;
		}
	};
}
