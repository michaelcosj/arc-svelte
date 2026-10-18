<script lang="ts">
	import { MoneyInput } from '#arc/money-input';
	import { Button } from '#arc/button';
	import { heightPresence } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import './money-input-demo.css';
	let balances = $state<Record<string, number>>({
			USD: 248000,
			EUR: 112050,
			GBP: 64000,
			JPY: 88000
		}),
		currency = $state('USD'),
		amount = $state<number | null>(6000),
		status = $state('idle'),
		sent = $state('');
	const digits: Record<string, number> = { USD: 2, EUR: 2, GBP: 2, JPY: 0 };
	const format = (n: number, code: string) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: code,
			currencyDisplay: 'narrowSymbol'
		}).format(n / 10 ** digits[code]!);
	const canSend = $derived(
		amount !== null && amount >= 100 && amount <= balances[currency]! && status !== 'sending'
	);
	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSend || amount === null) return;
		status = 'sending';
		setTimeout(() => {
			if (amount === null) return;
			balances[currency]! -= amount;
			sent = `Sent ${format(amount, currency)} to Jasmine`;
			amount = null;
			status = 'sent';
		}, 900);
	}
</script>

<div class="arc-money-input-demo__canvas">
	<div class="arc-money-input-demo__demo">
		<form class="arc-money-input-demo__card" onsubmit={submit} novalidate>
			<header class="arc-money-input-demo__header">
				<img
					class="arc-money-input-demo__avatar"
					src="/media/people/jasmine-brooks.jpg"
					alt=""
					width={80}
					height={80}
				/>
				<div class="arc-money-input-demo__who">
					<h3 class="arc-money-input-demo__title">Pay Jasmine Brooks</h3>
					<p class="arc-money-input-demo__meta">Studio lunch, Thursday</p>
				</div>
			</header>
			<MoneyInput
				label="Amount"
				value={amount}
				{currency}
				currencies={['USD', 'EUR', 'GBP', 'JPY']}
				onValueChange={(next) => {
					amount = next;
					if (status === 'sent') status = 'idle';
				}}
				onCurrencyChange={(next) => (currency = next)}
				min={100}
				max={balances[currency]}
				quickAdd={currency === 'JPY' ? [1000, 5000] : [10, 50, 100]}
				description="Arrow keys step by 1, Shift by 10"
				name="amount"
			/>
			<div class="arc-money-input-demo__footer">
				<p class="arc-money-input-demo__balance">
					Balance <span class="arc-money-input-demo__figure"
						>{format(balances[currency]!, currency)}</span
					>
				</p>
				<Button
					type="submit"
					disabled={!canSend}
					loading={status === 'sending'}
					label={amount !== null && amount > 0 ? `Pay ${format(amount, currency)}` : 'Pay'}
				/>
			</div>
			{#if status === 'sent'}<p
					class="arc-money-input-demo__sent"
					role="status"
					in:heightPresence={{ skip: prefersReducedMotion.current }}
					out:heightPresence={{ skip: prefersReducedMotion.current }}
				>
					<span class="arc-money-input-demo__sentInner">{sent}.</span>
				</p>{/if}
		</form>
	</div>
</div>
