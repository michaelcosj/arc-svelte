// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { Slider } from '@/registry/components/slider/slider';
import { NumberField } from '@/registry/components/number-field/number-field';
import React, { useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HoldToConfirm } from '@/registry/components/hold-to-confirm/hold-to-confirm';
import { ElasticSlider } from '@/registry/components/elastic-slider/elastic-slider';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
import '../../src/lib/foundation.css';
import '../../src/app.css';
const query = new URLSearchParams(location.search),
	kind = query.get('kind') ?? 'slider';
document.documentElement.dataset.theme = query.get('theme') ?? 'light';
function Fixture() {
	const [p, setP] = useState(JSON.parse(query.get('props') ?? '{}')),
		[shown, setShown] = useState(true),
		[events, setEvents] = useState([]);
	const record = (type, value) => {
		setEvents((old) => [...old, [type, value ?? null]]);
		if (type === 'confirm' && p.unmountInConfirm) setShown(false);
		if (type === 'confirm' && p.promiseReject)
			return Promise.reject(new Error('fixture rejection'));
		if (type === 'confirm' && p.promise)
			return new Promise((resolve) =>
				setTimeout(() => {
					void record('promise-settled');
					resolve();
				}, 500)
			);
	};
	useLayoutEffect(() => {
		Object.assign(window, {
			api: {
				set: (patch) => setP((old) => ({ ...old, ...patch })),
				events: () => events,
				unmount: () => setShown(false)
			}
		});
	});
	return (
		<main id="fixture" style={{ padding: 40, width: 'min(540px,100%)', boxSizing: 'border-box' }}>
			{shown &&
				(kind === 'number' ? (
					<NumberField label="Number" defaultValue={40} {...p} />
				) : kind === 'standard' ? (
					<Slider label="Slider" defaultValue={40} {...p} />
				) : kind === 'hold' ? (
					<HoldToConfirm
						label="Hold action"
						duration={240}
						{...p}
						onConfirm={() => record('confirm')}
						onHoldChange={(v) => record('holding', v)}
					/>
				) : (
					<form id="form">
						<ElasticSlider
							label="Slider"
							defaultValue={40}
							{...p}
							onValueChange={(v) => record('change', v)}
							onValueCommit={(v) => record('commit', v)}
						/>
					</form>
				))}
			<button id="outside" type="button" style={{ marginTop: 60 }}>
				Outside
			</button>
			<output id="events">{JSON.stringify(events)}</output>
		</main>
	);
}
createRoot(document.getElementById('root')).render(<Fixture />);
