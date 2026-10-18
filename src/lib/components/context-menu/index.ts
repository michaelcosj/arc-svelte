import { createRawSnippet } from 'svelte';
import type { ContextMenuItem } from './types';

export { default as ContextMenu } from './ContextMenu.svelte';
export type { ContextMenuItem, ContextMenuProps } from './types';

const exampleIcon = (content: string) =>
	createRawSnippet(() => ({
		render: () =>
			`<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`
	}));

export const contextMenuExampleItems: ContextMenuItem[] = [
	{
		id: 'copy',
		label: 'Copy link',
		icon: exampleIcon(
			'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>'
		)
	},
	{
		id: 'delete',
		label: 'Delete project',
		icon: exampleIcon(
			'<path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
		),
		destructive: true
	}
];
