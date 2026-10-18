// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { server } from './phase5-panels-final-server.mjs';
import { chromium } from './dependencies/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const report = { runs: [], errors: [] };
let browser;
const timer = setTimeout(() => process.exit(1), 90000);
try {
	await server.listen();
	browser = await chromium.launch();
	for (const { width, reduced, trial, direction = 'after' } of [
		...[1, 2, 3].map((trial) => ({ width: 230, reduced: false, trial })),
		{ width: 600, reduced: false, trial: 1 },
		{ width: 230, reduced: true, trial: 1 },
		{ width: 230, reduced: false, trial: 1, direction: 'before' },
		{ width: 230, reduced: true, trial: 1, direction: 'before' }
	])
		for (const ref of [true, false]) {
			const page = await browser.newPage({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
			page.on('pageerror', (e) => report.errors.push(e.message));
			const run = { width, reduced, trial, direction, ref };
			try {
				await page.goto(`http://127.0.0.1:5217/panels-final?ref=${ref}&case=narrow&width=${width}`);
				await page.waitForFunction(() => window.fixture);
				await page.waitForTimeout(150);
				const h = page.getByRole('separator');
				await h.focus();
				const read = () =>
					page.evaluate(() => {
						const g = document.querySelector('[role=group]');
						return {
							widths: [...g.children]
								.filter((n) => n.id)
								.map((n) => n.getBoundingClientRect().width),
							free: [...g.children].filter((n) => n.id).map((n) => n.hasAttribute('data-free')),
							hidden: g.querySelector('[role=separator]').dataset.collapsed ?? null,
							aria: g.querySelector('[role=separator]').getAttribute('aria-valuenow'),
							callbacks: structuredClone(window.logs)
						};
					});
				await h.press('Enter');
				await page.waitForTimeout(1000);
				if (direction === 'before') {
					await h.press('ArrowRight');
					await page.waitForTimeout(1000);
					await h.press('ArrowRight');
					await page.waitForTimeout(1000);
				}
				run.start = await read();
				run.steps = [];
				for (let i = 0; i < 3; i++) {
					await h.press(direction === 'after' ? 'ArrowRight' : 'ArrowLeft');
					await page.waitForTimeout(20);
					run.steps.push(await read());
				}
				await page.waitForTimeout(1500);
				run.final = await read();
				if (width === 600) {
					assert.ok(Math.abs(run.final.widths[0] - 172) < 0.6);
					assert.equal(run.final.hidden, null);
					run.outcome = 'settled';
				} else if (reduced || !ref) {
					assert.equal(run.final.widths[0], direction === 'after' ? 229 : 0);
					assert.equal(run.final.hidden, direction);
					if (!ref) assert.ok(run.final.free.every((v) => !v));
					assert.ok(run.final.callbacks.length > run.start.callbacks.length);
					run.outcome = reduced
						? 'instant destination matches'
						: 'FIXED: collapse reaches destination and releases CSS limits';
				} else {
					assert.equal(run.final.hidden, direction);
					assert.ok(run.final.widths[0] > 0 && run.final.widths[0] < 229);
					assert.ok(run.final.free.every(Boolean));
					assert.equal(run.final.callbacks.length, run.start.callbacks.length);
					run.outcome = 'Upstream defect reproduced: canceled collapse, no settlement callback';
				}
				run.assertionsPassed = true;
			} catch (e) {
				run.assertionsPassed = false;
				run.error = e.stack;
				process.exitCode = 1;
			}
			report.runs.push(run);
			await page.close();
		}
	assert.deepEqual(report.errors, []);
} finally {
	await fs.writeFile('handoff/phase5-panels-key-regression.json', JSON.stringify(report, null, 2));
	console.log(
		report.runs.map(
			({ width, reduced, trial, direction, ref, assertionsPassed, outcome, final }) => ({
				width,
				reduced,
				trial,
				direction,
				ref,
				assertionsPassed,
				outcome,
				final
			})
		)
	);
	clearTimeout(timer);
	await browser?.close();
	await server.close();
}
