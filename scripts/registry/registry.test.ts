import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { createRegistry, moduleReferences } from './build.mjs';
import path from 'node:path';

describe('installable registry payloads', () => {
	let items: Awaited<ReturnType<typeof createRegistry>>['items'];
	beforeAll(async () => {
		({ items } = await createRegistry());
	}, 30000);

	it('includes every component through the all item and retains the MIT notices', () => {
		const components = items.filter((item) => item.type === 'registry:ui');
		expect(components.length).toBeGreaterThanOrEqual(96);
		expect(
			[...(items.find((item) => item.name === 'all')!.registryDependencies ?? [])].sort((a, b) =>
				a.localeCompare(b)
			)
		).toEqual(components.map((item) => `./${item.name}.json`).sort((a, b) => a.localeCompare(b)));
		const core = items.find((item) => item.name === 'arc-core')!;
		expect(core.files!.find((file) => file.target === 'arc/LICENSE.txt')!.content).toContain(
			'Elia Kuratli'
		);
		expect(core.files!.some((file) => file.target === 'arc/styles.css')).toBe(true);
	});

	it('resolves every transplanted import using only that item’s dependency closure', () => {
		const byName = new Map(items.map((item) => [item.name, item]));
		// Parse shared files once, but resolve each component's closure independently.
		const referenceCache = new Map<string, ReturnType<typeof moduleReferences>>();
		for (const root of items) {
			const seen = new Set<string>();
			const files = new Map<string, string>();
			const visit = (name: string) => {
				if (seen.has(name)) return;
				seen.add(name);
				const item = byName.get(name);
				expect(item, `missing ${name} required by ${root.name}`).toBeDefined();
				for (const dep of item!.registryDependencies ?? []) {
					expect(dep).toMatch(/^\.\/[\w-]+\.json$/);
					visit(dep.slice(2, -5));
				}
				for (const file of item!.files ?? []) {
					expect(file.target).toMatch(/^arc\//);
					expect(file.target).not.toMatch(
						/\.\.\/|\.test\.|\.spec\.|node_modules|reference|handoff/
					);
					if (files.has(file.target)) expect(file.content).toBe(files.get(file.target));
					files.set(file.target, file.content);
				}
			};
			visit(root.name);
			for (const [filename, content] of files) {
				let references = referenceCache.get(filename);
				if (!references) {
					references = moduleReferences(content, filename);
					referenceCache.set(filename, references);
				}
				for (const { specifier } of references) {
					expect(specifier, filename).not.toMatch(/^[#$]/);
					if (specifier.startsWith('.')) {
						const target = path.posix.normalize(
							path.posix.join(path.posix.dirname(filename), specifier)
						);
						expect(files.has(target), `${root.name}: ${filename} -> ${specifier}`).toBe(true);
					}
				}
			}
		}
	}, 30000);

	it('recognizes module references without modifying unrelated strings or comments', () => {
		const code = `<script lang="ts">// import '#arc/fake';\nimport { Button } from '#arc/button';\ntype T = import('./types').T;\nconst text = '#lib/not-an-import';</script><p>#arc/still-not-an-import</p>`;
		expect(
			moduleReferences(code, 'Example.svelte').map((ref) => code.slice(ref.start, ref.end))
		).toEqual(['#arc/button', './types']);
	});
});
