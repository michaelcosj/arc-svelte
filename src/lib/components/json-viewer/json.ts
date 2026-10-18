import type { JsonValueType } from './types';

const IDENT = /^[A-Za-z_$][\w$]*$/;

export function typeOf(value: unknown): JsonValueType {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	switch (typeof value) {
		case 'object':
			return 'object';
		case 'string':
			return 'string';
		case 'number':
		case 'bigint':
			return 'number';
		case 'boolean':
			return 'boolean';
		default:
			return 'other';
	}
}
export const isBranch = (type: JsonValueType) => type === 'object' || type === 'array';
export function entries(value: unknown): [string | number, unknown][] {
	if (Array.isArray(value)) return value.map((item, index) => [index, item]);
	if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>);
	return [];
}
export const childPath = (parent: string, key: string | number) =>
	typeof key === 'number'
		? `${parent}[${key}]`
		: IDENT.test(key)
			? `${parent}.${key}`
			: `${parent}[${JSON.stringify(key)}]`;
export const within = (ancestor: string, id: string) =>
	id === ancestor || id.startsWith(`${ancestor}.`) || id.startsWith(`${ancestor}[`);

export function primitiveText(value: unknown, type: JsonValueType) {
	if (type === 'string') return value as string;
	if (type === 'null') return 'null';
	return String(value);
}
export function copyText(value: unknown, type: JsonValueType) {
	if (type === 'string') return value as string;
	if (isBranch(type)) return JSON.stringify(value, null, 2);
	return primitiveText(value, type);
}
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
export const countLabel = (row: { type: JsonValueType; count: number }) =>
	row.type === 'array' ? plural(row.count, 'item', 'items') : plural(row.count, 'key', 'keys');

/** Every container path, for expand all. */
export function allBranches(data: unknown, rootName: string) {
	const out: string[] = [];
	const visit = (value: unknown, id: string) => {
		if (!isBranch(typeOf(value))) return;
		out.push(id);
		for (const [key, child] of entries(value)) visit(child, childPath(id, key));
	};
	visit(data, rootName);
	return out;
}
export function branchesToDepth(data: unknown, rootName: string, depth: number) {
	const out: string[] = [];
	const visit = (value: unknown, id: string, level: number) => {
		if (level >= depth || !isBranch(typeOf(value))) return;
		out.push(id);
		for (const [key, child] of entries(value)) visit(child, childPath(id, key), level + 1);
	};
	visit(data, rootName, 0);
	return out;
}

type SearchResult = { matches: string[]; ancestors: Set<string>; needed: Map<string, number> };
/** Finds keys and primitive values that contain the query, the branches that hold them, and how far each page must reach. */
export function searchJson(data: unknown, rootName: string, needle: string): SearchResult {
	const matches: string[] = [];
	const ancestors = new Set<string>();
	const needed = new Map<string, number>();
	const frames: [string, number][] = [];
	const visit = (value: unknown, id: string, name: string | number | null) => {
		if (matches.length >= 2000) return;
		const type = typeOf(value);
		const keyHit = typeof name === 'string' && name.toLowerCase().includes(needle);
		const valueHit = !isBranch(type) && primitiveText(value, type).toLowerCase().includes(needle);
		if (keyHit || valueHit) {
			matches.push(id);
			for (const [frame, index] of frames) {
				ancestors.add(frame);
				needed.set(frame, Math.max(needed.get(frame) ?? 0, index + 1));
			}
		}
		if (!isBranch(type)) return;
		entries(value).forEach(([key, child], index) => {
			frames.push([id, index]);
			visit(child, childPath(id, key), key);
			frames.pop();
		});
	};
	visit(data, rootName, null);
	return { matches, ancestors, needed };
}
