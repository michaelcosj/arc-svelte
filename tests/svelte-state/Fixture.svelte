<script lang="ts">
	import { onMount } from 'svelte';
	import { NumberField } from '#arc/number-field';
	import { MoneyInput } from '#arc/money-input';
	import { MentionInput, type MentionInputHandle, type MentionValue } from '#arc/mention-input';
	import { Select } from '#arc/select';
	import { TimePicker } from '#arc/time-picker';
	import { OtpInput } from '#arc/otp-input';
	import { CopyButton } from '#arc/copy-button';
	import { TextMorph } from '#arc/text-morph';
	import { Calendar } from '#arc/calendar';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '#arc/tabs';
	import { FileUpload } from '#arc/file-upload';
	import '../../src/lib/foundation.css';
	let number = $state(5),
		money = $state<number | null>(1200);
	let rejectNumber = false,
		rejectMoney = false;
	let numberRef = $state<HTMLInputElement | null>(null);
	let mentionRef = $state<MentionInputHandle | null>(null);
	let mention = $state<MentionValue>({ text: 'Old message', mentions: [] });
	let submitted = '';
	let selection = $state('a'),
		time = $state('09:00'),
		otp = $state('12');
	let copyLabel = $state('Copy'),
		morphText = $state('Draft');
	let date = $state(new Date(2026, 0, 12));
	let tab = $state('a'),
		showUpload = $state(true);
	let uploadSignal: AbortSignal | undefined;
	const numberChanges: number[] = [],
		moneyChanges: (number | null)[] = [];
	const api = {
		numberThenIncrement(next: number, reject = false) {
			rejectNumber = reject;
			number = next;
			numberRef?.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
			);
			numberRef?.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', bubbles: true }));
			return { value: number, proposal: numberChanges.at(-1) };
		},
		mentionThenSubmit(text: string) {
			mention = { text, mentions: [] };
			mentionRef?.textarea?.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
			);
			return submitted;
		},
		setMoney(next: number | null, reject = false) {
			money = next;
			rejectMoney = reject;
		},
		get money() {
			return money;
		},
		get moneyChanges() {
			return [...moneyChanges];
		},
		setSelection(next: string) {
			selection = next;
		},
		setTime(next: string) {
			time = next;
		},
		setOtp(next: string) {
			otp = next;
		},
		setWords(next: string) {
			copyLabel = next;
			morphText = next;
		},
		setDate(day: number) {
			date = new Date(2026, 0, day);
		},
		unmountUpload() {
			showUpload = false;
		},
		get uploadAborted() {
			return uploadSignal?.aborted;
		}
	};
	onMount(() => {
		Object.assign(window, { svelteAudit: api });
		return () => {
			Reflect.deleteProperty(window, 'svelteAudit');
		};
	});
</script>

<div style="display:grid;gap:24px;max-width:600px;padding:24px">
	<NumberField
		label="Count"
		value={number}
		bind:ref={numberRef}
		onValueChange={(next) => {
			numberChanges.push(next);
			if (!rejectNumber) number = next;
		}}
	/>
	<MoneyInput
		label="Amount"
		value={money}
		onValueChange={(next) => {
			moneyChanges.push(next);
			if (!rejectMoney) money = next;
		}}
	/>
	<MentionInput
		aria-label="Message"
		value={mention}
		bind:ref={mentionRef}
		people={[
			{ id: 'alice', name: 'Alice' },
			{ id: 'alex', name: 'Alex' }
		]}
		onChange={(next) => {
			mention = next;
		}}
		submitOnEnter
		onSubmit={(next) => {
			submitted = next.text;
		}}
	/>
	<Select
		label="Choice"
		bind:value={selection}
		options={[
			{ value: 'a', label: 'Alpha' },
			{ value: 'b', label: 'Beta' },
			{ value: 'c', label: 'Gamma' }
		]}
	/>
	<TimePicker label="Time" bind:value={time} />
	<OtpInput label="Code" bind:value={otp} length={4} />
	<div data-copy><CopyButton value="test" label={copyLabel} /></div>
	<div data-morph><TextMorph text={morphText} /></div>
	<Calendar
		value={date}
		month={new Date(2026, 0, 1)}
		onChange={(next) => {
			date = next;
		}}
	/>
	<Tabs bind:value={tab}>
		<TabsList aria-label="Sections">
			<TabsTrigger value="a">First</TabsTrigger><TabsTrigger value="b">Second</TabsTrigger>
		</TabsList>
		<TabsContent value="a">First panel</TabsContent><TabsContent value="b">Second panel</TabsContent
		>
	</Tabs>
	{#if showUpload}<FileUpload
			onUpload={(_file, { signal }) => {
				uploadSignal = signal;
				return new Promise<void>(() => {});
			}}
		/>{/if}
</div>
