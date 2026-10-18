// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { start } from './motion-toast-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, installResizeClock, advance } from './phase5-animation-clock.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = { runs: [], comparisons: [], errors: [] };
const server = await start();
let browser;
try {
	browser = await chromium.launch();
	for (const reduced of [false, true])
		for (const ref of [true, false]) {
			const id = `${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`,
				p = await browser.newPage({
					viewport: { width: 900, height: 700 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
			p.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
			await installAnimationClock(p);
			await installResizeClock(p);
			await p.clock.install({ time: new Date('2026-01-01') });
			await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
			await p.goto(`http://127.0.0.1:5222/motion-toast?ref=${ref}`);
			await p.waitForFunction(() => window.api);
			await p.evaluate(() => document.fonts.ready);
			await p.addStyleTag({
				content: '*,*::before,*::after{transition:none!important;animation:none!important}'
			});
			await p.evaluate(() => {
				HTMLElement.prototype.setPointerCapture = () => {};
				HTMLElement.prototype.releasePointerCapture = () => {};
				HTMLElement.prototype.hasPointerCapture = () => false;
			});
			const run = { id, scenarios: [] };
			const fire = (type, x) =>
				p.evaluate(
					({ type, x }) => {
						const e = new PointerEvent(type, {
							bubbles: true,
							pointerType: 'mouse',
							pointerId: 1,
							isPrimary: true,
							button: 0,
							buttons: 1,
							clientX: 100 + x,
							clientY: 100
						});
						Object.defineProperty(e, 'timeStamp', { value: performance.now() });
						[...document.querySelectorAll('li')].at(-1).firstElementChild.dispatchEvent(e);
					},
					{ type, x }
				);
			const read = () =>
				p.evaluate(() => {
					const li = [...document.querySelectorAll('li')].at(-1);
					if (!li) return { present: false };
					const card = li.firstElementChild,
						t = new DOMMatrixReadOnly(getComputedStyle(li).transform),
						c = new DOMMatrixReadOnly(getComputedStyle(card).transform);
					return {
						present: true,
						x: c.m41 + t.m41,
						y: t.m42,
						scale: t.m11,
						height: li.getBoundingClientRect().height,
						opacity: +getComputedStyle(li).opacity,
						cardOpacity: +getComputedStyle(card).opacity
					};
				});
			for (const scenario of [
				'paused',
				'velocity',
				'wrong-way',
				'cancel',
				'catch',
				'throw',
				'dismiss',
				'action'
			]) {
				await p.evaluate(() => window.api.dismiss());
				await advance(p, 1500);
				await advance(p, 64);
				await p.evaluate(
					(scenario) =>
						window.api.toast({
							id: scenario,
							title: 'Release 4.2 published',
							description: 'Live for 1,284 customers.',
							duration: Infinity,
							...(scenario === 'action'
								? {
										action: {
											label: 'Undo',
											onClick: (id) =>
												window.api.update(id, { title: 'Rolled back to 4.1', action: undefined })
										}
									}
								: {})
						}),
					scenario
				);
				await advance(p, 1500);
				await advance(p, 64);
				const now = await p.evaluate(() => performance.now());
				await p.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
				await p.evaluate(() => window.advanceAnimations());
				if (scenario === 'dismiss') await p.evaluate(() => window.api.dismiss());
				else if (scenario === 'action')
					await p.getByRole('button', { name: 'Undo', exact: true }).evaluate((n) => n.click());
				else {
					await fire('pointerdown', 0);
					await advance(p);
					await fire('pointermove', 8);
					await advance(p);
					for (let i = 1; i <= 6; i++) {
						await fire(
							'pointermove',
							8 + (scenario === 'wrong-way' ? -1 : 1) * i * (scenario === 'throw' ? 22 : 8)
						);
						await advance(p);
					}
					if (scenario === 'paused') await advance(p, 128);
					await fire(scenario === 'cancel' ? 'pointercancel' : 'pointerup', 56);
				}
				const samples = [];
				for (let i = 0; i < 60; i++) {
					if (scenario === 'catch' && i === 4) {
						await fire('pointerdown', 0);
						await advance(p);
						await fire('pointermove', -8);
						await advance(p);
						await fire('pointermove', -40);
						await advance(p);
						await fire('pointerup', -40);
					}
					await advance(p);
					samples.push(await read());
				}
				run.scenarios.push({ scenario, samples });
				console.log(id, scenario, 'captured');
			}
			out.runs.push(run);
			await p.close();
		}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		for (const s of a.scenarios) {
			const l = b.scenarios.find((t) => t.scenario === s.scenario);
			const c = { id: a.id, scenario: s.scenario, presence: 0 };
			for (const k of ['x', 'y', 'scale', 'height', 'opacity', 'cardOpacity']) c[k] = 0;
			for (let i = 0; i < s.samples.length; i++) {
				const f = s.samples[i],
					g = l.samples[i];
				if (f.present !== g.present) c.presence++;
				if (!f.present || !g.present) continue;
				for (const k of ['x', 'y', 'scale', 'height', 'opacity', 'cardOpacity'])
					c[k] = Math.max(c[k], Math.abs(f[k] - g[k]));
			}
			out.comparisons.push(c);
			console.log(c);
			for (const k of ['x', 'y']) assert.ok(c[k] < 0.01, `${s.scenario} ${k}`);
			assert.ok(c.scale < 0.001);
			assert.ok(c.height < 0.001, 'paired content-height flight');
			assert.ok(c.opacity < 0.001);
			assert.ok(c.cardOpacity < 0.001);
			for (let i = 0; i < s.samples.length; i++) {
				const f = s.samples[i],
					g = l.samples[i];
				if (f.present !== g.present)
					assert.ok(
						(f.opacity ?? g.opacity) < 0.001,
						'only invisible teardown may straddle one frame'
					);
			}
		}
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-toast-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
