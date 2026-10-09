# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static marketing website for Max Analytics (HTML pages plus `css/`, `js/`, `assets/`; deployed via Firebase Hosting — see `firebase.json`).

## Comments — no comment over 2 lines, except file-level block comments

No comment may span more than **2 lines**. The single exception is a **file-level block comment** — the header comment at the very top of a file describing the file as a whole. Everything else (inline comments, comments above a function/const, end-of-line comments) fits in 2 lines or fewer.

**Why:** a comment you can eyeball as "≤ 2 lines" stays scannable and cheap to keep in sync with the code. A taller comment is a signal the rationale outgrew the call site — move it into this `CLAUDE.md` (cross-cutting) or a `README.md` (localized) and leave a short comment citing it by name. The file-level header is exempt because it documents the file as a whole and is read once on open.

**How to apply — enforce on all new code additions:** every comment you write or touch is ≤ 2 lines except a top-of-file block comment; when one needs more, move the overflow to a doc and trim the comment to a pointer; when you edit a file with an over-length non-header comment in the code you're touching, trim it in the same change.

## Pages build into dist/: edit partials, preview the build

Shared markup (menu, footer, head snippets) lives once in `partials/` and is placed by `<!-- partial:name -->` markers. `npm run build` expands them into `dist/`, which Firebase serves and deploys.

**How to apply:**
- Never paste a partial's markup into a page; add a marker. When markup repeats on a second page, make it a partial.
- Never edit `dist/`; it is rebuilt from scratch.
- Preview with `npm run dev`, never the raw files or a static server on the repo root.

Details: README "Build and partials".

## Delete unused assets and files

When a change leaves an image, stylesheet, script, page or other file that nothing uses, delete it in the same change. Never keep a superseded original, a `.old` copy or an unused variant "just in case"; git history keeps it.

**Why:** everything in the repo root ships to `dist/` and is deployed, so a dead file costs deploy size, can be crawled, and makes the next person wonder whether it matters.

**How to apply:**
- Before calling a change done, check that every file it replaced or stopped referencing is gone. `npm run build` warns "Unused images still deployed"; treat that warning as a to-do, not noise.
- List the deleted files in the change summary so the reviewer sees them.
