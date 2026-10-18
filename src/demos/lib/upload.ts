export function simulateUpload(
	file: { size: number },
	{ signal, onProgress }: { signal: AbortSignal; onProgress: (value: number) => void }
) {
	return new Promise<void>((resolve, reject) => {
		let progress = 0,
			timer: ReturnType<typeof setTimeout>;
		const speed = Math.min(1.5, Math.max(0.9, 2621440 / Math.max(file.size, 1)));
		const abort = () => {
			clearTimeout(timer);
			reject(new DOMException('Upload cancelled', 'AbortError'));
		};
		const tick = () => {
			progress = Math.min(100, progress + (5 + 17 * Math.random()) * speed);
			onProgress(progress);
			if (progress >= 100) {
				signal.removeEventListener('abort', abort);
				resolve();
				return;
			}
			timer = setTimeout(tick, 130 + 220 * Math.random() + 380 * (Math.random() < 0.15 ? 1 : 0));
		};
		signal.addEventListener('abort', abort, { once: true });
		timer = setTimeout(tick, 220);
	});
}
