import assert from 'node:assert/strict';
/**
 * @typedef {{id:string,x:number,y:number,angle:number,top:boolean,flying:boolean,drag:boolean,stamps:number[]}} CardFrame
 * @typedef {{cards:CardFrame[]}} Frame
 */
/**
 * Compare every painted frame, including transient membership, not just destinations.
 * @param {Frame[]} source
 * @param {Frame[]} local
 * @param {string} name
 */
export function assertPairedFrames(source, local, name) {
	assert.equal(source.length, local.length, name + ' frame count');
	for (let i = 0; i < source.length; i++) {
		assert.deepEqual(
			source[i].cards.map((c) => c.id),
			local[i].cards.map((c) => c.id),
			name + ' frame membership ' + i
		);
		for (const a of source[i].cards) {
			const b = local[i].cards.find((b) => b.id === a.id);
			assert.ok(b, name + ' card presence ' + a.id);
			assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.6, name + ' position ' + a.id + ' frame ' + i);
			assert.ok(Math.abs(a.angle - b.angle) < 0.04, name + ' rotation ' + a.id + ' frame ' + i);
			a.stamps.forEach((stamp, j) =>
				assert.ok(Math.abs(stamp - b.stamps[j]) < 0.008, name + ' stamp ' + a.id + ' frame ' + i)
			);
			assert.equal(a.top, b.top, name + ' interactive top');
			assert.equal(a.flying, b.flying, name + ' flying state');
			assert.equal(a.drag, b.drag, name + ' dragging state');
		}
	}
}
