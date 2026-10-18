<script lang="ts">
	import Rocket from '@lucide/svelte/icons/rocket';
	import Upload from '@lucide/svelte/icons/upload';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '#arc/button';
	import { useToastStack } from './toast-stack-state.svelte';
	import ToastStack from './ToastStack.svelte';
	const api = useToastStack(),
		timers: ReturnType<typeof setTimeout>[] = [];
	let version = 2,
		person = 0;
	$effect(() => () => timers.forEach(clearTimeout));
	const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
	function publish() {
		const next = `4.${version}`,
			previous = `4.${version - 1}`;
		version++;
		api.toast({
			type: 'success',
			title: `Release ${next} published`,
			description: 'Live for 1,284 customers.',
			action: {
				label: 'Undo',
				onClick: (id) =>
					api.update(id, {
						type: 'info',
						title: `Rolled back to ${previous}`,
						description: 'Customers see the previous release again.',
						action: undefined
					})
			}
		});
	}
	function upload() {
		const id = api.toast({
			type: 'loading',
			title: 'Uploading brand-kit.zip',
			description: '3 files, 24.6 MB'
		});
		later(2200, () =>
			api.update(id, {
				type: 'success',
				title: 'brand-kit.zip uploaded',
				description: 'Saved to Atlas redesign, in Shared assets.'
			})
		);
	}
	const people = [
		{ name: 'Emma Collins', role: 'comment on files and review handoffs' },
		{ name: 'Marcus Johnson', role: 'edit the release notes and publish previews' },
		{ name: 'Ava Mitchell', role: 'run usability sessions and share recordings' }
	];
	function invite() {
		const p = people[person++ % people.length];
		api.toast({
			type: 'info',
			title: `${p.name} joined Atlas redesign`,
			description: `They can ${p.role}.`
		});
	}
	function storage() {
		api.toast({
			type: 'warning',
			title: 'Storage is 92% full',
			description: 'Northwind uses 9.2 of 10 GB. Exports pause at the limit.'
		});
	}
	function charge() {
		api.toast({
			type: 'error',
			title: 'Payment declined',
			description: 'Visa ending 4242 was declined.',
			action: {
				label: 'Retry',
				onClick: (id) => {
					api.update(id, {
						type: 'loading',
						title: 'Retrying payment',
						description: 'Visa ending 4242',
						action: undefined
					});
					later(1600, () =>
						api.update(id, {
							type: 'success',
							title: 'Payment received',
							description: '$48.00 charged to Visa ending 4242.'
						})
					);
				}
			}
		});
	}
	const buttons = [
		{ label: 'Publish release', icon: Rocket, run: publish },
		{ label: 'Upload assets', icon: Upload, run: upload },
		{ label: 'Invite teammate', icon: UserPlus, run: invite },
		{ label: 'Check storage', icon: HardDrive, run: storage },
		{ label: 'Charge card', icon: CreditCard, run: charge }
	];
</script>

<div class="arc-toast-stack-demo__desk">
	<div class="arc-toast-stack-demo__intro">
		<h3 class="arc-toast-stack-demo__heading">Northwind release desk</h3>
	</div>
	<div class="arc-toast-stack-demo__actions">
		{#each buttons as button (button.label)}<Button
				variant="secondary"
				size="sm"
				onclick={button.run}
				><button.icon
					width={16}
					height={16}
					strokeWidth={1.75}
					aria-hidden="true"
				/>{button.label}</Button
			>{/each}
		<Button variant="ghost" size="sm" onclick={() => api.dismiss()} disabled={api.count === 0}
			><X width={16} height={16} strokeWidth={1.75} aria-hidden="true" />Dismiss all</Button
		>
	</div>
	<ToastStack contained label="Northwind notifications" />
</div>
