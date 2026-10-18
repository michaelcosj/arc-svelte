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
A shadcn-svelte-compatible source registry and GitHub Pages deployment workflow
are included. It is not published as an npm package.
`private: true` in `package.json` prevents accidental npm publication; it does not
restrict GitHub access.

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

## Component registry

The registry includes all 96 implemented components, their dependencies and an
`all` item. Packaging does not change their verification status above. Generated
files come directly from `src/lib/`; there is no second copy of the components.

Browse and install from the live registry at
[michaelcosj.github.io/arc-svelte](https://michaelcosj.github.io/arc-svelte/).
GitHub Pages hosting is free for public repositories on GitHub Free. No custom
domain or DNS setup is required; a custom domain is optional branding.
See [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

To build and preview the registry locally:

```sh
vp run registry:build
vp run registry:preview
```

Open `http://localhost:5300` for the component list. Arc requires Svelte 5.57.1+
and TypeScript. It uses plain CSS; Tailwind and a full shadcn setup are not required.
The installer needs a `components.json` file to locate your library and stylesheet.
Keep your existing configuration if you already use shadcn-svelte.

<details>
<summary>Minimal setup for a project without shadcn-svelte</summary>

Create `components.json` in your project root:

```json
{
	"$schema": "https://shadcn-svelte.com/schema.json",
	"typescript": true,
	"tailwind": { "css": "src/app.css", "baseColor": "neutral" },
	"aliases": {
		"lib": "$lib",
		"components": "$lib/components",
		"ui": "$lib/components/ui",
		"hooks": "$lib/hooks",
		"utils": "$lib/utils"
	}
}
```

Point `tailwind.css` to an existing stylesheet; despite the CLI's field name,
this can be ordinary CSS. Match the aliases to your TypeScript configuration
(SvelteKit provides `$lib` by default). No Tailwind installation is needed.

</details>

Install an item using its full URL. `--skip-preflight` allows installation without
Tailwind by skipping the CLI's framework checks; the configuration above is still
required:

```sh
vp dlx -- shadcn-svelte@1.7.0 add --skip-preflight https://michaelcosj.github.io/arc-svelte/r/button.json
```

Replace `button` with another component name, or use `/r/all.json` to install every
component. For local testing, use `http://localhost:5300/r/button.json` instead.
The CLI installs under your configured
`lib` alias, keeping Arc separate from existing shadcn components:

```svelte
<script lang="ts">
	import { Button } from '$lib/arc/components/button/index.ts';
</script>

<Button label="Save changes" />
```

Adapt `$lib` if your project uses a different lib alias. Entry points load the
shared foundation CSS automatically; default installs (including `all`) add no font
packages. Components use your `--font-sans` token when available, otherwise system
fonts. Override `--font-body` and `--font-display` to use a different app font stack.
The foundation defines
global design tokens and focus styles; review them alongside your app's theme.
Set `data-theme="dark"` on the document root for Arc's dark palette. Keep the
installed `arc/LICENSE.txt` when redistributing the source.

### Optional fonts

To match the gallery typography, install the optional font item:

```sh
vp dlx -- shadcn-svelte@1.7.0 add --skip-preflight https://michaelcosj.github.io/arc-svelte/r/arc-fonts.json
```

Then import `$lib/arc/fonts.css` once in your root layout (adapt `$lib` to your lib alias).
This explicitly activates Inter and Geist. The gallery opts into those fonts;
component installs do not require them. Updating registry files does not uninstall
previously added font packages; remove old imports and unused packages in existing
apps if you no longer want those fonts.

### Publish with GitHub Pages

The `Publish registry` workflow builds and tests the standalone registry site;
it does not deploy the SvelteKit demo gallery. Generated output is in the ignored
`registry-dist/` directory. No hosting URL is embedded in dependency JSON files.

1. In GitHub **Settings → Pages**, select **GitHub Actions** as the source.
2. Push the registry commits to `main`, or run **Actions → Publish registry → Run
   workflow** if the workflow is already on GitHub. Later relevant pushes redeploy it.
3. Optionally, in Pages settings, add your custom subdomain before setting its DNS record.
   A subdomain such as `ui.example.com` uses a `CNAME` named `ui` pointing to
   `michaelcosj.github.io`. Enable **Enforce HTTPS** once GitHub validates it.

Without a custom domain, the project registry can be served at
`https://michaelcosj.github.io/arc-svelte/`. With your domain, it uses that domain's
root; dependency URLs and the landing page work in both locations.

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
Run `vp run test:registry` to install Button and then all 96 components with the
real CLI in a fresh consumer, followed by its type check and production build.
This networked check uses a custom lib alias in a separate temporary project and
records its path under ignored `handoff/registry/`; it also runs before deployment.

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
