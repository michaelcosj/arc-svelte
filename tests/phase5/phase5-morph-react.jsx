// @ts-nocheck -- Dynamic reference fixture; browser values are asserted at runtime.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmMorph } from '@/registry/components/confirm-morph/confirm-morph';
import { MoneyInput } from '@/registry/components/money-input/money-input';
import { PhoneInput } from '@/registry/components/phone-input/phone-input';
import { RichTextEditor } from '@/registry/components/rich-text-editor/rich-text-editor';
import '../../src/lib/foundation.css';
import '../../src/app.css';
import '@fontsource-variable/inter';
const kind = new URLSearchParams(location.search).get('kind');
function App() {
	const [state, setState] = useState('idle'),
		[amount, setAmount] = useState(125000);
	window.morph = { state: setState, amount: setAmount };
	return (
		<main style={{ margin: 40, width: 450 }}>
			{kind === 'confirm' ? (
				<ConfirmMorph
					label="Delete workspace"
					state={state}
					onStateChange={setState}
					confirmTimeout={0}
					resultTimeout={0}
				/>
			) : kind === 'money' ? (
				<div style={{ width: 260 }}>
					<MoneyInput label="Amount" value={amount} onValueChange={setAmount} />
				</div>
			) : kind === 'phone' ? (
				<PhoneInput label="Phone" defaultValue="+12015550123" />
			) : (
				<RichTextEditor aria-label="Editor" defaultValue="<p>Alpha beta gamma delta.</p>" />
			)}
		</main>
	);
}
createRoot(document.getElementById('app')).render(<App />);
