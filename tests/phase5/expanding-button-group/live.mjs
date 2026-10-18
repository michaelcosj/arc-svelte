// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
import { start } from './server.mjs';
import { capture } from './capture.mjs';
import { chromium } from '../dependencies/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const s = await start(),
	b = await chromium.launch(),
	out = {};
const deadline = setTimeout(() => process.exit(2), 130000);
const items = [
	{ id: 'reply', label: 'Reply', doneLabel: 'Replied' },
	{ id: 'forward', label: 'Forward', doneLabel: 'Forwarded' },
	{ id: 'archive', label: 'Archive', doneLabel: 'Archived' },
	{ id: 'snooze', label: 'Snooze', doneLabel: 'Snoozed' },
	{ id: 'delete', label: 'Delete', doneLabel: 'Deleted', tone: 'danger' }
];
try {
	await s.listen();
	for (const reduced of [false, true])
		for (const live of [true, false]) {
			const tag = `${live ? 'live' : 'local'}-${reduced ? 'reduced' : 'normal'}`,
				p = await b.newPage({
					viewport: { width: 1280, height: 900 },
					reducedMotion: reduced ? 'reduce' : 'no-preference'
				}),
				errors = [];
			p.on('pageerror', (e) => errors.push(e.message));
			const response = await p.goto(
				live
					? 'https://uiarc.dev/components/expanding-button-group'
					: 'http://127.0.0.1:5221/ebg-local',
				{ waitUntil: 'domcontentloaded' }
			);
			assert.equal(response.status(), 200);
			await p.waitForTimeout(live ? 17000 : 1000);
			if (!live) {
				await p.evaluate((items) => window.ebg.configure({ items }), items);
				await p.waitForTimeout(600);
			}
			await p.evaluate(() => document.fonts.ready);
			const group = p.getByRole('toolbar').first();
			await group.getByRole('button', { name: 'Reply', exact: true }).focus();
			await p.keyboard.press('End');
			assert.equal(
				await group
					.getByRole('button', { name: 'Delete', exact: true })
					.evaluate((n) => n === document.activeElement),
				true
			);
			await p.keyboard.press('Home');
			await group.getByRole('button', { name: 'Reply', exact: true }).blur();
			await group.scrollIntoViewIfNeeded();
			await p.mouse.move(0, 0);
			await p.waitForTimeout(700);
			const result = {
				status: response.status(),
				hydrated: true,
				errors,
				hover: await capture(p, 'hover')
			};
			await group.screenshot({
				path: `handoff/motion-ebg-fix-${process.env.EBG_BASELINE === '1' ? 'baseline-' : ''}${tag}-hover.png`
			});
			await p.evaluate(() => {
				const group = document.querySelector('[role=toolbar]');
				group.dispatchEvent(
					new PointerEvent('pointerout', {
						bubbles: true,
						pointerType: 'mouse',
						relatedTarget: document.body
					})
				);
				group.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
			});
			await p.waitForTimeout(700);
			result.reverse = await capture(p, 'reverse');
			await p.waitForTimeout(700);
			result.confirm = await capture(p, 'confirm');
			await group.screenshot({
				path: `handoff/motion-ebg-fix-${process.env.EBG_BASELINE === '1' ? 'baseline-' : ''}${tag}-confirm.png`
			});
			await p.waitForTimeout(1700);
			result.interrupt = await capture(p, 'interrupt');
			assert(
				result.interrupt.some((frame) => frame.values[1].state === 'done'),
				tag + ' interrupted confirmation started'
			);
			assert.equal(
				result.interrupt.at(-1).values[1].state,
				'idle',
				tag + ' interrupted confirmation reset'
			);
			assert(
				result.interrupt.some(
					(frame) =>
						frame.t > 75 &&
						frame.values[1].glyphs.length === 2 &&
						frame.values[1].glyphs.some((g) => g.opacity > 0 && g.opacity < 1)
				),
				tag + ' interrupted glyphs painted'
			);
			await p.waitForTimeout(1700);
			// Native mouse input is required to exercise :active press styles.
			const reply = group.getByRole('button', { name: 'Reply', exact: true });
			await reply.hover();
			await p.waitForTimeout(700);
			await p.evaluate(() => {
				const button = document.querySelector('[data-ebg-item]'),
					icon = button.querySelector('[class*="_icon"]');
				window.pressFrames = [];
				window.pressStart = null;
				window.releaseStart = null;
				button.addEventListener('pointerdown', () => (window.pressStart = performance.now()), {
					once: true
				});
				button.addEventListener('pointerup', () => (window.releaseStart = performance.now()), {
					once: true
				});
				window.pressDone = false;
				const step = (t) => {
					const st = getComputedStyle(icon);
					window.pressFrames.push({
						t,
						press: window.pressStart,
						release: window.releaseStart,
						scale: new DOMMatrix(st.transform === 'none' ? undefined : st.transform).a
					});
					if (!window.pressDone) requestAnimationFrame(step);
				};
				requestAnimationFrame(step);
			});
			await p.mouse.down();
			await p.waitForTimeout(160);
			await p.mouse.up();
			await p.waitForTimeout(500);
			result.press = await p.evaluate(() => {
				window.pressDone = true;
				return window.pressFrames;
			});
			out[tag] = result;
			assert.deepEqual(errors, []);
			console.log(tag, 'PASS');
			await p.close();
		}
	writeFileSync(
		process.argv[2] ?? 'handoff/motion-ebg-fix-live.json',
		JSON.stringify(out, null, 2)
	);
} finally {
	clearTimeout(deadline);
	await b.close();
	await s.close();
}
