// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExpandingButtonGroup } from '../../../reference/arc-library/registry/components/expanding-button-group/expanding-button-group';
import '../../../src/lib/foundation.css';
import '../../../src/app.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
const defaults = {
	items: [
		{ id: 'a', label: 'Alpha', doneLabel: 'Archived' },
		{ id: 'b', label: 'Beta long', doneLabel: 'Done' },
		{ id: 'c', label: 'Delete', doneLabel: 'Deleted', tone: 'danger' }
	],
	label: 'Fixture actions',
	size: 'md',
	defaultExpanded: null,
	confirmDuration: 1400
};
function App() {
	const [config, setConfig] = useState(defaults),
		[visible, setVisible] = useState(true);
	const api = (window.ebg ??= { events: [], pending: {} });
	api.configure = (next) => setConfig((c) => ({ ...c, ...next }));
	api.visible = setVisible;
	api.clear = () => {
		api.events = [];
	};
	const items = config.items.map((item) => ({
		...item,
		icon: item.emptyIcon ? null : (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<path d="M4 12h16M12 4v16" />
			</svg>
		),
		onSelect: item.result
			? () => {
					api.events.push('select:' + item.id);
					if (item.result === 'false') return false;
					if (item.result === 'throw') throw Error('expected');
					if (item.result === 'true') return true;
					if (item.result === 'promise')
						return new Promise((resolve, reject) => (api.pending[item.id] = { resolve, reject }));
				}
			: undefined
	}));
	return (
		<>
			<button id="before">Before</button>
			<div id="mount">
				{visible && (
					<ExpandingButtonGroup
						{...config}
						items={items}
						className="custom-group"
						style={{ '--probe': '7' }}
						onAction={config.omitAction ? undefined : (id) => api.events.push('action:' + id)}
					/>
				)}
			</div>
			<button id="after">After</button>
		</>
	);
}
createRoot(document.getElementById('app')).render(<App />);
