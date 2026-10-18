# Publishing this repository to GitHub

## License

Arc's public source is MIT-licensed. MIT permits modifying and redistributing it,
including a public Svelte port, provided the copyright and permission notices
accompany copies or substantial portions of the software.

This repository keeps the original author credited in LICENSE and retains the
unmodified upstream notice under LICENSES/. Michael's copyright applies to the
port's contributions; it does not replace Elia Kuratli's copyright. The README
identifies the port as independently maintained. Demo media, fonts and icons
retain the licenses described in THIRD_PARTY_NOTICES.md.

This prepares a GitHub source repository. `private: true` in package.json prevents
accidental npm publication; it does not prevent making the GitHub repository public.
Packaging an npm release or a component registry is separate work.

## Public branch

The public repository is [michaelcosj/arc-svelte](https://github.com/michaelcosj/arc-svelte).
Its default branch is `main`, which starts from a clean snapshot without the
original development history. Use `main` for future public work:

```sh
git switch main
git push origin main
```

In the originating checkout, the old history is retained only on
`local/development-history`. The `github-public` branch records the initial
publication snapshot; it is no longer the default branch. Local backup branches
also remain for recovery. Do not merge historical or backup branches into public
work, or push with `--all` or `--mirror`, which would expose local development
history. Fresh collaborators can clone GitHub's `main` normally.

## Included and excluded files

The public tree includes source, demos, ROADMAP.md, porting notes, tests, lockfiles,
contributor instructions, CI and license/asset notices. `.gitignore` excludes the
detailed local port checklist, reference clone, local handoffs/reports, installed
dependencies, environment files and builds.
The clean branch excludes these files from both its tree and its ancestry.

GitHub Actions runs format/lint/type checks, Svelte checks, unit tests and a build.
The browser comparison suite needs its separate reference clone and dependencies;
follow tests/phase5/README.md to run it locally.

Package and registry releases remain separate work; choose their distribution
metadata and hosting when preparing those releases.
