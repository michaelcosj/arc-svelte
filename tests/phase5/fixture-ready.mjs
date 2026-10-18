// @ts-nocheck -- Playwright fixture readiness is checked at runtime.
import { expect } from './dependencies/node_modules/playwright/test.mjs';

/** Poll from Node: a fixture can finish loading while the browser's RAF clock is paused. */
export async function waitForFixture(page) {
	await expect
		.poll(() => page.evaluate(() => Boolean(window.fixture)), { timeout: 10000 })
		.toBe(true);
}
