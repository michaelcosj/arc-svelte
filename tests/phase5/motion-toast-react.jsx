// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
	ToastStackProvider,
	ToastStack,
	useToastStack
} from '../../reference/arc-library/registry/components/toast-stack/toast-stack';
import '@fontsource-variable/inter';
import '../../src/lib/foundation.css';
import '../../src/app.css';
function Consumer() {
	const api = useToastStack();
	useEffect(() => {
		window.api = api;
	}, [api]);
	return <ToastStack label="Fixture" contained />;
}
createRoot(document.getElementById('app')).render(
	<div style={{ position: 'relative', width: 358, height: 500 }}>
		<ToastStackProvider>
			<Consumer />
		</ToastStackProvider>
	</div>
);
