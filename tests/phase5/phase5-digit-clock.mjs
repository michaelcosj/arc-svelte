// @ts-nocheck -- Dynamic browser fixture values are asserted at runtime.
import { start } from './phase5-existing-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, advance } from './phase5-animation-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = { runs: [], comparisons: [], errors: [] };
const server = await start();
let browser;
try {
	browser = await chromium.launch();
	for (const kind of ['standard', 'number'])
		for (const scenario of ['same-place', 'carry', 'carry-roll'])
			for (const reduced of [false, true])
				for (const ref of [true, false]) {
					const id = `${kind}-${scenario}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
					if (process.argv[2] && !id.includes(process.argv[2])) continue;
					const p = await browser.newPage({
						viewport: { width: 900, height: 700 },
						reducedMotion: reduced ? 'reduce' : 'no-preference'
					});
					p.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
					await installAnimationClock(p);
					await p.clock.install({ time: new Date('2026-01-01') });
					await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
					await p.goto(
						`http://127.0.0.1:5213/existing-${ref ? 'react' : 'local'}?kind=${kind}&props=${encodeURIComponent(JSON.stringify({ defaultValue: scenario.startsWith('carry') ? 9 : 40 }))}`
					);
					const control = p.getByRole(kind === 'standard' ? 'slider' : 'spinbutton');
					await control.waitFor();
					await p.evaluate(() => document.fonts.ready);
					await control.focus();
					// Deliver the zero-delay presence animation before settling its real flight.
					for (let frame = 0; frame < 8; frame++) await advance(p);
					await advance(p, 1500);
					for (let frame = 0; frame < 4; frame++) await advance(p);
					const now = await p.evaluate(() => performance.now());
					await p.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
					await p.evaluate(() => window.advanceAnimations());
					const read = () =>
						p.evaluate(() => {
							const nodes = [...document.querySelectorAll('[class*="_glyph"]')];
							const glyphs = nodes.map((n) => {
								const s = getComputedStyle(n);
								return { y: new DOMMatrixReadOnly(s.transform).m42, opacity: +s.opacity };
							});
							const widths = [...document.querySelectorAll('span[class*="_number"]')].map(
								(n) => n.getBoundingClientRect().width
							);
							const paint = nodes.flatMap((n) => {
								let alpha = 1;
								for (
									let parent = n;
									parent && parent !== document.body;
									parent = parent.parentElement
								) {
									const s = getComputedStyle(parent);
									alpha *= +s.opacity;
									if (s.visibility === 'hidden' || s.display === 'none') alpha = 0;
								}
								if (alpha <= 0.001) return [];
								const r = n.getBoundingClientRect();
								return [{ text: n.textContent, alpha, x: r.x, y: r.y, w: r.width, h: r.height }];
							});
							return { glyphs, widths, paint };
						});
					const key = (key) =>
						control.dispatchEvent('keydown', { key, bubbles: true, cancelable: true });
					await key(kind === 'standard' ? 'ArrowRight' : 'ArrowUp');
					if (kind === 'number')
						await control.dispatchEvent('keyup', { key: 'ArrowUp', bubbles: true });
					const samples = [],
						widths = [],
						paint = [];
					for (let i = 0; i < 55; i++) {
						if (scenario === 'carry-roll' && [2, 4, 8].includes(i))
							await p.evaluate((value) => window.api.set({ value }), i === 4 ? 9 : 20);
						if (scenario !== 'carry-roll' && (i === 4 || i === 8)) {
							const k =
								kind === 'standard'
									? i === 4
										? 'ArrowLeft'
										: 'ArrowRight'
									: i === 4
										? 'ArrowDown'
										: 'ArrowUp';
							await key(k);
							if (kind === 'number')
								await control.dispatchEvent('keyup', { key: k, bubbles: true });
						}
						await advance(p);
						const state = await read();
						samples.push(state.glyphs);
						widths.push(state.widths);
						paint.push(state.paint);
					}
					const scales = [];
					if (kind === 'standard' && scenario === 'same-place') {
						await p.evaluate(() => {
							HTMLElement.prototype.setPointerCapture = () => {};
							HTMLElement.prototype.releasePointerCapture = () => {};
							HTMLElement.prototype.hasPointerCapture = () => false;
						});
						const fire = (type) =>
							control.evaluate((n, type) => {
								const r = n.getBoundingClientRect();
								n.dispatchEvent(
									new PointerEvent(type, {
										pointerId: 1,
										pointerType: 'mouse',
										isPrimary: true,
										button: 0,
										buttons: type === 'pointerup' ? 0 : 1,
										clientX: r.x + r.width / 2,
										clientY: r.y + r.height / 2,
										bubbles: true,
										cancelable: true
									})
								);
							}, type);
						await fire('pointerdown');
						for (let i = 0; i < 55; i++) {
							if ([5, 12].includes(i)) await fire('pointerup');
							if (i === 9) await fire('pointerdown');
							await advance(p);
							scales.push(
								await control.evaluate(
									(n) => new DOMMatrixReadOnly(getComputedStyle(n).transform).m11
								)
							);
						}
					}
					out.runs.push({ id, samples, scales, widths, paint });
					console.log(id, 'captured');
					await p.close();
				}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local'));
		const c = { id: a.id, y: 0, opacity: 0 };
		for (let i = 0; i < a.samples.length && !a.id.includes('carry'); i++) {
			assert.equal(a.samples[i].length, b.samples[i].length, 'same digit nodes');
			for (let j = 0; j < a.samples[i].length; j++)
				for (const k of ['y', 'opacity'])
					if (k === 'opacity' || Math.max(a.samples[i][j].opacity, b.samples[i][j].opacity) > 0.001)
						c[k] = Math.max(c[k], Math.abs(a.samples[i][j][k] - b.samples[i][j][k]));
		}
		if (a.scales?.length) {
			c.scale = Math.max(...a.scales.map((v, i) => Math.abs(v - b.scales[i])));
			assert.ok(c.scale < 0.001, `thumb scale ${c.scale}`);
		}
		c.width = Math.max(
			...a.widths.flatMap((w, i) => {
				assert.equal(w.length, b.widths[i].length, 'same number groups');
				return w.map((v, j) => Math.abs(v - b.widths[i][j]));
			})
		);
		assert.ok(c.width <= 1 / 64, `${a.id} columns ${c.width}`);
		c.painted = 0;
		c.alpha = 0;
		for (let i = 0; i < a.paint.length; i++) {
			const local = b.paint[i].slice();
			assert.equal(a.paint[i].length, local.length, `${a.id} painted glyph count frame ${i}`);
			for (const g of a.paint[i]) {
				const candidates = local
					.map((n, index) => ({ n, index }))
					.filter((x) => x.n.text === g.text)
					.sort(
						(x, y) =>
							Math.abs(x.n.x - g.x) +
							Math.abs(x.n.y - g.y) -
							(Math.abs(y.n.x - g.x) + Math.abs(y.n.y - g.y))
					);
				assert.ok(candidates.length, 'same painted digits');
				const match = candidates[0];
				local.splice(match.index, 1);
				for (const key of ['x', 'y', 'w', 'h'])
					c.painted = Math.max(c.painted, Math.abs(g[key] - match.n[key]));
				c.alpha = Math.max(c.alpha, Math.abs(g.alpha - match.n.alpha));
			}
		}
		console.log('painted', c);
		assert.ok(c.painted <= 1 / 64, `${a.id} painted geometry ${c.painted}`);
		assert.ok(c.alpha < 0.001, `${a.id} alpha ${c.alpha}`);
		out.comparisons.push(c);
		console.log(c);
		assert.ok(c.y < 0.001);
		assert.ok(c.opacity < 0.001);
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-digit-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
