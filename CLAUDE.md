# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static marketing website for Max Analytics (HTML pages plus `css/`, `js/`, `assets/`; deployed via Firebase Hosting — see `firebase.json`).

## Comments — no comment over 2 lines, except file-level block comments

No comment may span more than **2 lines**. The single exception is a **file-level block comment** — the header comment at the very top of a file describing the file as a whole. Everything else (inline comments, comments above a function/const, end-of-line comments) fits in 2 lines or fewer.

**Why:** a comment you can eyeball as "≤ 2 lines" stays scannable and cheap to keep in sync with the code. A taller comment is a signal the rationale outgrew the call site — move it into this `CLAUDE.md` (cross-cutting) or a `README.md` (localized) and leave a short comment citing it by name. The file-level header is exempt because it documents the file as a whole and is read once on open.

**How to apply — enforce on all new code additions:** every comment you write or touch is ≤ 2 lines except a top-of-file block comment; when one needs more, move the overflow to a doc and trim the comment to a pointer; when you edit a file with an over-length non-header comment in the code you're touching, trim it in the same change.
