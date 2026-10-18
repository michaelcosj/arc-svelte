// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CardStack } from '../../reference/arc-library/registry/components/card-stack/card-stack';
import '../../src/lib/foundation.css';
import '../../src/app.css';
const events = [];
window.cardEvents = events;
createRoot(document.getElementById('app')).render(
	<CardStack
		items={['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta']}
		getKey={(x) => x}
		getLabel={(x) => x}
		renderCard={(x) => (
			<div data-item={x} style={{ padding: 24 }}>
				{x}
				<input aria-label="Nested" />
			</div>
		)}
		onDecide={(x, d) => events.push(['decide', x, d])}
		onUndo={(x, d) => events.push(['undo', x, d])}
		onReset={() => events.push(['reset'])}
	/>
);
