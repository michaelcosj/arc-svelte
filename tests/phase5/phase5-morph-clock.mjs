// @ts-nocheck -- Dynamic source/local browser geometry is asserted at runtime.
import { server } from './phase5-morph-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import { installAnimationClock, installResizeClock, advance } from './phase5-animation-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = { runs: [], comparisons: [], errors: [] };
let browser;
try {
	await server.listen();
	browser = await chromium.launch();
	for (const kind of ['confirm', 'money', 'phone', 'editor'])
		for (const reduced of [false, true])
			for (const ref of [true, false]) {
				const id = `${kind}-${reduced ? 'reduced' : 'normal'}-${ref ? 'source' : 'local'}`;
				if (process.argv[2] && !id.includes(process.argv[2])) continue;
				const p = await browser.newPage({
					viewport: { width: 900, height: 800 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
				p.on('pageerror', (e) => out.errors.push({ id, error: e.message }));
				await installAnimationClock(p);
				await installResizeClock(p);
				await p.clock.install({ time: new Date('2026-01-01') });
				await p.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
				await p.goto(`http://127.0.0.1:5226/phase5-morph?kind=${kind}&ref=${ref}`);
				await p.waitForFunction(() => window.morph);
				await p.evaluate(() => document.fonts.ready);
				await p.evaluate(() => window.flushResizeObservers());
				for (let frame = 0; frame < 8; frame++) await advance(p);
				await advance(p, 1500);
				for (let frame = 0; frame < 4; frame++) await advance(p);
				const now = await p.evaluate(() => performance.now());
				await p.clock.fastForward(Math.ceil((now + 1) / 4096) * 4096 - now);
				await p.evaluate(() => {
					window.advanceAnimations();
					window.flushResizeObservers();
				});
				const read = () =>
					p.evaluate((kind) => {
						const box = (selector, keys = ['width', 'height']) => {
							const n = document.querySelector(selector);
							if (!n) return null;
							const s = getComputedStyle(n),
								rect = n.getBoundingClientRect(),
								v = {};
							for (const k of keys)
								v[k] = k === 'width' || k === 'height' ? rect[k] : parseFloat(s[k]) || 0;
							return v;
						};
						if (kind === 'confirm') return box('[data-mode]', ['width']);
						if (kind === 'phone')
							return {
								...box('[class*="_anchor"]'),
								...Object.fromEntries(
									Object.entries(
										box('[class*="_shape"]', ['width', 'height', 'borderTopLeftRadius']) ?? {}
									).map(([k, v]) => ['shape' + k, v])
								)
							};
						if (kind === 'money') {
							const n = document.querySelector('[class*="_highlight"]'),
								s = getComputedStyle(n),
								g = document.querySelector('[class*="_group"]');
							return {
								y: new DOMMatrixReadOnly(s.transform).m42,
								height: parseFloat(s.height),
								scale: new DOMMatrixReadOnly(getComputedStyle(g).transform).m11
							};
						}
						return box('[data-toolbar]', ['width', 'height', 'left', 'top']);
					}, kind);
				if (kind === 'confirm') await p.evaluate(() => window.morph.state('confirming'));
				if (kind === 'money') {
					await p.getByRole('button', { name: /^Currency,/ }).evaluate((n) => n.click());
					for (let frame = 0; frame < 40; frame++) await advance(p);
					await p
						.getByRole('listbox')
						.dispatchEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
				}
				if (kind === 'phone')
					await p.getByRole('button', { name: /^Country,/ }).evaluate((n) => n.click());
				if (kind === 'editor') {
					await p.getByRole('textbox').evaluate((n) => {
						n.focus();
						const r = document.createRange();
						r.selectNodeContents(n.firstElementChild);
						const s = getSelection();
						s.removeAllRanges();
						s.addRange(r);
						document.dispatchEvent(new Event('selectionchange'));
					});
					for (let frame = 0; frame < 40; frame++) await advance(p);
					await p
						.getByRole('textbox')
						.dispatchEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
				}
				const samples = [];
				for (let i = 0; i < 65; i++) {
					if (kind === 'confirm' && [5, 10, 18].includes(i))
						await p.evaluate(
							(i) => window.morph.state(i === 5 ? 'idle' : i === 10 ? 'confirming' : 'done'),
							i
						);
					if (kind === 'money' && [4, 8, 14].includes(i)) {
						await p.getByRole('listbox').dispatchEvent('keydown', {
							key: i === 4 ? 'ArrowDown' : 'ArrowUp',
							bubbles: true,
							cancelable: true
						});
						await p.evaluate((i) => window.morph.amount(i === 4 ? 123456789123 : 125000), i);
					}
					if (kind === 'phone' && [6, 12].includes(i))
						await p.getByRole('combobox').fill(i === 6 ? 'kingdom' : '');
					if (kind === 'editor' && i === 6)
						await p
							.getByRole('toolbar')
							.dispatchEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
					await advance(p);
					samples.push(await read());
					if (kind === 'editor' && i === 2)
						assert.equal(
							await p.getByRole('textbox', { name: 'Link address', exact: true }).count(),
							1,
							'link face opens before reversal'
						);
				}
				out.runs.push({ id, samples });
				console.log(id, 'captured');
				await p.close();
			}
	for (const a of out.runs.filter((r) => r.id.endsWith('source'))) {
		const b = out.runs.find((r) => r.id === a.id.replace('source', 'local')),
			c = { id: a.id };
		for (let i = 0; i < a.samples.length; i++) {
			assert.equal(!!a.samples[i], !!b.samples[i], a.id + ' presence');
			if (!a.samples[i]) continue;
			for (const k of Object.keys(a.samples[i]))
				c[k] = Math.max(c[k] ?? 0, Math.abs(a.samples[i][k] - b.samples[i][k]));
		}
		assert.ok(a.samples.every(Boolean), a.id + ' visible geometry');
		const expected = a.id.startsWith('confirm')
			? 1
			: a.id.startsWith('money')
				? 3
				: a.id.startsWith('phone')
					? 5
					: 4;
		assert.ok(
			a.samples.every((s) => Object.keys(s).length === expected),
			a.id + ' measured tracks'
		);
		for (const [key, value] of Object.entries(c))
			if (key !== 'id') {
				const quantized =
					key.toLowerCase().includes('width') || key.toLowerCase().includes('height');
				assert.ok(value <= (quantized ? 1 / 64 : 0.001), `${a.id} ${key} ${value}`);
			}
		out.comparisons.push(c);
		console.log(c);
	}
	assert.deepEqual(out.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-morph-clock.json', JSON.stringify(out, null, 2));
	await browser?.close();
	await server.close();
}
