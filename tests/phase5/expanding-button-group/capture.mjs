// @ts-nocheck -- Browser verification harness; browser globals are provided by the fixtures.
export const capture = async (p, mode) =>
	p.evaluate(async (mode) => {
		const group = document.querySelector('[role=toolbar]'),
			buttons = [...group.querySelectorAll('button')];
		const part = (n, k) => n.querySelector(`[class*="_${k}"]`);
		const style = (n) => {
			if (!n) return null;
			const s = getComputedStyle(n),
				m = new DOMMatrix(s.transform === 'none' ? undefined : s.transform);
			return {
				opacity: +s.opacity,
				x: m.e,
				y: m.f,
				scale: m.a,
				blur: parseFloat(s.filter.match(/[\d.]+/)?.[0] ?? '0'),
				dash: s.strokeDashoffset,
				color: s.color,
				bg: s.backgroundColor
			};
		};
		const read = () =>
			buttons.map((n) => ({
				width: n.getBoundingClientRect().width,
				expanded: n.hasAttribute('data-expanded'),
				state: n.dataset.state,
				label: style(part(n, 'label')),
				icon: style(part(n, 'icon')),
				glyphs: [...n.querySelectorAll('[class*="_glyph"]')].map(style),
				words: [...n.querySelectorAll('[class*="_word"]')].map(style),
				check: style(n.querySelector('path[d="M4 12.5l5 5L20 6.5"]'))
			}));
		const data = [];
		let begin;
		await new Promise((resolve) => {
			requestAnimationFrame((t) => {
				begin = t;
				if (mode === 'hover' || mode === 'reverse') {
					buttons[1].dispatchEvent(
						new PointerEvent('pointermove', {
							bubbles: true,
							pointerType: 'mouse',
							clientX: buttons[1].getBoundingClientRect().x + 12,
							clientY: buttons[1].getBoundingClientRect().y + 12
						})
					);
				} else buttons[1].click();
				data.push({ t: 0, values: read() });
				let reversed = false;
				const step = (t) => {
					const elapsed = t - begin;
					if (mode === 'interrupt' && elapsed >= 75 && !reversed) {
						reversed = true;
						buttons[2].click();
					}
					if (mode === 'reverse' && elapsed >= 80 && !reversed) {
						reversed = true;
						group.dispatchEvent(
							new PointerEvent('pointerout', {
								bubbles: true,
								pointerType: 'mouse',
								relatedTarget: document.body
							})
						);
						group.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
					}
					data.push({ t: elapsed, values: read() });
					if (elapsed < 850) requestAnimationFrame(step);
					else resolve();
				};
				requestAnimationFrame(step);
			});
		});
		return data;
	}, mode);
