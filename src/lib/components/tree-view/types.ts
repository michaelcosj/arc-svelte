import type { Snippet } from 'svelte';

export interface TreeNode {
	id: string;
	label: string;
	children?: TreeNode[];
	icon?: Snippet;
}

export interface TreeViewProps {
	nodes: TreeNode[];
	defaultExpandedIds?: string[];
	expandedIds?: string[];
	onExpandedChange?: (expandedIds: string[]) => void;
	onSelect?: (node: TreeNode) => void;
	'aria-label'?: string;
}

export interface VisibleNode {
	node: TreeNode;
	depth: number;
	parentId?: string;
	position: number;
	setSize: number;
}
