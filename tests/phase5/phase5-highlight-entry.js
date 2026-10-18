// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { mount } from 'svelte';
import Fixture from './phase5-highlight-fixture.svelte';
mount(Fixture, { target: document.getElementById('app') });
