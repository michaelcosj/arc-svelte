// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
/* eslint-disable typescript/unbound-method -- Prototype methods are intentionally captured and invoked with their original receiver. */
/** Advance finite WAAPI animations with the same mocked performance clock as RAF.
 * Browser compositing timelines otherwise continue in real time under Playwright's clock.
 */
export async function installAnimationClock(page) {
	await page.addInitScript(() => {
		const records = new Map();
		const nativeTimeout = window.setTimeout;
		window.setTimeout = (callback, delay, ...args) =>
			typeof callback === 'string'
				? nativeTimeout(callback, delay, ...args)
				: nativeTimeout(() => {
						window.advanceAnimations?.();
						callback(...args);
					}, delay);

		const originalPlay = Animation.prototype.play,
			originalPause = Animation.prototype.pause,
			originalCancel = Animation.prototype.cancel,
			originalFinish = Animation.prototype.finish;
		const playState = Object.getOwnPropertyDescriptor(Animation.prototype, 'playState').get;
		const startTime = Object.getOwnPropertyDescriptor(Animation.prototype, 'startTime');
		Object.defineProperty(Animation.prototype, 'startTime', {
			get() {
				return records.get(this)?.at ?? startTime.get.call(this);
			},
			set(value) {
				const r = records.get(this);
				if (r) {
					r.at = Number(value);
					originalPause.call(this);
				} else startTime.set.call(this, value);
			}
		});
		const attach = (a) => {
			records.set(a, { at: performance.now(), offset: Number(a.currentTime) || 0, paused: false });
			originalPause.call(a);
			return a;
		};
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = function (...args) {
			return attach(originalAnimate.apply(this, args));
		};
		Animation.prototype.play = function () {
			originalPlay.call(this);
			attach(this);
		};
		Animation.prototype.pause = function () {
			const r = records.get(this);
			if (r) r.paused = true;
			originalPause.call(this);
		};
		Animation.prototype.cancel = function () {
			records.delete(this);
			return originalCancel.call(this);
		};
		Animation.prototype.finish = function () {
			records.delete(this);
			return originalFinish.call(this);
		};
		Object.defineProperty(Animation.prototype, 'playState', {
			get() {
				const r = records.get(this);
				return r && !r.paused ? 'running' : playState.call(this);
			}
		});
		window.advanceAnimations = () => {
			for (const [a, r] of records) {
				if (r.paused) continue;
				originalPause.call(a);
				const t = r.offset + (performance.now() - r.at) * a.playbackRate;
				const end = a.effect?.getComputedTiming().endTime;
				a.currentTime = t;
				if (Number.isFinite(end) && t >= end) {
					records.delete(a);
					originalFinish.call(a);
				}
			}
		};
	});
}
export async function advance(page, ms = 16) {
	if (ms <= 16) {
		for (let i = 0; i < ms; i++) {
			await page.clock.runFor(1);
			await page.evaluate(() => window.advanceAnimations());
		}
	} else await page.clock.runFor(ms);
	await page.evaluate(() => {
		window.advanceAnimations();
		window.flushResizeObservers?.();
	});
	if (ms >= 16)
		for (let i = 0; i < 2; i++)
			await page.evaluate(async () => {
				if (!window.flushResizeObservers) return;
				// Let React's MessageChannel commit queued state before delivering layout
				// observation, without advancing the animation clock or adding a delay.
				await new Promise((resolve) => {
					const channel = new MessageChannel();
					channel.port1.onmessage = () => {
						channel.port1.close();
						channel.port2.close();
						resolve();
					};
					channel.port2.postMessage(null);
				});
				window.flushResizeObservers();
			});
}

/** Deterministic layout-observer delivery for motion-only fixtures. Native RO delivery
 * is tied to Chromium's real compositor clock, independently of Playwright's RAF clock.
 * Live/demo checks retain the native observer. */
export async function installResizeClock(page) {
	await page.addInitScript(() => {
		const observers = new Set();
		const size = (node) => {
			const s = getComputedStyle(node);
			const number = (k) => parseFloat(s[k]) || 0;
			const px = number('paddingLeft') + number('paddingRight'),
				py = number('paddingTop') + number('paddingBottom'),
				bx = number('borderLeftWidth') + number('borderRightWidth'),
				by = number('borderTopWidth') + number('borderBottomWidth');
			let w = parseFloat(s.width),
				h = parseFloat(s.height);
			if (!Number.isFinite(w)) w = node.offsetWidth;
			else if (s.boxSizing !== 'border-box') w += px + bx;
			if (!Number.isFinite(h)) h = node.offsetHeight;
			else if (s.boxSizing !== 'border-box') h += py + by;
			return { w, h, cw: w - px - bx, ch: h - py - by };
		};
		window.ResizeObserver = class {
			constructor(callback) {
				this.callback = callback;
				this.nodes = new Map();
				observers.add(this);
			}
			observe(node) {
				this.nodes.set(node, null);
			}
			unobserve(node) {
				this.nodes.delete(node);
			}
			disconnect() {
				this.nodes.clear();
				observers.delete(this);
			}
		};
		window.flushResizeObservers = () => {
			for (const o of observers) {
				const entries = [];
				for (const [node, last] of o.nodes) {
					if (!node.isConnected) continue;
					const next = size(node);
					if (last && Math.abs(next.w - last.w) < 0.0001 && Math.abs(next.h - last.h) < 0.0001)
						continue;
					o.nodes.set(node, next);
					entries.push({
						target: node,
						contentRect: {
							width: next.cw,
							height: next.ch,
							x: 0,
							y: 0,
							top: 0,
							left: 0,
							right: next.cw,
							bottom: next.ch
						},
						borderBoxSize: [{ inlineSize: next.w, blockSize: next.h }],
						contentBoxSize: [{ inlineSize: next.cw, blockSize: next.ch }]
					});
				}
				if (entries.length) o.callback(entries, o);
			}
		};
	});
}
