read @./AGENTS.md

# Arc for Svelte

A Svelte 5 port of [arc-library](https://github.com/kuratlielia/arc-library) (React + Radix + `motion`). Components are rebuilt on **Bits UI** and animated with **Svelte's own motion only**: `svelte/motion`, `svelte/transition`, `svelte/animate`, CSS, and the helpers in `src/lib/motion`.

Read `ROADMAP.md` for public status and `docs/PORTING.md` for conventions and intentional differences. An optional, gitignored `PORT.md` holds the detailed local checklist; do not require it for contributors or publish it.

## Setup

- The React source lives in `reference/arc-library` (a git clone, gitignored). Read components there; never edit it.
- The live React version of every component is at `https://uiarc.dev/components/<name>` (blocks: `https://uiarc.dev/components/blocks/<name>`). That is the visual reference.
- Tooling is Vite+ (`vp`); see `AGENTS.md`. Don't use `npm`/`npx`/`pnpm` directly.
- Commands: `vp install`, `vp dev`, `vp run check` (svelte-check), `vp run lint`. Note `vp check` is the built-in (format, lint, type check) and differs from `vp run check`.

## Hard rules

- **No animation libraries.** Not `motion`, `svelte-motion`, GSAP, auto-animate or anything similar. If a pattern seems to need one, extend `src/lib/motion` instead.
- **Svelte 5 runes only.** Use `$state`, `$derived`, `$effect`, `$props`, snippets and attachments (`{@attach}`). No stores, `export let`, `on:` directives or `<slot>`.
- **Bits UI for any component with a Radix or WAI-ARIA equivalent.** Choose the matching Bits UI primitive using the upstream semantics and existing ports. Don't hand-roll focus traps, roving focus, typeahead or dismissal.
- **Match the original.** Same props (translated to Svelte idioms), same markup structure, same CSS values, same motion tokens. Behavior and feel should be indistinguishable from uiarc.dev.
- **Keep the MIT notice.** `LICENSE` carries Elia Kuratli's copyright alongside ours.

## File layout

```
src/lib/
  motion/                 shared motion helpers (see below)
  components/<name>/
    <Name>.svelte         one file per exported part (Tabs.svelte, TabsList.svelte, ...)
    <name>.css            the ported CSS module
    <name>-state.svelte.ts  shared state + context, only when parts need to talk
    index.ts              named exports
  blocks/<name>/          same shape
src/routes/components/[name]/+page.svelte   demo for side-by-side comparison
```

Styles: port `<name>.module.css` to a plain `<name>.css` imported by the component, with every class renamed `.foo` → `.arc-<name>__foo` (modifiers: `.arc-<name>--tone`). Don't use scoped `<style>` blocks: classes are passed into Bits UI components, which render the elements in their own scope, so scoped styles would miss them. Keep the design tokens (`var(--surface)` and so on) from `foundation.css` untouched.

## Translating React to Svelte

| React                                         | Svelte                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `className`                                   | `class` (accept `ClassValue`; pass arrays straight through, Svelte runs clsx on them)                  |
| `children` / render props                     | `Snippet` props; `{@render children?.()}`                                                              |
| `asChild`                                     | Bits UI's `child` snippet: `{#snippet child({ props })}<el {...props}>{/snippet}`                      |
| `forwardRef` / `ref`                          | `ref = $bindable(null)`                                                                                |
| `value` + `defaultValue` + `onValueChange`    | `value = $bindable(default)` plus an optional `onValueChange` callback                                 |
| `createContext` / `useContext`                | `createContext` from `svelte` returns `[get, set]`; put shared state in a class in a `.svelte.ts` file |
| `useId`                                       | `$props.id()`                                                                                          |
| `useRef` for DOM nodes                        | `let el = $state<HTMLElement>()` + `bind:this={el}`, or an attachment                                  |
| `useEffect` / `useLayoutEffect`               | `$effect` / `$effect.pre`; wrap writes to state the effect also reads in `untrack`                     |
| `useMemo` / derived values                    | `$derived` / `$derived.by`                                                                             |
| `lucide-react` icons                          | `import X from '@lucide/svelte/icons/x'`                                                               |
| `ArcProvider` link/image                      | the `src/lib/arc-provider.svelte.ts` context, falling back to `<a>` / `<img>`                          |
| `children` read as a string so it can animate | a `label` prop (see `Badge`); keep `children` for rich, non-animated content                           |

## Translating motion

Import tokens as `import { motionTokens as m } from '$lib/motion/tokens'`. Durations are **milliseconds**, eases and springs are ready-made easing functions, and `m.spring.*` spreads straight into a transition or `Tween.set` (`{ ...m.spring.snappy }` gives `duration` + `easing`).

| `motion/react`                                                          | Use                                                                                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useReducedMotion()`                                                    | `prefersReducedMotion.current` from `svelte/motion`                                                                                                             |
| `useMotionValue` + `useTransform`                                       | `$state` + `$derived`. Svelte doesn't re-render whole components, so motion values aren't needed                                                                |
| `useSpring`, `animate(value, …)` toward a moving target (pointer, drag) | `new Spring(...)` from `svelte/motion` (it keeps velocity when the target changes)                                                                              |
| `animate(value, …)` to a fixed target                                   | `Tween.set(target, m.spring.morph)` or an ease token                                                                                                            |
| `animate(element, keyframes)`, `useAnimate`                             | `element.animate(keyframes, { duration, easing: cssEasing(...) })` (Web Animations API)                                                                         |
| `AnimatePresence` + `initial` / `exit`                                  | `{#if}` / `{#key}` with `in:` / `out:`                                                                                                                          |
| `AnimatePresence initial={false}`                                       | a `mounted` flag set in `$effect`, passed as `skip: !mounted` (see `Badge`)                                                                                     |
| `mode="popLayout"`                                                      | `out:swap={{ ..., pop: true }}` or `popOut(node, box)` inside a custom outro. The parent must be `position: relative`                                           |
| `useIsPresent` to hide outgoing copies from screen readers              | handled: `popOut` sets `aria-hidden`, and Svelte makes outgoing nodes `inert`                                                                                   |
| `variants` + `custom`                                                   | transition params (`in:panelIn={{ direction }}`)                                                                                                                |
| `staggerChildren` / `delayChildren`                                     | `delay: i * m.stagger.item` in each child's transition params                                                                                                   |
| `layoutId` (one highlight shared between items)                         | a single element that a `Tween` moves to the active item's measured box (see `TabsList`), or `crossfade` from `svelte/transition` when two elements really swap |
| `layout` on items reordering in a keyed list                            | `animate:flip={{ ...m.spring.smooth }}`                                                                                                                         |
| `layout` on width that follows content                                  | `WidthMorph` (see `Badge`)                                                                                                                                      |
| `layout` on height that follows content                                 | measure in the intro and animate `height` (see `panelIn` in `TabsContent`); write a `HeightMorph` alongside `WidthMorph` once it's needed twice                 |
| `useInView`, `whileInView`                                              | `{@attach inView({ once: true, onChange: (v) => (shown = v) })}`                                                                                                |
| `whileTap` / `whileHover`                                               | CSS `:active` / `:hover` with `transition` + `cssEasing(m.spring.snappy.easing)`; a `Spring` only if it must react to pointer position                          |
| `useScroll`                                                             | a passive `scroll` listener writing `$state`; or CSS scroll-driven animations                                                                                   |
| `frame` / `cancelFrame`, `usePageInView`                                | `requestAnimationFrame`; `document.visibilityState` + `visibilitychange`                                                                                        |
| `Reorder.Group` / `Reorder.Item`                                        | pointer events for the drag, `animate:flip` for the rest of the list                                                                                            |
| `MotionConfig reducedMotion`                                            | nothing: read `prefersReducedMotion.current` in each component                                                                                                  |

When a pattern repeats in two or more components, move it into `src/lib/motion` with a doc comment and export it from `index.ts`. Don't change an existing helper's API without updating every caller.

## Bits UI patterns

- **Exit animations on overlays** (Dialog, Popover, Select, Tooltip, menus, Accordion and Collapsible content): pass `forceMount` and render through `child`, which gives you `open`:
  ```svelte
  <Dialog.Content forceMount>
  	{#snippet child({ props, open })}
  		{#if open}<div {...props} in:… out:…>…</div>{/if}
  	{/snippet}
  </Dialog.Content>
  ```
  Floating content (Popover, Select, Tooltip, DropdownMenu, ContextMenu, LinkPreview) also hands you `wrapperProps`: spread them on an outer `<div>` and put the transition on the inner one.
- **Tabs** keeps every panel mounted and hidden. To animate panels, render through `child` and wrap the element in `{#if selected}` (see `TabsContent`).
- Style state from Bits UI's data attributes (`data-state`, `data-disabled`, `data-highlighted`, `data-orientation`), not from extra classes.
- Measure the outgoing state **before** the DOM changes: use a `bind:value` getter/setter pair and measure in the setter (see `Tabs.svelte` and `tabs-state.svelte.ts`).

## Svelte gotchas

- Transitions are local by default: when an outer block is removed, the inner element disappears at once with no outro. Keep `{#if}` / `{#key}` directly around the animated element, and use `|global` only when the original animated in that case too.
- An effect that writes state it also reads loops. Read the trigger, then do the work inside `untrack`.
- `$effect` runs after the DOM updates, `$effect.pre` before. Measure "before" in `$effect.pre` or a setter, and "after" in `$effect`.
- Springy easings overshoot past 1. Clamp opacity (`swap` already does this).

## Workflow for each session

1. Read `ROADMAP.md` and the relevant verification notes. Choose work whose dependencies are ready; consult the optional local checklist when present.
2. For each component, read the React `.tsx` and `.module.css` in `reference/arc-library/registry/...` in full before writing anything.
3. Port it, export it from `index.ts`, and add its demo route. Mirror the demo on uiarc.dev.
4. Verify it (definition of done below). Fix differences before moving on.
5. Update `ROADMAP.md` and relevant verification notes with the actual status. Record intentional deviations in `docs/PORTING.md`; keep the optional local checklist aligned when present.
6. Commit each component separately: `port(<name>): …`.

Ported components are the reference. Read `Badge`, the `Tabs*` files and `src/lib/motion` before porting anything else, and copy their conventions.

## Definition of done

- `vp run check` and `vp run lint` pass with no new warnings.
- Every prop, variant and state of the original exists, with the same defaults.
- Keyboard and screen-reader behavior matches: focus order, arrow keys, Escape, roles and `aria-*`.
- Checked in a browser next to uiarc.dev at the same viewport width:
  - At rest, it looks the same (compare screenshots).
  - Every animation plays with the same direction, distance, timing and bounce. Trigger each one: open/close, swap, hover, press, drag, scroll into view.
  - It looks right with reduced motion emulated.
  - First render does not animate where the original uses `initial={false}`.
- No `motion`, `react` or `@radix-ui` imports anywhere in `src/`.
