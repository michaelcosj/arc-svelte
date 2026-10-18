// @ts-nocheck -- Browser fixture/oracle harness; runtime assertions validate captured browser values.
export const cases = {
	default: [
		{ id: 'a', label: 'Alpha', defaultSize: 30 },
		{ id: 'b', label: 'Beta', defaultSize: 70 }
	],
	relative: [
		{ id: 'a', label: 'Alpha', defaultSize: 2, minSize: 40 },
		{ id: 'b', label: 'Beta', defaultSize: 3, minSize: 60 }
	],
	limits: [
		{ id: 'a', label: 'Alpha', defaultSize: 40, minSize: 96, maxSize: 240 },
		{ id: 'b', label: 'Beta', defaultSize: 60, minSize: 120, maxSize: 420 }
	],
	collapse: [
		{ id: 'a', label: 'Alpha', defaultSize: 40, minSize: 96, collapsible: true },
		{ id: 'b', label: 'Beta', defaultSize: 60, minSize: 120, collapsible: true }
	],
	before: [
		{
			id: 'a',
			label: 'Alpha',
			defaultSize: 40,
			minSize: 96,
			collapsible: true,
			defaultCollapsed: true
		},
		{ id: 'b', label: 'Beta', defaultSize: 60, minSize: 120 }
	],
	after: [
		{ id: 'a', label: 'Alpha', defaultSize: 40, minSize: 96 },
		{
			id: 'b',
			label: 'Beta',
			defaultSize: 60,
			minSize: 120,
			collapsible: true,
			defaultCollapsed: true
		}
	],
	ignored: [
		{ id: 'a', label: 'Alpha', defaultSize: 40, defaultCollapsed: true },
		{ id: 'b', label: 'Beta', defaultSize: 60 }
	],
	narrow: [
		{ id: 'a', label: 'Alpha', defaultSize: 40, minSize: 140, collapsible: true },
		{ id: 'b', label: 'Beta', defaultSize: 60, minSize: 160, collapsible: true }
	],
	multi: [
		{ id: 'a', label: 'Alpha', defaultSize: 20, minSize: 70, collapsible: true },
		{ id: 'b', label: 'Beta', defaultSize: 35, minSize: 90, maxSize: 300 },
		{ id: 'c', label: 'Gamma', defaultSize: 25, minSize: 80, collapsible: true },
		{ id: 'd', label: 'Delta', defaultSize: 20, minSize: 60 }
	],
	empty: [],
	single: [{ id: 'a', label: 'Alpha', defaultSize: 17, minSize: 100 }]
};
