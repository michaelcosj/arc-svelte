import type { TreeNode, VisibleNode } from './types';

export function flattenTree(
	nodes: TreeNode[],
	expanded: ReadonlySet<string>,
	depth = 1,
	parentId?: string
): VisibleNode[] {
	return nodes.flatMap((node, index) => [
		{ node, depth, parentId, position: index + 1, setSize: nodes.length },
		...(node.children && expanded.has(node.id)
			? flattenTree(node.children, expanded, depth + 1, node.id)
			: [])
	]);
}

export function fileTone(label: string) {
	const name = label.toLowerCase();
	if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'typescript';
	if (name.endsWith('.css')) return 'stylesheet';
	if (name.endsWith('.md')) return 'markdown';
	if (name.endsWith('.json')) return 'json';
	return 'file';
}
