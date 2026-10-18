# Arc for Svelte

An independent **Svelte 5** port of [Arc UI](https://uiarc.dev), originally created by
[Elia Kuratli](https://github.com/kuratlielia). The original React components live in
[arc-library](https://github.com/kuratlielia/arc-library).

This port preserves Arc's design, component behavior and motion using **Bits UI**,
Svelte runes, native Svelte motion and browser animation APIs. Application code has
no React, Radix or Motion dependency. React reference fixtures are isolated under
`tests/phase5/` for comparison testing.

This is a community port, independently maintained and not an official Arc release.

## Project status

This is a work in progress, distributed as source with a local component gallery.
It is not yet an npm package or a shadcn-compatible Svelte registry.

- 96 components have implementations and demos; verification status varies.
- Phase 5's 18 pointer and gesture components are verified.
- 45 earlier components still have motion or variant checks recorded as pending.
- Phase 6's 13 charts and Phase 7's 18 blocks are planned.

See the [roadmap](./ROADMAP.md) for remaining work and the
[porting notes](./docs/PORTING.md) for Svelte conventions and intentional differences.
The [Phase 5 verification notes](./tests/phase5/VERIFICATION.md) record measured
coverage, limitations and the ResizablePanels freeze fix.

## Run the gallery

Use Node.js 24 and [Vite+](https://viteplus.dev/guide/), the project's toolchain.
After cloning this repository:

```sh
vp install --frozen-lockfile
vp run dev
```

Open the URL printed by Vite+ (normally `http://localhost:5173`). Individual demos
live at `/components/<name>`, for example `/components/resizable-panels`.
Add `?theme=dark` to inspect dark mode.

For a remote preview, bind the dev server to the network interface:

```sh
vp run dev --host 0.0.0.0 --port 5173
```

## Use a component in this checkout

The project defines `#arc/<name>` aliases for per-component entry points:

```svelte
<script lang="ts">
	import { Button } from '#arc/button';
</script>

<Button label="Save changes" onclick={() => console.log('Saved')} />
```

[The root layout](./src/routes/+layout.svelte) loads the foundation stylesheet and
fonts. To copy components into another Svelte app, bring along their imported
helpers, CSS, dependencies and the foundation styles, then adapt the import
aliases to that app. Retain the license and attribution notices with copied code.
Demos in [`src/demos/`](./src/demos/) show the component APIs and Svelte snippets.

## Validate changes

```sh
vp check
vp test
vp run check
vp run lint
vp run build
```

`vp check` is Vite+'s format/lint/type gate; `vp run check` runs Svelte's dedicated
checker. GitHub Actions runs these checks for pushes and pull requests.
The [browser regression guide](./tests/phase5/README.md) explains how to install
the separate test dependencies and pinned upstream reference for motion comparisons.

## Repository layout

| Path                     | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `src/lib/components/`    | Svelte components, types and CSS          |
| `src/lib/motion/`        | Shared native motion and presence helpers |
| `src/lib/foundation.css` | Arc's design tokens and foundation styles |
| `src/demos/`             | Component examples                        |
| `src/routes/`            | SvelteKit gallery                         |
| `tests/phase5/`          | Source-comparison browser workflows       |
| `static/media/`          | Demo photographs and their credits        |

Contributions are welcome; read [CONTRIBUTING.md](./CONTRIBUTING.md).
Publication instructions are in [PUBLISHING.md](./PUBLISHING.md).

## License and credit

The original Arc code and this port are distributed under the **MIT License**.
Original component designs and React implementations are by **Elia Kuratli**;
the Svelte port and its changes are by **Michael** and contributors.

Keep the copyright and license notices when redistributing this code or
substantial portions of it. See [LICENSE](./LICENSE) and the unmodified
[upstream license](./LICENSES/arc-library-MIT.txt).

Demo photographs, fonts and icons have their own licenses. They are identified
in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md); the code's MIT license does
not replace those licenses.
