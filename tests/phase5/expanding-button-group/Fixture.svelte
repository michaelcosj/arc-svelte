<script lang="ts">
	import { ExpandingButtonGroup } from '#arc/expanding-button-group';
	import type {
		ExpandingButtonGroupProps,
		ExpandingButtonGroupItem
	} from '../../../src/lib/components/expanding-button-group/types';
	type FixtureItem = Omit<ExpandingButtonGroupItem, 'icon' | 'onSelect'> & {
		emptyIcon?: boolean;
		result?: string;
	};
	type Config = Omit<ExpandingButtonGroupProps, 'items'> & {
		items: FixtureItem[];
		omitAction?: boolean;
	};
	import '../../../src/lib/foundation.css';
	import '../../../src/app.css';
	import '@fontsource-variable/inter';
	import '@fontsource-variable/geist';
	let config = $state<Config>({
			items: [
				{ id: 'a', label: 'Alpha', doneLabel: 'Archived' },
				{ id: 'b', label: 'Beta long', doneLabel: 'Done' },
				{ id: 'c', label: 'Delete', doneLabel: 'Deleted', tone: 'danger' }
			],
			label: 'Fixture actions',
			size: 'md',
			defaultExpanded: null,
			confirmDuration: 1400
		}),
		visible = $state(true);
	const api = {
		events: [] as string[],
		pending: {} as Record<
			string,
			{ resolve: (value?: void | boolean) => void; reject: (reason?: unknown) => void }
		>,
		configure: (next: Partial<Config>) => {
			config = { ...config, ...next };
		},
		visible: (next: boolean) => {
			visible = next;
		},
		clear: () => {
			api.events = [];
		}
	};
	Object.assign(window, { ebg: api });
	const items = $derived(
		config.items.map((item) => ({
			...item,
			// eslint-disable-next-line no-undef -- Snippets are declared in the template below.
			icon: item.emptyIcon ? empty : icon,
			onSelect: item.result
				? () => {
						api.events.push('select:' + item.id);
						if (item.result === 'false') return false;
						if (item.result === 'throw') throw Error('expected');
						if (item.result === 'true') return true;
						if (item.result === 'promise')
							return new Promise<void | boolean>(
								(resolve, reject) => (api.pending[item.id] = { resolve, reject })
							);
					}
				: undefined
		}))
	);
</script>

{#snippet icon()}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
		><path d="M4 12h16M12 4v16" /></svg
	>{/snippet}{#snippet empty()}{/snippet}
<button id="before">Before</button>
<div id="mount">
	{#if visible}<ExpandingButtonGroup
			{items}
			label={config.label}
			size={config.size}
			defaultExpanded={config.defaultExpanded}
			confirmDuration={config.confirmDuration}
			class="custom-group"
			style="--probe:7"
			onAction={config.omitAction ? undefined : (id) => api.events.push('action:' + id)}
		/>{/if}
</div>
<button id="after">After</button>
