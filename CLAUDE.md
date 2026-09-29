# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page registration form for "108 Saludos al Sol" — a yoga event held on June 21 (Día Internacional del Yoga) at Parque El Retiro, Madrid. Organized by @vicky.depalma and @eventieluce.

The entire project is one file: `index.html` — no build step, no dependencies, no package manager.

## Architecture

**`index.html`** contains everything: HTML structure, embedded CSS, and inline JavaScript.

Key pieces:
- **Form fields**: full name, WhatsApp number (country code selector + local number), yoga level (radio), photo consent (radio)
- **Phone validation**: `phoneRules` object maps country codes to `{min, max, pattern, hint}`. Validation strips non-digits and checks length + optional prefix pattern per country.
- **Submission**: `handleSubmit()` POSTs JSON to a Google Apps Script Web App (`SHEETS_URL`) using `mode: 'no-cors'` (response is opaque; success is assumed on no-throw).
- **Success state**: on submit success, hides `#form-content` and shows `#success-card`.
- **Calendar export**: `addToCalendar()` generates an `.ics` file (VCALENDAR) and triggers a download. Event is hardcoded to `20260621T080000Z–20260621T100000Z` (10:00–12:00 Madrid time, UTC offset +2 in summer).

## Google Sheets Integration

Registrations go to a Google Sheet via a deployed Apps Script. The endpoint is in `SHEETS_URL`. To update or redeploy the Apps Script, do so from the Google Apps Script editor — the URL must be updated in `index.html` if a new deployment is created.

Fields sent: `nombre`, `whatsapp` (formatted as `"countryCodeDigits localDigits"`, e.g. `"34 612345678"`), `nivel`, `fotos`.

## Development

Open `index.html` directly in a browser — no server needed. To test the form submission end-to-end, a live Google Apps Script deployment is required (the `no-cors` fetch will silently succeed or fail based on network reachability).

## Git workflow

The repo owner is the only collaborator. Once changes have been discussed and agreed, commit and push directly to `main` — no feature branch or pull request needed.
