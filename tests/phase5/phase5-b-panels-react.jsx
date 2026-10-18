// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
	ResizablePanels,
	ResizablePanel
} from '../../reference/arc-library/registry/components/resizable-panels/resizable-panels';
import { cases } from './phase5-b-panels-data.js';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
import '../../src/lib/foundation.css';
import '../../src/app.css';
const params = new URLSearchParams(location.search),
	scenario = params.get('case') || 'collapse';
function Fixture() {
	const [width, setWidth] = useState(Number(params.get('width') || 600)),
		[shown, setShown] = useState(true);
	useEffect(() => {
		window.logs = [];
		window.fixture = { resize: setWidth, remove: () => setShown(false) };
		return () => {
			delete window.fixture;
		};
	}, []);
	return (
		<>
			<div id="fixture" style={{ width, height: 240, margin: 24 }}>
				{shown && (
					<ResizablePanels
						label="Fixture panels"
						className="custom-group"
						onLayoutChange={(values) => window.logs.push(values)}
					>
						{cases[scenario].map((p, i) => (
							<ResizablePanel key={p.id} {...p} className={`custom-pane${i === 0 ? ' first' : ''}`}>
								<div style={{ padding: 16, height: '100%' }}>
									<p>{p.label}</p>
									<button id={`button-${p.id}`}>Focusable {p.label}</button>
									<p>Content stays anchored and clipped while resizing.</p>
								</div>
							</ResizablePanel>
						))}
					</ResizablePanels>
				)}
			</div>
			<div id="standalone">
				<ResizablePanel id="standalone-panel" label="Standalone" defaultSize={1}>
					<span>Standalone content</span>
				</ResizablePanel>
			</div>
		</>
	);
}
createRoot(document.getElementById('app')).render(<Fixture />);
