# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Registration forms for Vicky De Palma's yoga events (@vicky.depalma), plus an index page listing them. Static site: no build step, no dependencies, no package manager. Content and code comments are in Spanish.

## Structure

- `index.html` — event list. Events live in the `EVENTOS` array (`carpeta`, `activo`, `emoji`, `tipo`, `nombre`, `fecha`, `hora`, `lugar`, `precio`, `boton`, `tema`); card colors come from the `TEMAS` palettes. `activo: false` moves an event to "Eventos pasados".
- `<carpeta>/index.html` — one registration form per event.
- `assets/forms.css` — shared form styles. Every color is a CSS variable on `:root` (defaults = Power Bootcamp's light palette). An event overrides the variables it needs in its own `<style>` and adds only its own decorations there (floating `.deco` emojis via `--deco-anim`, `.hero-emoji` via `--hero-anim`, special boxes, collaborator logo styles).
- `assets/form.js` — shared form logic: country code list + phone validation, submit, success screen, calendar picker (Google / Apple .ics / Outlook, rendered into `#cal-wrap`), share button. The header comment lists the required element ids.
- `apps-script/registro.gs` — the single Google Apps Script for all events (deployed from Google, not from here).
- `108-saludos-al-sol/` — past event, still in the old all-in-one-file format. Leave it as is.
- Logos: `vickydepalma.png`, `vickydepalma-lila.png`, `vickydepalma-crema.png` (index header), `eventieluce.png`.

## Adding an event form

1. Copy the most similar existing event folder (`power-bootcamp` for light themes, `halloween-yoga` for dark).
2. Edit the `EVENTO` object at the bottom: `id` (e.g. `yoga-navidad-2026`, used as the Sheet tab name and calendar UID), `nombre`, `archivo`, `calendario` (`inicio`/`fin` in Madrid local time, `"YYYY-MM-DD HH:MM"`; UTC conversion and DST are handled by `form.js`), `compartir`. Omit `hojaUrl` so it uses the shared Apps Script.
3. Questions with buttons are `<div class="radio-group" data-campo="…" data-falta="…">` with radios `name="…"`; each is required and sent as `{ campo: valor }`. Name and WhatsApp are always there.
4. Set the palette variables in `:root`, the header texts, the success screen, and the footer/logos for the collaborators.
5. Add the event to `EVENTOS` (and a `TEMAS` palette if needed) in the root `index.html`.

## Submission / Google Sheets

`form.js` POSTs JSON with `mode: 'no-cors'` (opaque response; success is assumed if fetch doesn't throw). Payload: `nombre`, `whatsapp` (`"34 612345678"`), one key per `data-campo`, and `evento` (the `EVENTO.id`) when using the shared script.

- Shared script: URL in `REGISTRO_URL` at the top of `assets/form.js`. `registro.gs` writes each event to a tab named after `evento` (created automatically, new questions become new columns) and keeps a `Contactos` tab with one row per WhatsApp number and the events each person attended.
- Events with their own older Apps Script set `hojaUrl` in `EVENTO` (Power Bootcamp); `evento` is not sent to those.

## Development

Open any `index.html` directly in a browser — no server needed. End-to-end submission needs the live Apps Script deployment.

## Git workflow

The repo owner is the only collaborator. Once changes have been discussed and agreed, commit and push directly to `main` — no feature branch or pull request needed.
