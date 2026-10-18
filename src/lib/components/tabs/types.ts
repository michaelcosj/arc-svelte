import type { Tabs as TabsPrimitive } from 'bits-ui';
import type { ClassValue } from 'svelte/elements';

export interface TabsProps extends Omit<TabsPrimitive.RootProps, 'class' | 'value'> {
	/** The active tab. Bind it, or set it once as the initial tab. */
	value?: string;
	class?: ClassValue;
}

export interface TabsListProps extends Omit<TabsPrimitive.ListProps, 'class'> {
	class?: ClassValue;
}

export interface TabsTriggerProps extends Omit<TabsPrimitive.TriggerProps, 'class'> {
	class?: ClassValue;
}

export interface TabsContentProps extends Omit<TabsPrimitive.ContentProps, 'class' | 'child'> {
	/** Keeps the panel mounted and visible, including when inactive, and skips enter/exit motion. */
	forceMount?: boolean;
	class?: ClassValue;
}
