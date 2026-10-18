// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
import { start } from './server.mjs';
import { chromium } from '../dependencies/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const s = await start(),
	b = await chromium.launch(),
	out = {};
const timer = setTimeout(() => process.exit(2), 150000);
try {
	await s.listen();
	for (const reduced of [false, true])
		for (const ref of [true, false]) {
			const id = `${ref ? 'ref' : 'local'}-${reduced ? 'reduced' : 'normal'}`,
				p = await b.newPage({
					viewport: { width: 1280, height: 900 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				});
			const errors = [];
			p.on('pageerror', (e) => errors.push(e.message));
			await p.goto('http://127.0.0.1:5221/ebg-' + (ref ? 'ref' : 'local'));
			await p.waitForFunction(() => window.ebg && document.querySelector('[data-ebg-item]'));
			await p.evaluate(() => document.fonts.ready);
			await p.waitForTimeout(700);
			const capture = async (mode) =>
				p.evaluate(async (mode) => {
					const group = document.querySelector('[role=toolbar]'),
						buttons = [...group.querySelectorAll('button')];
					const part = (n, k) => n.querySelector(`[class*="_${k}"]`);
					const style = (n) => {
						if (!n) return null;
						const s = getComputedStyle(n),
							m = new DOMMatrix(s.transform === 'none' ? undefined : s.transform);
						return {
							opacity: +s.opacity,
							x: m.e,
							y: m.f,
							scale: m.a,
							blur: parseFloat(s.filter.match(/[\d.]+/)?.[0] ?? '0'),
							dash: s.strokeDashoffset,
							dasharray: s.strokeDasharray,
							color: s.color,
							bg: s.backgroundColor
						};
					};
					const read = () =>
						buttons.map((n, index) => ({
							width: n.getBoundingClientRect().width,
							expanded: n.hasAttribute('data-expanded'),
							state: n.dataset.state,
							label: style(part(n, 'label')),
							icon: style(part(n, 'icon')),
							glyphs: [...n.querySelectorAll('[class*="_glyph"]')].map((node) => ({
								...style(node),
								original: node === originals[index].glyph,
								check: !!node.querySelector('path[d="M4 12.5l5 5L20 6.5"]')
							})),
							words: [...n.querySelectorAll('[class*="_word"]')].map((node) => ({
								...style(node),
								original: node === originals[index].word,
								text: node.textContent
							})),
							check: style(n.querySelector('path[d="M4 12.5l5 5L20 6.5"]'))
						}));
					const originals = buttons.map((n) => ({
						glyph: part(n, 'glyph'),
						word: part(n, 'word')
					}));
					const data = [];
					let begin;
					await new Promise((resolve) => {
						requestAnimationFrame((t) => {
							begin = t;
							if (mode === 'hover' || mode === 'reverse') {
								buttons[1].dispatchEvent(
									new PointerEvent('pointermove', {
										bubbles: true,
										pointerType: 'mouse',
										clientX: buttons[1].getBoundingClientRect().x + 12,
										clientY: buttons[1].getBoundingClientRect().y + 12
									})
								);
							} else buttons[1].click();
							data.push({ t: 0, values: read() });
							let reversed = false;
							const step = (t) => {
								const elapsed = t - begin;
								if (mode === 'reverse' && elapsed >= 80 && !reversed) {
									reversed = true;
									group.dispatchEvent(
										new PointerEvent('pointerout', {
											bubbles: true,
											pointerType: 'mouse',
											relatedTarget: document.body
										})
									);
									group.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
								}
								data.push({ t: elapsed, values: read() });
								if (elapsed < (mode === 'confirm-reset' ? 1750 : 850)) requestAnimationFrame(step);
								else resolve();
							};
							requestAnimationFrame(step);
						});
					});
					return data;
				}, mode);
			out[id] = {};
			for (const mode of [
				'hover',
				'reverse',
				'confirm',
				'confirm-reset',
				'fast-confirm',
				'zero-confirm',
				'busy'
			]) {
				await p.evaluate((mode) => {
					window.ebg.visible(false);
					window.ebg.configure({
						confirmDuration: mode === 'fast-confirm' ? 75 : mode === 'zero-confirm' ? 0 : 1400,
						items: [
							{ id: 'a', label: 'Alpha', doneLabel: 'Archived' },
							{
								id: 'b',
								label: 'Beta long',
								doneLabel: 'Done',
								result: mode === 'busy' ? 'promise' : undefined
							},
							{ id: 'c', label: 'Delete', doneLabel: 'Deleted', tone: 'danger' }
						]
					});
				}, mode);
				await p.waitForTimeout(30);
				await p.evaluate(() => window.ebg.visible(true));
				await p.waitForTimeout(550);
				out[id][mode] = await capture(mode);
			}
			if (errors.length) throw new Error(errors.join('\n'));
			await p.screenshot({ path: `handoff/motion-ebg-fix-${id}-timing.png` });
			await p.close();
		}
	writeFileSync(
		process.argv[2] ?? 'handoff/motion-ebg-fix-after.json',
		JSON.stringify(out, null, 2)
	);
	console.log('captured', Object.keys(out));
} finally {
	clearTimeout(timer);
	await b.close();
	await s.close();
}
