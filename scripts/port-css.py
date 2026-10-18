#!/usr/bin/env python3
"""Port a CSS module to Arc for Svelte's BEM-ish class names.

    scripts/port-css.py <name> <in.module.css> [--root badge] [--mod neutral,success,sm,md] [--prefix arc-<name>]

`.root` (or the --root class) becomes `.arc-<name>`, classes listed in --mod become
`.arc-<name>--<kebab>`, and every other class `.foo` becomes `.arc-<name>__foo` (camelCase → kebab).
Keyframe names are prefixed too. Writes to stdout.
"""
import re, sys, argparse

ap = argparse.ArgumentParser()
ap.add_argument('name')
ap.add_argument('file')
ap.add_argument('--root', default=None)
ap.add_argument('--mod', default='')
ap.add_argument('--prefix', default=None)
a = ap.parse_args()
prefix = a.prefix or f'arc-{a.name}'
roots = {'root'} | ({a.root} if a.root else set())
mods = {m for m in a.mod.split(',') if m}
src = open(a.file).read()

def kebab(s):
    return re.sub(r'(?<=[a-z0-9])([A-Z])', r'-\1', s).lower()

# Keyframes
frames = set(re.findall(r'@keyframes\s+([\w-]+)', src))
for f in frames:
    src = re.sub(rf'(?<![\w-]){re.escape(f)}(?![\w-])', f'{prefix}-{kebab(f)}', src)

# Class selectors: protect strings/urls minimal; module CSS rarely has dots in values except numbers (.5) which are preceded by digit/space.
def repl(m):
    cls = m.group(1)
    if cls in roots:
        return f'.{prefix}'
    if cls in mods:
        return f'.{prefix}--{kebab(cls)}'
    return f'.{prefix}__{kebab(cls)}'

# a class selector is a dot followed by an identifier starting with a letter/underscore, not preceded by a digit
out = re.sub(r'(?<![\w\d])\.([A-Za-z_][\w-]*)', repl, src)
# compound selectors (.a.b): a class glued to one just converted
compound = re.compile(rf'(\.{re.escape(prefix)}[\w-]*)\.(?!{re.escape(prefix)}[_-])([A-Za-z_][\w-]*)')
while True:
    nxt = compound.sub(lambda m: m.group(1) + repl(re.match(r'\.(.*)', '.' + m.group(2))), out)
    if nxt == out:
        break
    out = nxt
# undo damage inside numbers like "0.5" was avoided by lookbehind; also undo in url(...) and quoted strings
sys.stdout.write(out)
