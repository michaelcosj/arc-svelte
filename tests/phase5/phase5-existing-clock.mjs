// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { start } from './phase5-existing-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, installResizeClock, advance } from './phase5-animation-clock.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = { runs: [], comparisons: [], errors: [] };
const server = await start();
let browser;
try {
	browser = await chromium.launch();
	for (const kind of ['hold', 'slider'])
		for (const reduced of [false, true])
			for (const scenario of kind === 'hold'
				? ['release', 'complete', 'interrupt']
				: ['keys', 'kick', 'drag', 'detent', 'stretch', 'catch'])
				for (const ref of [true, false]) {
					const id = `${kind}-${scenario}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
					if (process.argv[2] && !id.includes(process.argv[2])) continue;
					const p = await browser.newPage({
						viewport: { width: 900, height: 700 },
						reducedMotion: reduced ? 'reduce' : 'no-preference'
					});
					p.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
					await installAnimationClock(p);
					await installResizeClock(p);
					await p.clock.install({ time: new Date('2026-01-01') });
					await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
					const props =
						kind === 'hold'
							? { duration: 480 }
							: { defaultValue: scenario === 'kick' ? 100 : 40, step: 1, marks: [25, 50, 75] };
					await p.goto(
						`http://127.0.0.1:5213/existing-${ref ? 'react' : 'local'}?kind=${kind}&props=${encodeURIComponent(JSON.stringify(props))}`
					);
					await p.waitForFunction(() => window.api);
					await p.evaluate(() => document.fonts.ready);
					await p.evaluate(() => window.flushResizeObservers());
					await p.addStyleTag({
						content: '*,*::before,*::after{transition:none!important;animation:none!important}'
					});
					await p.evaluate(() => {
						HTMLElement.prototype.setPointerCapture = () => {};
						HTMLElement.prototype.releasePointerCapture = () => {};
						HTMLElement.prototype.hasPointerCapture = () => false;
					});
					await advance(p, 1500);
					const now = await p.evaluate(() => performance.now());
					await p.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
					await p.evaluate(() => window.advanceAnimations());
					const key = (type, key) =>
						p
							.locator(kind === 'hold' ? 'button[data-state]' : '[role=slider]')
							.dispatchEvent(type, { key, bubbles: true, cancelable: true });
					const fire = (type, at) =>
						p.evaluate(
							({ type, at }) => {
								const c = document.querySelector('[class*=control]'),
									r = document.querySelector('[class*=rail]').getBoundingClientRect(),
									e = new PointerEvent(type, {
										bubbles: true,
										pointerType: 'mouse',
										pointerId: 1,
										isPrimary: true,
										button: 0,
										buttons: 1,
										clientX: r.x + (r.width * at) / 100,
										clientY: r.y + 4
									});
								Object.defineProperty(e, 'timeStamp', { value: performance.now() });
								c.dispatchEvent(e);
							},
							{ type, at }
						);
					const read = () =>
						p.evaluate((kind) => {
							const events = window.api.events();
							if (kind === 'hold') {
								const b = document.querySelector('button[data-state]'),
									s = getComputedStyle(b);
								return {
									state: b.dataset.state,
									scale: Number(s.scale) || new DOMMatrixReadOnly(s.transform).m11,
									fill:
										1 -
										parseFloat(
											getComputedStyle(b.querySelector('[class*=fill]')).clipPath.split(' ')[1]
										) /
											100,
									width: b.getBoundingClientRect().width,
									events
								};
							}
							const thumb = document.querySelector('[role=slider]'),
								rail = document.querySelector('[class*=rail]').getBoundingClientRect(),
								r = thumb.getBoundingClientRect(),
								shift = document.querySelector('[class*=shift]'),
								track = document.querySelector('[class*=track]'),
								bubble = document.querySelector('[class*=bubbleAnchor]');
							return {
								value: Number(thumb.getAttribute('aria-valuenow')),
								position: (100 * (r.x + r.width / 2 - rail.x)) / rail.width,
								over: new DOMMatrixReadOnly(getComputedStyle(shift).transform).m41,
								scale: new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m11,
								trackScale: new DOMMatrixReadOnly(getComputedStyle(track).transform).m22,
								bubble: bubble ? bubble.style.getPropertyValue('--at') : null,
								events
							};
						}, kind);
					if (kind === 'hold') await key('keydown', ' ');
					else if (['keys', 'kick'].includes(scenario)) await key('keydown', 'ArrowRight');
					else {
						await fire('pointerdown', scenario === 'detent' ? 51 : 40);
						await advance(p);
						await fire(
							'pointermove',
							scenario === 'stretch' ? 120 : scenario === 'detent' ? 50 : 48
						);
						await advance(p);
						await fire(
							'pointermove',
							scenario === 'stretch' ? 130 : scenario === 'detent' ? 51 : 64
						);
						await advance(p);
						await fire('pointerup', 64);
					}
					const samples = [];
					for (let i = 0; i < 60; i++) {
						if (kind === 'hold' && scenario !== 'complete' && i === 10) await key('keyup', ' ');
						if (kind === 'hold' && scenario === 'interrupt' && i === 14) await key('keydown', ' ');
						if (kind === 'slider' && scenario === 'keys' && [4, 8].includes(i))
							await key('keydown', i === 4 ? 'ArrowLeft' : 'ArrowRight');
						if (kind === 'slider' && scenario === 'catch' && i === 4) {
							await fire('pointerdown', 45);
							await advance(p);
							await fire('pointermove', 30);
							await advance(p);
							await fire('pointerup', 30);
						}
						await advance(p);
						samples.push(await read());
					}
					out.runs.push({ id, samples });
					console.log(id, 'captured');
					await p.close();
				}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		const keys = a.id.startsWith('hold')
			? ['fill', 'scale', 'width']
			: ['position', 'over', 'scale', 'trackScale'];
		const c = { id: a.id.replace('-source', '') };
		for (const k of keys)
			c[k] = Math.max(...a.samples.map((f, i) => Math.abs(f[k] - b.samples[i][k])));
		out.comparisons.push(c);
		console.log(c);
		for (const key of keys)
			assert.ok(c[key] < (key === 'width' ? 1 / 64 : 0.001), `${a.id} ${key} ${c[key]}`);
		assert.deepEqual(a.samples.at(-1).events, b.samples.at(-1).events, a.id + ' callbacks');
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-existing-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
