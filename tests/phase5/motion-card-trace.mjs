// @ts-nocheck -- Standalone browser harness; page callbacks run in the fixture window.
/** Controlled source/local card motion comparison. See ../README.md (or README.md
 * from the phase5 root) for the isolated reference dependencies and setup. */
import { start } from './motion-card-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { assertPairedFrames } from './card-stack/motion-assertions.mjs';
const label = process.argv[2] ?? 'fixed',
	server = await start(),
	browser = await chromium.launch(),
	out = { label, cases: {}, errors: [] };
const deadline = setTimeout(() => process.exit(2), 180000);
const sample = () =>
	[...document.querySelectorAll('[data-item]')].map((n) => {
		const card = n.parentElement.parentElement,
			slot = card.parentElement,
			m = new DOMMatrix(getComputedStyle(card).transform),
			s = new DOMMatrix(getComputedStyle(slot).transform);
		return {
			id: n.dataset.item,
			x: m.m41,
			y: m.m42,
			angle: (Math.atan2(m.m12, m.m11) * 180) / Math.PI,
			opacity: +getComputedStyle(card).opacity,
			depthY: s.m42,
			scale: s.m11,
			slotOpacity: +getComputedStyle(slot).opacity,
			top: card.hasAttribute('data-top'),
			drag: card.hasAttribute('data-dragging'),
			flying: card.hasAttribute('data-flying'),
			shade: +getComputedStyle(card.querySelector('[class*="shade"]')).opacity,
			stamps: [...card.querySelectorAll('[data-side]')].map((n) => +getComputedStyle(n).opacity)
		};
	});
try {
	await server.listen();
	for (const mode of ['normal', 'reduced'])
		for (const scenario of [
			'return',
			'velocity-return',
			'throw',
			'flick',
			'button',
			'undo-flight',
			'undo-gone',
			'catch-home',
			'cancel',
			'reverse',
			'catch-return',
			'button-mid-drag',
			'keyboard',
			'reset',
			'reset-catch'
		]) {
			if (process.argv[3] && scenario !== process.argv[3]) continue;
			const pages = await Promise.all(
				['ref', 'local'].map(async (side) => {
					const p = await browser.newPage({
						viewport: { width: 900, height: 700 },
						reducedMotion: mode === 'normal' ? 'no-preference' : 'reduce'
					});
					p.on('pageerror', (e) => out.errors.push(e.message));
					await p.addInitScript(() => {
						let time = 1000,
							id = 0,
							queue = new Map();
						performance.now = () => time;
						Date.now = () => 1792238400000 + time;
						window.requestAnimationFrame = (cb) => {
							queue.set(++id, cb);
							return id;
						};
						window.cancelAnimationFrame = (id) => queue.delete(id);
						window.elapse = (ms) => {
							time += ms;
						};
						window.tick = async (ms) => {
							time += ms;
							const callbacks = [...queue.values()];
							queue.clear();
							for (const cb of callbacks) {
								cb(time);
								await Promise.resolve();
							}
						};
					});
					await p.goto(
						'http://127.0.0.1:5223/motion-card-' +
							(side === 'local' && label === 'baseline' ? 'baseline' : side)
					);
					await p.locator('[data-top]').waitFor({ state: 'attached' });
					for (let i = 0; i < 64; i++) await p.evaluate(() => window.tick(16));
					await p.evaluate(() => {
						let timerId = 0;
						const timers = new Map();
						window.setTimeout = (fn, ms = 0) => {
							timers.set(++timerId, { fn, at: performance.now() + ms });
							return timerId;
						};
						window.clearTimeout = (id) => timers.delete(id);
						const tick = window.tick;
						window.tick = async (ms) => {
							const until = performance.now() + ms;
							for (;;) {
								const due = [...timers]
									.filter(([, v]) => v.at <= until)
									.sort((a, b) => a[1].at - b[1].at)[0];
								if (!due) break;
								const [id, timer] = due;
								window.elapse(Math.max(0, timer.at - performance.now()));
								timers.delete(id);
								timer.fn();
								await Promise.resolve();
							}
							await tick(until - performance.now());
						};
						window.testTime = 0;
						window.send = (type, x, y) => {
							const c = document.querySelector('[data-top]');
							c.setPointerCapture = () => {};
							c.hasPointerCapture = () => false;
							const e = new PointerEvent(type, {
								bubbles: true,
								button: 0,
								isPrimary: true,
								pointerId: 1,
								clientX: 450 + x,
								clientY: 120 + y
							});
							Object.defineProperty(e, 'timeStamp', { value: window.testTime });
							c.dispatchEvent(e);
						};
						window.click = (name) =>
							[...document.querySelectorAll('button')]
								.find((n) => n.textContent.trim() === name)
								.click();
					});
					return p;
				})
			);
			const traces = [[], []],
				events = [];
			const advance = async (ms, tag) => {
				for (let t = 0; t < ms; t += 16) {
					await Promise.all(pages.map((p) => p.evaluate(() => window.tick(16))));
					const states = await Promise.all(pages.map((p) => p.evaluate(sample)));
					states.forEach((s, i) => traces[i].push({ t: traces[i].length * 16, tag, cards: s }));
				}
			};
			const send = async (type, x = 0, y = 0) => {
				const before =
					type === 'pointerdown' ? await Promise.all(pages.map((p) => p.evaluate(sample))) : null;
				events.push({ type, x, y, frame: traces[0].length });
				await Promise.all(
					pages.map((p) =>
						p.evaluate(
							([type, x, y, t]) => {
								window.testTime = t;
								window.send(type, x, y);
							},
							[type, x, y, traces[0].length * 16]
						)
					)
				);
				if (before) {
					const after = await Promise.all(pages.map((p) => p.evaluate(sample)));
					after.forEach((cards, i) =>
						cards.forEach((a) => {
							const b = before[i].find((b) => a.id === b.id);
							assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.001, 'painted catch must not jump');
						})
					);
				}
			};
			const click = async (name) => {
				events.push({ type: 'click', name, frame: traces[0].length });
				await Promise.all(pages.map((p) => p.evaluate((name) => window.click(name), name)));
			};
			await Promise.all(
				pages.map((p) =>
					p
						.locator('input')
						.first()
						.evaluate((n) =>
							n.dispatchEvent(
								new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
							)
						)
				)
			);
			assert.deepEqual(
				await pages[1].evaluate(() => window.cardEvents),
				[],
				'nested input ignores deck keys'
			);
			await advance(32, 'rest');
			if (scenario === 'reset' || scenario === 'reset-catch') {
				for (let i = 0; i < 6; i++) {
					await click('Keep');
					await advance(80, 'decide');
				}
				await advance(500, 'empty');
				await click('Start over');
				if (scenario === 'reset-catch') {
					await advance(48, 'stagger-wait');
					await send('pointerdown');
					await advance(240, 'caught-stagger');
					await send('pointercancel');
				}
			} else if (scenario === 'keyboard') {
				await Promise.all(
					pages.map((p) =>
						p.locator('[aria-roledescription="card stack"]').evaluate((n) =>
							n.dispatchEvent(
								new KeyboardEvent('keydown', {
									key: 'ArrowRight',
									bubbles: true,
									cancelable: true
								})
							)
						)
					)
				);
				events.push({ type: 'keydown', key: 'ArrowRight', frame: traces[0].length });
				await advance(96, 'key-throw');
				events.push({ type: 'keydown', key: 'Backspace', frame: traces[0].length });
				await Promise.all(
					pages.map((p) =>
						p.locator('[aria-roledescription="card stack"]').evaluate((n) =>
							n.dispatchEvent(
								new KeyboardEvent('keydown', {
									key: 'Backspace',
									bubbles: true,
									cancelable: true
								})
							)
						)
					)
				);
			} else if (['button', 'undo-flight', 'undo-gone', 'catch-home'].includes(scenario)) {
				await click('Keep');
				await advance(scenario === 'undo-gone' ? 480 : 96, 'throw');
				if (scenario !== 'button') {
					await click('Undo');
					await advance(scenario === 'catch-home' ? 144 : 32, 'undo');
					if (scenario === 'catch-home') {
						await send('pointerdown');
						await advance(16, 'catch');
						await send('pointermove', -24, 12);
						await advance(16, 'catch-move');
						await send('pointerup', -24, 12);
					}
				}
			} else {
				await send('pointerdown');
				for (let i = 1; i <= 6; i++) {
					await send(
						'pointermove',
						(scenario === 'throw'
							? 25
							: scenario === 'reverse'
								? 26
								: scenario === 'flick'
									? 9
									: scenario === 'velocity-return'
										? 6
										: 10) * i,
						(scenario === 'cancel' ? 22 : 2) * i
					);
					await advance(16, 'drag');
				}
				if (!['velocity-return', 'flick'].includes(scenario)) await advance(112, 'held');
				if (scenario === 'reverse') {
					await send('pointermove', 160, 12);
					await advance(16, 'reverse');
					await send('pointermove', 145, 12);
					await advance(16, 'reverse');
					await send('pointermove', 125, 12);
					await advance(16, 'reverse');
				}
				if (scenario === 'button-mid-drag') {
					await click('Pass');
				} else {
					await send(scenario === 'cancel' ? 'pointercancel' : 'pointerup');
					if (scenario === 'catch-return') {
						await advance(96, 'return');
						await send('pointerdown');
						await advance(16, 'catch');
						await send('pointermove', -20, 5);
						await advance(16, 'catch-move');
						await send('pointerup');
					}
				}
			}
			await advance(1200, 'settle');
			if (label !== 'baseline') assertPairedFrames(traces[0], traces[1], mode + ' ' + scenario);
			const position = await pages[0].evaluate(() =>
				window.cardEvents.reduce(
					(n, e) => (e[0] === 'reset' ? 0 : n + (e[0] === 'decide' ? 1 : e[0] === 'undo' ? -1 : 0)),
					0
				)
			);
			const expectedTop = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'][position];
			for (const p of pages) {
				if (label === 'baseline' && p !== pages[0]) continue;
				assert.equal(
					await p.locator('[data-top]').getAttribute('aria-label'),
					expectedTop + ', ' + (position + 1) + ' of 6'
				);
				assert.equal(await p.locator('[inert]').count(), 3);
			}
			if (label !== 'baseline' && scenario === 'reset') {
				assert.ok(
					traces[1].at(-1).cards.every((c) => Math.abs(c.x) < 0.001 && Math.abs(c.y) < 0.001),
					'reset settles all four cards'
				);
			}
			const callbacks = await Promise.all(pages.map((p) => p.evaluate(() => window.cardEvents)));
			if (label !== 'baseline')
				assert.deepEqual(callbacks[0], callbacks[1], mode + ' ' + scenario + ' callbacks');
			let sum = 0,
				max = 0,
				n = 0,
				depth = 0;
			for (let i = 0; i < traces[0].length; i++) {
				for (const a of traces[0][i].cards) {
					const b = traces[1][i].cards.find((b) => b.id === a.id);
					if (!b) continue;
					const d = Math.hypot(a.x - b.x, a.y - b.y);
					sum += d * d;
					max = Math.max(max, d);
					depth = Math.max(depth, Math.abs(a.depthY - b.depthY));
					n++;
				}
			}
			const tracks = {};
			for (const key of ['opacity', 'angle', 'shade', 'slotOpacity', 'scale']) {
				tracks[key] = 0;
				for (let i = 0; i < traces[0].length; i++)
					for (const a of traces[0][i].cards) {
						const b = traces[1][i].cards.find((b) => b.id === a.id);
						if (b) tracks[key] = Math.max(tracks[key], Math.abs(a[key] - b[key]));
					}
			}
			if (label !== 'baseline') {
				assert.ok(max < 0.001, 'card travel');
				assert.ok(depth < 1 / 64, 'moving-target depth');
				for (const [key, difference] of Object.entries(tracks))
					assert.ok(difference < 0.001, `${key} differs by ${difference}`);
			}
			out.cases[mode + '-' + scenario] = {
				events,
				tracks,
				callbacks: callbacks[0],
				localCallbacks: callbacks[1],
				rmse: Math.sqrt(sum / n),
				max,
				depthMax: depth,
				source: traces[0],
				local: traces[1]
			};
			console.log(
				mode,
				scenario,
				'RMSE',
				Math.sqrt(sum / n).toFixed(3),
				'max',
				max.toFixed(3),
				'depth',
				depth.toFixed(3)
			);
			await Promise.all(pages.map((p) => p.close()));
		}
	assert.deepEqual(out.errors, []);
} catch (e) {
	out.failure = e.stack;
	console.error(e);
	process.exitCode = 1;
} finally {
	writeFileSync('handoff/motion-card-' + label + '.json', JSON.stringify(out, null, 2));
	clearTimeout(deadline);
	await browser.close();
	await server.close();
}
