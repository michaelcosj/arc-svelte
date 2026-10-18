import { createContext } from 'svelte';
import type { ToastStackApi, ToastOptions, ToastRecord, ToastType } from './types';
const durationFor = (type: ToastType, base: number) =>
	type === 'loading' ? Infinity : type === 'warning' || type === 'error' ? base * 1.6 : base;
export class ToastQueue implements ToastStackApi {
	toasts = $state<ToastRecord[]>([]);
	private seq = 0;
	constructor(
		private base = 5000,
		private limit = 12
	) {}
	update = (id: string, patch: Partial<Omit<ToastOptions, 'id'>>) => {
		const found = this.toasts.find((item) => item.id === id);
		if (!found) return;
		const type = patch.type ?? found.type;
		const record = {
			...found,
			...patch,
			type,
			duration: patch.duration ?? durationFor(type, this.base),
			version: found.version + 1
		};
		this.toasts = this.toasts.map((item) => (item.id === id ? record : item));
	};
	toast = ({ id, ...options }: ToastOptions) => {
		if (id && this.toasts.some((item) => item.id === id)) {
			this.update(id, options);
			return id;
		}
		const type = options.type ?? 'info';
		this.seq++;
		const record = {
			...options,
			id: id ?? `toast-${this.seq}`,
			type,
			duration: options.duration ?? durationFor(type, this.base),
			seq: this.seq,
			version: 0
		};
		this.toasts = [record, ...this.toasts].slice(0, this.limit);
		return record.id;
	};
	dismiss = (id?: string) => {
		this.toasts = id === undefined ? [] : this.toasts.filter((item) => item.id !== id);
	};
	runAction = (id: string) => {
		const found = this.toasts.find((item) => item.id === id);
		if (!found?.action) return;
		found.action.onClick(id);
		if (this.toasts.find((item) => item.id === id)?.version === found.version) this.dismiss(id);
	};
}
const [getQueue, setQueue] = createContext<ToastQueue>();
export { setQueue };
export function useToastQueue() {
	const queue = getQueue();
	if (!queue) throw new Error('Render toast stack consumers inside <ToastStackProvider>.');
	return queue;
}
export function useToastStack(): ToastStackApi & { readonly count: number } {
	const queue = useToastQueue();
	return {
		toast: queue.toast,
		update: queue.update,
		dismiss: queue.dismiss,
		get count() {
			return queue.toasts.length;
		}
	};
}
