// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
import { mount } from 'svelte';
import Fixture from './motion-release-fixture.svelte';
mount(Fixture, { target: document.getElementById('app') });
