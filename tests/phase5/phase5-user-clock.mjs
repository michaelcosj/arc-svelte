// @ts-nocheck -- Paired browser values are asserted at runtime.
import { server } from './phase5-highlight-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, advance } from './phase5-animation-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const reduced of [false, true])
		for (const width of [900, 390])
			for (const ref of [true, false]) {
				const id = `${width}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
				const p = await browser.newPage({
					viewport: { width, height: 700 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
				p.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
				await installAnimationClock(p);
				await p.clock.install({ time: new Date('2026-01-01') });
				await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
				await p.goto(`http://127.0.0.1:5225/phase5-highlight?kind=user&ref=${ref}`);
				await p.getByRole('menu').waitFor();
				await p.evaluate(() => document.fonts.ready);
				await advance(p, 2000);
				const now = await p.evaluate(() => performance.now());
				await p.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
				await p.evaluate(() => window.advanceAnimations());
				const read = () =>
					p.evaluate(() => {
						const m = document.querySelector('[role=menu]'),
							h = m.querySelector('[class*=highlight]'),
							s = getComputedStyle(h),
							t = new DOMMatrixReadOnly(s.transform);
						return {
							y: t.m42,
							height: parseFloat(s.height),
							opacity: +s.opacity,
							sheet: m.getBoundingClientRect().y
						};
					});
				const move = (label) =>
					p
						.getByRole('menuitem', { name: label, exact: true })
						.dispatchEvent('pointermove', { pointerType: 'mouse', bubbles: true });
				await move('Profile');
				await advance(p, 200);
				await move('Settings');
				const samples = [];
				for (let i = 0; i < 55; i++) {
					if (i === 4) await move('Sign out');
					if (i === 9) await move('Profile');
					await advance(p);
					samples.push(await read());
				}
				const dragSamples = [];
				if (width === 390 && !reduced) {
					const base = (await read()).sheet;
					await p.evaluate(() => {
						HTMLElement.prototype.setPointerCapture = () => {};
						HTMLElement.prototype.releasePointerCapture = () => {};
						HTMLElement.prototype.hasPointerCapture = () => false;
					});
					const fire = (type, y) =>
						p.evaluate(
							({ type, y }) => {
								const target =
									type === 'pointerdown' ? document.querySelector('[role=menu]') : window;
								const e = new PointerEvent(type, {
									bubbles: true,
									pointerType: 'mouse',
									pointerId: 1,
									isPrimary: true,
									button: 0,
									buttons: 1,
									clientX: 150,
									clientY: 100 + y
								});
								Object.defineProperty(e, 'timeStamp', { value: performance.now() });
								target.dispatchEvent(e);
							},
							{ type, y }
						);
					await fire('pointerdown', 0);
					await advance(p);
					await fire('pointermove', 8);
					await advance(p);
					await fire('pointermove', 56);
					await advance(p, 128);
					await fire('pointerup', 56);
					for (let i = 0; i < 55; i++) {
						await advance(p);
						dragSamples.push((await read()).sheet - base);
					}
				}
				out.runs.push({ id, samples, dragSamples });
				console.log(id, 'captured');
				await p.close();
			}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		const c = { id: a.id };
		for (const key of ['y', 'height', 'opacity']) {
			c[key] = Math.max(...a.samples.map((f, i) => Math.abs(f[key] - b.samples[i][key])));
			assert.ok(c[key] < 0.001, `${a.id} ${key} ${c[key]}`);
		}
		if (a.dragSamples.length) {
			c.drag = Math.max(...a.dragSamples.map((v, i) => Math.abs(v - b.dragSamples[i])));
			assert.ok(c.drag < 0.001, `${a.id} drag ${c.drag}`);
		}
		out.comparisons.push(c);
		console.log(c);
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-user-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
