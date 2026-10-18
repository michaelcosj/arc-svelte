# Third-party notices

## Arc UI / arc-library

This repository adapts Arc's public MIT-licensed React components, design tokens,
styles and demo content to Svelte. Original author: **Elia Kuratli**.

- Source: <https://github.com/kuratlielia/arc-library>
- Original demos: <https://uiarc.dev>
- Comparison reference: commit `86330cc9270c4acc55b7204c9583fcbaa378192c`
- License: [upstream MIT notice](./LICENSES/arc-library-MIT.txt)

[LICENSE](./LICENSE) retains Elia's copyright and covers the Svelte port's
contributions as well. The port is independently maintained; the project name
and attribution do not imply endorsement by the original author.

## Demo photographs

Photographs under `static/media/people/` and `static/media/photos/` come from
Unsplash and remain under the [Unsplash License](https://unsplash.com/license).
The per-image photographers, source links and crop information are preserved in
[static/media/CREDITS.md](./static/media/CREDITS.md). The names and roles used in
demos are fictional sample content. The people pictured do not endorse this project.
These photographs are not relicensed under the repository's MIT license.

## Fonts and icons

| Material                                | Copyright / source                                                      | License notice                                        |
| --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Inter, via `@fontsource-variable/inter` | The Inter Project Authors; <https://github.com/rsms/inter>              | [SIL Open Font License 1.1](./LICENSES/Inter-OFL.txt) |
| Geist, via `@fontsource-variable/geist` | The Geist Project Authors; <https://github.com/vercel/geist-font>       | [SIL Open Font License 1.1](./LICENSES/Geist-OFL.txt) |
| Lucide icons, via `@lucide/svelte`      | Lucide Icons and Contributors; <https://github.com/lucide-icons/lucide> | [ISC](./LICENSES/Lucide-ISC.txt)                      |

Font and icon packages are installed as dependencies rather than vendored source.
If distributing built assets containing them, include their relevant notices.
Other installed dependencies retain the licenses provided in their own packages;
this document does not replace those package notices.
