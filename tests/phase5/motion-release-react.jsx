// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import React, { useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Slider } from '@/registry/components/slider/slider';
import { BottomSheet } from '@/registry/components/bottom-sheet/bottom-sheet';
import '../../src/lib/foundation.css';
const q = new URLSearchParams(location.search),
	kind = q.get('kind'),
	scenario = q.get('case');
window.events = [];
const record = (type, value) => window.events.push({ type, value });
function Fixture() {
	const [open, setOpen] = useState(true),
		[props, setProps] = useState({});
	useLayoutEffect(() => {
		window.fixture = { set: (p) => setProps((old) => ({ ...old, ...p })), open: setOpen };
	});
	return (
		<main style={{ width: 500, margin: 40 }}>
			{kind === 'slider' ? (
				<Slider
					label="Release slider"
					defaultValue={scenario === 'kick' ? 100 : 40}
					step={10}
					{...props}
					onValueChange={(v) => record('change', v)}
					onValueCommit={(v) => record('commit', v)}
				/>
			) : (
				<BottomSheet
					title="Release sheet"
					description="Motion fixture"
					open={open}
					initialDetent={scenario === 'stretch' ? 1 : 0}
					{...props}
					onDetentChange={(v) => record('detent', v)}
					onOpenChange={(v) => {
						setOpen(v);
						record('open', v);
					}}
				>
					<p>Sheet content</p>
				</BottomSheet>
			)}
		</main>
	);
}
createRoot(document.getElementById('app')).render(<Fixture />);
