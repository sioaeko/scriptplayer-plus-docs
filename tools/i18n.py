#!/usr/bin/env python3
"""
Build the translated editions of the ScriptPlayer+ docs from index.html (ko).

Segments are whole block elements, not text nodes: word order differs between
Korean, English, Japanese and Chinese, so a fragment like "왼쪽 위 " cannot be
translated on its own. Each unit's inner HTML is translated as one string with
its inline tags kept in place.

Usage
  python tools/i18n.py extract          # write tools/lang/segments.json
  python tools/i18n.py build en ja zh   # write <lang>/index.html
  python tools/i18n.py status           # per-language coverage
"""

import json
import os
import re
import sys

from bs4 import BeautifulSoup, NavigableString

WS = re.compile(r"\s+")


def norm(s):
    """Collapse whitespace so a translation still matches when the source
    wraps differently or uses a non-breaking space."""
    return WS.sub(" ", (s or "").replace(" ", " ")).strip()


class Table(dict):
    """Exact lookup first, whitespace-normalised lookup second."""

    def __init__(self, *a, **k):
        dict.__init__(self, *a, **k)
        self._norm = {}

    def rebuild(self):
        self._norm = {norm(k): v for k, v in self.items()}
        return self

    def find(self, key):
        if key in self:
            return self[key]
        return self._norm.get(norm(key))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
LANG_DIR = os.path.join(ROOT, "tools", "lang")

# Elements whose inner HTML is one translation unit.
# Block-level units. One of these nested inside another means the outer one is
# a container (e.g. <li><h3>), so we recurse rather than take it whole.
BLOCK_UNITS = {
    "h1", "h2", "h3", "h4", "h5", "p", "li", "dt", "dd",
    "figcaption", "td", "th", "title", "caption", "pre",
}
# Inline units carry their own copy when they stand alone, but must NOT turn a
# paragraph or heading that contains one into a container — otherwise the
# surrounding prose would never be extracted.
INLINE_UNITS = {"a", "button"}
UNIT_TAGS = BLOCK_UNITS | INLINE_UNITS
# Units identified by class instead of tag.
UNIT_CLASSES = {"legend-desc", "note-title", "nav-link", "hero-meta", "vh"}
# Never descend into these.
SKIP_TAGS = {"script", "style", "svg", "code", "kbd"}
# The language switcher stays in each language's own name.
SKIP_CLASSES = {"lang-switch"}

# Attributes carrying human-readable text.
TEXT_ATTRS = ("alt", "title", "aria-label", "placeholder",
              # drive the document title, the pager and the search breadcrumbs
              "data-title", "data-group")

HANGUL = re.compile(r"[가-힣]")


def has_korean(s):
    return bool(HANGUL.search(s or ""))


def is_skipped(tag):
    if tag.name in SKIP_TAGS:
        return True
    # Only the switcher's links are exempt: each keeps its own language's name.
    # The container itself is not, so its aria-label still gets translated.
    if tag.name == "a" and any(
        set(p.get("class") or []) & SKIP_CLASSES for p in tag.parents if p.name
    ):
        return True
    return False


def is_unit(tag):
    if is_skipped(tag):
        return False
    if tag.name in UNIT_TAGS:
        return True
    classes = set(tag.get("class") or [])
    return bool(classes & UNIT_CLASSES)


def is_block_unit(tag):
    return not is_skipped(tag) and tag.name in BLOCK_UNITS


def inner_html(tag):
    return "".join(str(c) for c in tag.contents).strip()


def collect(soup):
    """Ordered, de-duplicated list of translatable strings."""
    units, attrs = [], []

    def walk(node):
        for child in list(node.children):
            if isinstance(child, NavigableString):
                continue
            if is_skipped(child):
                continue
            if is_unit(child):
                # a unit that contains another unit (e.g. <li><h3>) is a
                # container: recurse instead of taking it whole
                nested = any(is_block_unit(d) for d in child.find_all(True))
                if not nested:
                    html = inner_html(child)
                    if has_korean(html):
                        units.append(html)
                    continue
            walk(child)

    walk(soup)

    for tag in soup.find_all(True):
        if is_skipped(tag):
            continue
        for a in TEXT_ATTRS:
            v = tag.get(a)
            if v and has_korean(v):
                attrs.append(v)
        if tag.name == "meta" and has_korean(tag.get("content") or ""):
            attrs.append(tag["content"])

    def dedupe(seq):
        seen, out = set(), []
        for s in seq:
            if s not in seen:
                seen.add(s)
                out.append(s)
        return out

    return dedupe(units), dedupe(attrs)


def load_src():
    with open(SRC, encoding="utf-8") as f:
        return BeautifulSoup(f.read(), "html.parser")


def cmd_extract():
    units, attrs = collect(load_src())
    os.makedirs(LANG_DIR, exist_ok=True)
    out = os.path.join(LANG_DIR, "segments.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"units": units, "attrs": attrs}, f, ensure_ascii=False, indent=1)
    total = sum(len(s) for s in units + attrs)
    print("units: %d   attrs: %d   chars: %d" % (len(units), len(attrs), total))
    print("wrote", os.path.relpath(out, ROOT))


def load_map(lang):
    """Merge tools/lang/<lang>.json with any tools/lang/<lang>/*.json parts.

    Splitting a language across parts keeps each file small enough to edit
    without rewriting the whole table.
    """
    table = Table()
    flat = os.path.join(LANG_DIR, lang + ".json")
    if os.path.exists(flat):
        with open(flat, encoding="utf-8") as f:
            table.update(json.load(f))

    part_dir = os.path.join(LANG_DIR, lang)
    if os.path.isdir(part_dir):
        for name in sorted(os.listdir(part_dir)):
            path = os.path.join(part_dir, name)
            if name.endswith(".json"):
                with open(path, encoding="utf-8") as f:
                    table.update(json.load(f))
            elif name.endswith(".txt"):
                table.update(parse_pairs(path))
            elif name.endswith(".idx"):
                table.update(parse_indexed(path))
    return table.rebuild()


def parse_pairs(path):
    """Read a delimited bilingual file.

    «ko»
    source text, may span lines
    «t»
    translation, may span lines

    Guillemet markers never occur in the content, so nothing needs escaping —
    which matters because most segments contain HTML quotes.
    """
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    table = {}
    for block in raw.split("«" + "ko" + "»"):
        if "«" + "t" + "»" not in block:
            continue
        src, _, dst = block.partition("«" + "t" + "»")
        src, dst = src.strip("\n"), dst.strip("\n")
        if src and dst:
            table[src] = dst
    return table


def parse_indexed(path):
    """Read translations keyed by segment index.

    Each record is "<n>|<translation>", where <n> is the position in the
    canonical segment order (see `python tools/i18n.py list`). Keeping the
    source text out of the file avoids retyping it once per language; the
    index is resolved against the frozen indexed-segments.json snapshot.
    New translations should use text-keyed JSON parts so source edits cannot
    shift an existing translation onto a different paragraph.
    """
    with open(os.path.join(LANG_DIR, "indexed-segments.json"), encoding="utf-8") as f:
        snapshot = json.load(f)
    segments = snapshot["units"] + snapshot["attrs"]

    table = {}
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    for record in raw.split("\n@"):
        record = record.lstrip("@").strip("\n")
        if not record or "|" not in record:
            continue
        head, _, body = record.partition("|")
        head = head.strip()
        if not head.isdigit():
            continue
        i = int(head)
        if i >= len(segments):
            print("  ! index %d out of range (%d segments)" % (i, len(segments)))
            continue
        body = body.strip("\n")
        if body.strip():
            table[segments[i]] = body
    return table


def cmd_list():
    units, attrs = collect(load_src())
    for i, s in enumerate(units + attrs):
        print("%d\t%s" % (i, s.replace("\n", "\\n")))


def cmd_status(langs):
    units, attrs = collect(load_src())
    need = units + attrs
    for lang in langs:
        m = load_map(lang)
        done = sum(1 for s in need if m.find(s))
        print("%s: %d/%d segments (%.0f%%)" % (lang, done, len(need), 100.0 * done / len(need)))


def cmd_build(langs):
    for lang in langs:
        table = load_map(lang)
        soup = load_src()
        missing = []

        # <html lang>
        soup.html["lang"] = lang

        # assets sit one level up from <lang>/
        for tag in soup.find_all(True):
            for a in ("href", "src", "data-src"):
                v = tag.get(a)
                if v and v.startswith("assets/"):
                    tag[a] = "../" + v

        # translate units
        def walk(node):
            for child in list(node.children):
                if isinstance(child, NavigableString):
                    continue
                if is_skipped(child):
                    continue
                if is_unit(child):
                    nested = any(is_block_unit(d) for d in child.find_all(True))
                    if not nested:
                        html = inner_html(child)
                        if has_korean(html):
                            new = table.find(html)
                            if new:
                                child.clear()
                                frag = BeautifulSoup(new, "html.parser")
                                for c in list(frag.contents):
                                    child.append(c)
                            else:
                                missing.append(html)
                        continue
                walk(child)

        walk(soup)

        # translate attributes
        for tag in soup.find_all(True):
            if is_skipped(tag):
                continue
            for a in TEXT_ATTRS + ("content",):
                v = tag.get(a)
                if v and has_korean(v):
                    new = table.find(v)
                    if new:
                        tag[a] = new
                    else:
                        missing.append(v)

        # language switcher: mark the active entry, fix sibling links
        for a in soup.select(".lang-switch a"):
            code = a.get("data-lang")
            a["href"] = ("../index.html" if code == "ko" else "../%s/index.html" % code)
            if code == lang:
                a["aria-current"] = "true"
            elif a.has_attr("aria-current"):
                del a["aria-current"]

        out_dir = os.path.join(ROOT, lang)
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, "index.html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(str(soup))

        uniq = []
        seen = set()
        for m in missing:
            if m not in seen:
                seen.add(m)
                uniq.append(m)
        print("%s -> %s   untranslated: %d" % (lang, os.path.relpath(out, ROOT), len(uniq)))
        if uniq:
            for m in uniq[:8]:
                print("    ", m[:90])


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
    elif args[0] == "extract":
        cmd_extract()
    elif args[0] == "list":
        cmd_list()
    elif args[0] == "build":
        cmd_build(args[1:] or ["en", "ja", "zh"])
    elif args[0] == "status":
        cmd_status(args[1:] or ["en", "ja", "zh"])
    else:
        print(__doc__)
