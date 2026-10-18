// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Carousel } from '@/registry/components/carousel/carousel';
import { FloatingButtonGroup } from '@/registry/components/floating-button-group/floating-button-group';
import { SwipeActions, SwipeActionsRow } from '@/registry/components/swipe-actions/swipe-actions';
import { UserMenu } from '@/registry/components/user-menu/user-menu';
import { ButtonGroup } from '@/registry/components/button-group/button-group';
import '../../src/lib/foundation.css';
const kind = new URLSearchParams(location.search).get('kind');
const items = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Longer Beta' },
	{ id: 'c', label: 'Gamma' }
];
function App() {
	const [reset, setReset] = useState(0);
	window.swipe ??= { log: [] };
	window.swipe.reset = () => {
		setReset((n) => n + 1);
		window.swipe.log = [];
	};
	window.swipe.events = () => window.swipe.log;
	return (
		<main style={{ margin: 40, width: 400 }}>
			{kind === 'user' ? (
				<UserMenu
					user={{ name: 'Ada Example', email: 'ada@example.test' }}
					defaultOpen
					portal={false}
					items={[{ label: 'Profile' }, { label: 'Settings' }]}
				/>
			) : kind === 'carousel' ? (
				<Carousel
					key={reset}
					label="Fixture carousel"
					defaultIndex={1}
					slideSize="200px"
					onIndexChange={(i) => window.swipe.log.push(i)}
				>
					<p>One</p>
					<p>Two</p>
					<p>Three</p>
				</Carousel>
			) : kind === 'swipe' ? (
				<SwipeActions key={reset} label="Fixture">
					<SwipeActionsRow
						label="Row"
						leading={[
							{
								label: 'Read',
								icon: <svg />,
								keepRow: true,
								onSelect: () => window.swipe.log.push('read')
							}
						]}
						trailing={[
							{ label: 'Archive', icon: <svg />, onSelect: () => window.swipe.log.push('archive') }
						]}
					>
						<p>Message</p>
					</SwipeActionsRow>
				</SwipeActions>
			) : kind === 'button' ? (
				<ButtonGroup label="Fixture" items={items} collapseLabels={false} />
			) : (
				<FloatingButtonGroup label="Fixture" items={items} />
			)}
		</main>
	);
}
createRoot(document.getElementById('app')).render(<App />);
