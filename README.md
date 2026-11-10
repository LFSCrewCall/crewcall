# Crew Call

Crew Call is a shared calendar for LFS students. Post a shoot, mark the days you're free, find crew by role, term, cohort and kit, develop scripts and producer pitches, find marketing help for finished films, and sync your shoots to Outlook. For MA Filmmaking, Screenwriting, Film Producing, Film Marketing and International Film Business students. The About page in the app explains it in plain words.

It's run by students and is not an official LFS service.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The page structure |
| `style.css` | Colours, fonts and layout |
| `app.js` | How the app works |
| `config.js` | The two Supabase settings. Empty means demo mode with sample data. Filled in means the live app, saved in the cloud |
| `cloud.js` | Connects to Supabase: sign-in codes, loading and saving every change |
| `vendor/supabase/` | The Supabase browser library (MIT licence), stored here rather than loaded from elsewhere |
| `data.js` | The lists (roles, kit, terms, courses and cohort codes, term dates) plus sample people and projects |
| `emails/digest-template.js` | The weekly digest email. Edit wording and colours here. |
| `emails/newsletter-template.js` | The newsletter email that admins design in Admin, then Newsletter |
| `i18n.js`, `i18n-dict.js`, `tools/i18n/` | Languages: English, 繁體中文, 简体中文, Français, Español, Русский, العربية, हिन्दी, Português. Edit the text files, then run `python3 tools/build_i18n.py`. See `docs/TRANSLATION.md` |
| `emails/weekly-digest-example.html` | An example digest. Open it in a browser to see it. |
| `docs/SETUP.md` | Step-by-step launch guide, and how data is saved |
| `docs/HANDOVER.md` | How to run Crew Call and hand it to the next cohort |
| `docs/BACKUPS.md` | Nightly backups, and how to restore |
| `docs/LFS-REQUEST.md` | Draft email asking LFS to OK the name, the mass email alias, privacy and safety contacts |
| `supabase/schema.sql` | The database (`records`, `emails`) and its privacy rules, ready to paste into Supabase |
| `supabase/functions/crewcall/index.ts` | The email, calendar and nightly server piece. Built from `tools/crewcall-function.ts` by `python3 tools/build_function.py`, which copies in the email designs, so rebuild after editing either |
| `supabase/jobs.sql` | Starts the timers that run the server piece (every 10 minutes, hourly and nightly) |
| `.github/workflows/backup.yml` | The nightly backup job. Move it to the private `crewcall-backups` repository (see `docs/SETUP.md`, step 9) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Let people add Crew Call to their phone's home screen |
| `LICENSE` | The MIT licence for Crew Call (see Licence below) |

## Admin and handover

- One owner and any number of admins. The owner ticks each admin's permissions (People, Projects, Terms and lists, Email settings, Reports and privacy, Newsletter: draft, Newsletter: send) and can transfer ownership. Each cohort has a rep, who is an admin and can propose a new owner when the owner leaves.
- Develop, Shoot, Release and Paid boards each switch between cards, a table and a timeline. Paid is for paid outside work; school shoots are in kind.
- The newsletter has designed issues (with saved versions and Send another) and an automatic edition built from Crew Call each month.
- Admin opens on an Overview (a to-do list, coming school dates and stats). The rest is grouped: People (Access, Handover), Content (Projects, Reports, Newsletter, Languages), School calendar (Terms and cohorts, Lists) and Settings and data (Email, Privacy and data, Activity). On a phone the sections are in a dropdown.
- The calendar shows LFS key dates: enrolment and induction days, term starts and ends, and the day each cohort finishes.
- Newsletter: admins with the draft level design issues and ask for approval; admins with the send level approve and send. With second approval on (the default), nobody sends their own work.
- Each project has a crew hub for its WhatsApp group, key links (call sheet, script, Drive folder) and details. Locked crew only by default.

## Open source

Crew Call uses open source and open data wherever it can, so it stays free: Leaflet and OpenStreetMap for maps and location links, Nominatim for address search, Unicode CLDR (built into every browser) for dates in each language, OpenCC for Simplified Chinese, Wikidata for checking role names, and the Archivo and JetBrains Mono fonts, which are stored in `vendor/fonts` rather than loaded from Google. The full list, with licences, is on the About page.

## Status

With `config.js` empty, Crew Call runs as a demo with sample people, and nothing is saved. Fill in `config.js` with a Supabase project (see `docs/SETUP.md`) and it becomes the live app: sign-in by emailed code, everything saved in the cloud, and the sample data is no longer shown. The demo stays available at the live address with `?demo` on the end. Emailed notifications, the digest, newsletter sending, calendar subscription links and the nightly clean-up run in one free Supabase Edge Function (`docs/SETUP.md`, step 10).

## Rules for this repository

- The code repository can be public (it has no secrets). Backups must go in a separate **private** repository, because they contain people's profiles.
- Never upload passwords, the email sender's SMTP password or the Supabase service key. Only the Supabase publishable key goes in the code.
- Every change saved here goes live on GitHub Pages within a minute or two. If something breaks, revert the commit.

## Licence

The Crew Call code, docs and translations are under the MIT licence (see `LICENSE`). Anyone can use, change and share them, including other film schools, as long as the licence notice stays in.

What the licence doesn't cover:

- **People's data.** Profiles, projects and emails in the database belong to the people who entered them. They are never part of this repository.
- **The LFS name and logo.** Crew Call is run by students and is not an official LFS service. Anyone reusing the code for another school should remove the LFS references.
- **Third-party parts.** These keep their own licences, which sit next to them: Leaflet (BSD 2-Clause, `vendor/leaflet/LICENSE`), the Supabase library (MIT, `vendor/supabase/LICENSE`) and the Archivo and JetBrains Mono fonts (SIL Open Font Licence, `vendor/fonts/`). OpenStreetMap map data is © OpenStreetMap contributors (ODbL), and the credit shows on the map. Wikidata is CC0.

## Helping out

- **Wrong word in a language?** Use the Wrong word? button in the app, or edit the text files in `tools/i18n/` (see `docs/TRANSLATION.md`).
- **Found a bug or want a feature?** Open an issue on GitHub, saying which page you were on and what you expected to happen.
- **Changing code?** Make the change on a branch and open a pull request. An admin checks it in the preview before merging, because merging puts it live.
