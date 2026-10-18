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

## Publish the clean branch

In the originating development checkout, the local history contains old handoff
reports. A separate
`github-public` branch is prepared as a clean snapshot with no development-history
parents. The original `main` branch stays local and retains that history.
Use the clean branch for publication and future public work. These steps apply
to the originating checkout; collaborators cloning GitHub can work on its public
`main` branch normally.

Create an **empty** GitHub repository (without a generated README, license or
.gitignore), then replace the example owner below with your GitHub username:

```sh
git switch github-public
git remote add origin https://github.com/YOUR-USERNAME/arc-svelte.git
git push --set-upstream origin github-public:main
```

If `origin` already exists, inspect `git remote -v` and use the correct remote
instead of adding it again. Push the explicit branch above; do not use `--all`
or `--mirror`, which would also expose local development history. Do not merge
the local historical `main` branch into the public branch. Fresh collaborators
can clone GitHub's `main` normally. For subsequent commits from the local
`github-public` branch, use `git push origin HEAD:main` explicitly.

## Included and excluded files

The public tree includes source, demos, ROADMAP.md, porting notes, tests, lockfiles,
contributor instructions, CI and license/asset notices. `.gitignore` excludes the
detailed local port checklist, reference clone, local handoffs/reports, installed
dependencies, environment files and builds.
The clean branch excludes these files from both its tree and its ancestry.

GitHub Actions runs format/lint/type checks, Svelte checks, unit tests and a build.
The browser comparison suite needs its separate reference clone and dependencies;
follow tests/phase5/README.md to run it locally.

After choosing the final repository URL, add that URL to package.json's repository
metadata if desired. No owner, remote URL or hosted demo URL is guessed here.
