// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import '../../src/demos/stage.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
import '../../src/lib/foundation.css';
import '../../src/app.css';
import { mount } from 'svelte';
import Fixture from './phase5-b-panels-fixture.svelte';
const params = new URLSearchParams(location.search);
const Component = params.has('demo')
	? (await import('../../src/demos/resizable-panels.svelte')).default
	: Fixture;
mount(Component, {
	target: document.querySelector('#app'),
	props: {
		scenario: params.get('case') || 'collapse',
		initialWidth: Number(params.get('width') || 600)
	}
});
