import { untrack } from 'svelte';
import { Spring } from 'svelte/motion';
import { motionTokens as m } from './tokens';

export interface UploadProgressOptions {
	status?: string;
	progress?: number;
	reduced: boolean;
	complete?: string;
	/** Dropzone failures keep the last painted progress until retry. */
	activeOnly?: boolean;
}
/** One spring keeps an upload bar and count in step, retaining Uploading until 100% is painted. */
export class UploadProgress {
	readonly spring: Spring<number>;
	#filled = $state(true);
	#options: () => UploadProgressOptions;
	constructor(options: () => UploadProgressOptions) {
		this.#options = options;
		const initial = untrack(options);
		this.#filled = initial.status !== 'uploading';
		this.spring = new Spring(initial.progress ?? 0, { ...m.physics.smooth, precision: 0.001 });
		let seen = initial.status;
		$effect.pre(() => {
			const { status } = options();
			untrack(() => {
				if (seen !== status) {
					seen = status;
					if (status === 'uploading') this.#filled = false;
				}
			});
		});
		$effect(() => {
			const { status, reduced, activeOnly, complete = 'done', progress = 0 } = options();
			if (activeOnly && status !== 'uploading' && status !== complete) return;
			const target = status === complete ? 100 : progress;
			void this.spring.set(target, {
				instant: reduced || (status === 'uploading' && target === 0)
			});
		});
		$effect(() => {
			const { status, complete = 'done' } = options();
			if (status === complete && this.spring.current >= 99.5) this.#filled = true;
		});
	}
	get value() {
		return Math.min(Math.max(this.spring.current, 0), 100);
	}
	get percent() {
		return Math.round(this.value);
	}
	get phase() {
		const { status, complete = 'done', reduced } = this.#options();
		return status === complete && !this.#filled && !reduced ? 'uploading' : status;
	}
}
