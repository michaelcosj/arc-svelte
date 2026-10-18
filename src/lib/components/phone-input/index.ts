export { default as PhoneInput } from './PhoneInput.svelte';
export {
	PHONE_COUNTRIES,
	flagOf,
	formatNational,
	parsePhoneNumber,
	formatPhoneNumber
} from './phone';
export type { PhoneCountry, PhoneStatus } from './phone';
export type { PhoneInputProps, PhoneInputDetails } from './types';
