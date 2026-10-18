// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
import { start } from './server.mjs';
import { chromium } from '../dependencies/node_modules/playwright/index.mjs';
const s = await start(),
	b = await chromium.launch();
try {
	await s.listen();
	const p = await b.newPage();
	await p.goto('http://127.0.0.1:5221/ebg-ref');
	await p.waitForTimeout(1600);
	await p.evaluate(() => {
		window.ani = [];
		// eslint-disable-next-line typescript/unbound-method -- Invoked with the original receiver via call below.
		const orig = Element.prototype.animate;
		Element.prototype.animate = function (k, o) {
			window.ani.push({ class: this.className, k, o });
			return orig.call(this, k, o);
		};
		document.querySelectorAll('[data-ebg-item]')[1].click();
	});
	await p.waitForTimeout(400);
	console.log(JSON.stringify(await p.evaluate(() => window.ani), null, 2));
} finally {
	await b.close();
	await s.close();
}
