# Contributing

This is an independent Svelte port of Arc's MIT-licensed public components.
Check the [roadmap](./ROADMAP.md) before choosing work and read the
[porting notes](./docs/PORTING.md) for conventions and intentional differences.

## Development

Use Node.js 24 and [Vite+](https://viteplus.dev/guide/).

```sh
vp install --frozen-lockfile
vp run dev
```

Use Svelte 5 runes and snippets. Use Bits UI for the project's accessible
primitives. Keep animation code native to Svelte/browser APIs and the shared
`src/lib/motion/` helpers. Preserve Arc's design tokens, source behavior and
reduced-motion support. Record intentional differences in the porting notes.

The public [upstream React repository](https://github.com/kuratlielia/arc-library)
can be cloned into the ignored `reference/arc-library/` directory for comparison.
Never edit that reference. The [browser test guide](./tests/phase5/README.md)
records the exact revision and isolated dependencies used by the regression suite.

## Before opening a pull request

```sh
vp check
vp test
vp run check
vp run lint
vp run build
```

For a UI change, verify the affected demo against the reference at the same
viewport, including keyboard interaction, reduced motion and interrupted animations.
Run the relevant existing browser workflow when available. Include useful visual
evidence and describe any untested cases. Keep component exports, demos, the roadmap and relevant verification notes
aligned with the actual verification status.

Keep local reports under the ignored `handoff/` directory. Do not commit local
handoffs, dependency directories, environment files, access tokens or generated
builds. Keep upstream copyright and license notices with adapted source; identify
new third-party material and its license. Contributions are provided under the
repository's MIT license, subject to retained third-party notices.
