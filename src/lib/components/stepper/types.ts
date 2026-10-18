import type { ClassValue } from 'svelte/elements';
export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperStatus = 'complete' | 'current' | 'upcoming' | 'error';
export interface StepperStep {
	id: string;
	label: string;
	description?: string;
	error?: string;
}
export interface StepperProps {
	steps: StepperStep[];
	current: number;
	orientation?: StepperOrientation;
	onStepSelect?: (index: number) => void;
	details?: 'all' | 'current';
	compact?: boolean;
	label?: string;
	completeLabel?: string;
	class?: ClassValue;
}
export type GlyphKind = 'number' | 'check' | 'error';
