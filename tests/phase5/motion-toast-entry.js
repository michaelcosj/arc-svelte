// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { mount } from 'svelte';
import Fixture from './motion-toast-fixture.svelte';
import '@fontsource-variable/inter';
import '../../src/lib/foundation.css';
import '../../src/app.css';
mount(Fixture, { target: document.getElementById('app') });
