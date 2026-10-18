// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { mount } from 'svelte';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
import '../../src/lib/foundation.css';
import '../../src/app.css';
import Fixture from './phase5-existing-fixture.svelte';
document.documentElement.dataset.theme =
	new URLSearchParams(location.search).get('theme') ?? 'light';
mount(Fixture, { target: document.getElementById('root') });
