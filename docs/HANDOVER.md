# Crew Call: handover document

Keep this document with the app. Whoever looks after Crew Call next should be able to run it from this page, without writing any code.

## What Crew Call is

Crew Call is a free, student-run website for LFS students to:

- post shoots and the roles they need
- mark the days they're free
- find crew by role, term, cohort and kit
- develop ideas: writers post scripts and producers post pitches looking for a writer or director
- get wrapped films to festivals: directors list finished films and marketing students offer posters, trailers, press kits and festival plans
- report a problem to the admins
- request to join a shoot

It is not an official LFS service.

## Who's who

| Job | Who | What they do |
|---|---|---|
| Owner (one person) | [name, term, cohort] | Signs in with their own school email. Has every permission, can't be removed, and is an Owner of the GitHub and Supabase organisations. First owner: chanchrisna.lee@student.lfs.org.uk. |
| Cohort reps (one per cohort) | [cohort: name] | Admins by default. Can hand their rep role to someone in their cohort, and can propose a new owner. The owner accepts, or, if the owner has graduated or not signed in for 30 days, a second rep agrees. Set in Admin, then Access, then Cohort reps. |
| Admins (2–3) | [names] | Do whatever their ticked permissions allow (see below). Everything is done inside the app, in Admin. |
| Producers and directors | Everyone who posts a project | Manage their own shoots, including the project's crew hub (WhatsApp group, key links and details). |

Have at least one admin from a younger intake, so someone is always still at school.

### Admin permissions

The owner ticks these for each admin in Admin, then Access. Every admin can see the Admin page, the handover checklist and the activity log.

| Permission | Lets them |
|---|---|
| People | Make or remove admins, remove guests, revoke invites, change someone's sign-in email |
| Projects | Edit, archive or delete any project |
| Terms and lists | Term dates, courses and cohort codes, fixing someone's cohort, roles and project types |
| Email settings | Sending address, help address, school mass email alias, digest day and time |
| Reports and privacy | Read and act on reports, delete old profiles, download and restore backups |
| Newsletter: draft | Design newsletters, save drafts, send a test to themselves and ask for approval |
| Newsletter: send | Approve, schedule and send a newsletter to everyone or a chosen group |

## Accounts

There's no shared Gmail. Everything belongs to an organisation with more than one owner, so it survives graduations.

| Account | What it holds | Who has access |
|---|---|---|
| GitHub organisation (e.g. crewcall-lfs) | The app's code and website (public `crewcall` repository, GitHub Pages) and the nightly backups (private `crewcall-backups` repository) | The owner and the reps as Owners, each with their own account ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)) |
| Supabase organisation | The database: every profile, project, free day, request, setting and sign-in, saved in the cloud (London region) | The owner as Owner, reps as Administrator or Developer. Every organisation needs at least one Owner ([Supabase access control](https://supabase.com/docs/guides/platform/access-control)). |
| Email sender | Sends sign-in codes, alerts, the digest and the newsletter | An LFS shared mailbox, Brevo free or a Gmail used only for sending. Nobody signs in to Crew Call with it. Its login lives in a password manager folder shared with the reps. |

| Brevo API key and cron secret | Let the server piece send emails (`BREVO_API_KEY`) and stop strangers starting its jobs (`CRON_SECRET`). Kept in Supabase, Edge Functions, Secrets; the cron secret is also in Supabase Vault from `supabase/jobs.sql` | Whoever can open the Supabase project. Keep a copy in the shared password manager folder |

- Everyone uses their own school email for GitHub and Supabase. Don't share personal logins.
- Before leaving, invite the next owner as Owner in both organisations, and wait until they accept.

## Every term

| When | Task | Where |
|---|---|---|
| First day of term | Check that everyone moved up a term. The app does this on its own and asks each person to confirm. | Admin, then Terms and cohorts |
| First two weeks | Fix anyone repeating a term, intermitting or on the wrong cohort code. After two weeks, cohorts lock. | Admin, Terms and cohorts, Fix someone's cohort |
| Start of term | Send a short reminder through the school's mass email alias: check your cohort code, and post your shoots. | Mass email alias |
| Any time | Remove guests who've finished working with students. | Admin, then Members |
| Within 2 days | Read new reports. Pass anything about safety, harassment or discrimination to LFS. | Admin, then Reports |
| Each term | Check the nightly backups are green, and download a copy from the app. | GitHub Actions, and Admin, Privacy and data |
| Each term | Check the Old profiles list. Deletion is automatic, but look for anyone who should be kept. | Admin, Privacy and data |

## Every year

- **September:** add the next year's term dates and enrolment days from [LFS key dates](https://lfs.org.uk/key-dates/), and check the finish dates in Admin, Terms and cohorts, Cohort dates. Dates lock once a term has started. 2026/27 to 2028/29 are already in.
- **Before the owner graduates:** open Admin, then Handover, and work through the checklist. It covers:
  - checking every cohort has a rep (Admin, then Access, then Cohort reps)
  - making two successors admins and ticking their permissions
  - transferring ownership (Admin, then Access, then Transfer ownership); the app records it under "Owners so far"
  - inviting the next owner as Owner in the GitHub and Supabase organisations
  - moving the email sender's login to the next owner, if you use Brevo or a sending-only Gmail
  - exporting a backup and removing graduating admins
  - updating the names in "Who's who" above
- **Once a year:** delete Alumni profiles that haven't been updated for a year, if you want to keep things tidy.

## Changing an email

- **Someone's sign-in email** (new address, typo, name change): Admin, then Access, then Change a sign-in email. Students must use an LFS address. Their projects follow them.
- **The app's own addresses** (sending address, help address, school alias): Admin, then Email. If you change the sending address, also put the new address and SMTP password into Supabase (Authentication, then Emails, then SMTP settings).

## Making changes without code

- **Day-to-day changes need no code.** Lists, term dates, guests and admins are all edited in the Admin page.
- **Bigger changes (a new feature, wording or a bug fix):**
  1. Write down the change in plain English and give it to whoever is helping, a student who codes or a coding tool, along with the GitHub repository and this document.
  2. They edit the code and save it to GitHub.
  3. GitHub Pages puts it live on its own in a minute or two.
- **If a change breaks something:** in GitHub, open the repository's commits, pick the change that broke it and choose Revert. The site goes back once Pages republishes.

## Where the data is kept

Everything is saved in the Supabase database, not on anyone's computer. Every change saves straight away, and a label at the bottom of the screen says "Saving…", then "Saved" (or "Offline" if the signal drops). Only the sign-in session stays on a device.

- Two tables hold it all: `records` (one row for each profile, project, request, setting and so on) and `emails` (addresses, kept apart so they stay private).
- The privacy rules are inside the database, in `supabase/schema.sql`, so they hold whatever happens to the website.
- To look at the data, open Supabase, then Table Editor. Don't edit rows there unless you have to: the app does it more safely.
- Backups: see `docs/BACKUPS.md`. The full launch steps are in `docs/SETUP.md`.

## If something goes wrong

| Problem | Likely cause | Fix |
|---|---|---|
| The site says the database is paused | Supabase pauses free projects after a week with no activity ([Supabase](https://supabase.com/docs/guides/platform/free-project-pausing)) | Sign in to Supabase and select Restore. The weekly digest normally prevents this. |
| Sign-in codes aren't arriving | The sender's SMTP password changed or was revoked, or its daily limit was hit | Make a new SMTP password (Brevo SMTP keys, or a Gmail app password). Paste it into Supabase under Authentication, then Emails, then SMTP settings. |
| Brevo says "525 Unauthorized IP address" | Brevo's IP blocking for SMTP keys is on | Brevo, Security, Authorized IPs: Deactivate for SMTP |
| Notification or newsletter emails stop | The Brevo API key was revoked, or the 300 a day limit was hit | Make a new key in Brevo, SMTP & API, API keys, and paste it into Supabase, Edge Functions, Secrets, `BREVO_API_KEY`. Over-limit emails go the next day on their own |
| A producer or director has changed | They've left the project | The current producer, director or an admin opens the project and presses Hand over |
| The nightly backup goes red | The database password changed | Put the new password into the `SUPABASE_DB_URL` secret in `crewcall-backups` |
| Emails arrive slowly | Supabase's sending limit is too low | In Supabase, raise the email rate limit under Authentication, then Rate Limits. |
| A new shoot isn't in someone's Outlook | Outlook checks subscribed calendars every few hours and sometimes takes up to a day ([Microsoft](https://support.microsoft.com/en-gb/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c)) | Wait, or check that they subscribed rather than downloading a one-off file. |
| Someone's in the wrong term | They skipped the confirm banner | Admin, then Fix someone's term. |

## Privacy

- **What's stored:** names, emails, roles, kit, availability and project details.
- **Emails stay hidden** unless the person chooses to share theirs. Only signed-in members can see shared emails.
- **The weekly digest is off by default.** People turn it on themselves.
- **Anyone can delete their profile** in their profile settings. If someone asks you to remove their data, show them how to delete their profile themselves. You can remove guests from the Admin page, and other members in Supabase under Table Editor.
- **Nobody is signed up automatically.** Students who never sign in don't appear anywhere, and Crew Call never emails them.

## Students who don't sign up

Crew Call still works when some people aren't on it.

- **Crew who aren't members:** producers can still list them on a role with "Someone not on Crew Call", so the crew list stays complete.
- **How to get people signing up:**
  - Get producers to post shoots first. Open roles are what bring crew in.
  - Mention it in cohort group chats and the start-of-term alias email.
  - Setting up a profile takes about a minute: cohort code (for example MAF217), roles and the days you're free.
- **No emails unless they ask:** members only get request alerts and updates about their own shoots. The weekly digest is opt-in.

## Costs

All of these are £0:

- [GitHub Free organisation and GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Supabase Free](https://supabase.com/pricing)
- The email sender: [Brevo free](https://www.brevo.com/free-smtp-server/), an LFS shared mailbox, or a sending-only Gmail

If the free limits are ever outgrown, ask the Student Union or the school before paying for anything yourself.

## Handover log

| Date | From | To | Notes |
|---|---|---|---|
| | | | |

## How terms and cohorts work

Nobody types their term. Each person picks their course and cohort code once, and Crew Call works out the term from the LFS term dates.

- **MA Filmmaking**: a new cohort starts every term and the number goes up by one. In Autumn 2026, MAF217 is Term 4, so MAF220 is Term 1, MAF216 is Term 5 and MAF215 is in the graduation term. When Spring 2027 starts, everyone moves up one and MAF215 becomes Alumni.
- **MA Screenwriting** and **MA Film Producing**: one-year courses starting each September. They show as "Screenwriting 2026–27" or "Producing 2026–27" until the course ends, then Alumni. If these cohorts have official codes, type the prefix in Admin, Terms and cohorts, and every profile updates.
- **MA International Film Business**: one year, run with the University of Exeter. Term 1 is in Exeter, Terms 2 and 3 at LFS.
- **When each cohort finishes**: Crew Call shows the expected finish date on each profile and on the calendar. Screenwriting, Producing and Marketing starting in September 2026 finish on Fri 24 Sep 2027 (LFS key dates). MA Filmmaking is two years (six terms) and LFS says the end date varies by intake, so it's worked out as the end of the sixth term. International Film Business is assumed to finish at the end of Summer term. To set a real date, use Admin, Terms and cohorts, Cohort dates. People stay on their course until that date, then become Alumni.
- **If the numbering drifts** (for example a term is skipped): in Admin, Terms and cohorts, set which code is in Term 4 now. Everyone else is recalculated and told.
- **Someone repeating a term or intermitting**: they change their own cohort in the first two weeks of term, or an admin does it later with Fix someone's cohort.
- **Each new year**: add the next year's LFS term dates in Admin, Terms and cohorts. Without dates, nobody moves up.
- **Before a term starts**: Admin, Terms and cohorts, "When the next term starts" shows who moves up, which cohort starts (for example MAF221 on 11 Jan 2027) and who becomes Alumni (MAF215). It happens on its own on the first day of term. The Overview reminds you a few weeks before.
- **Changing a course**: Admin, Terms and cohorts, Courses. Open a course to change its name, code prefix, length, how often it starts and when it ends. "Close to new students" stops new intakes while current students carry on to Alumni. "Add course" adds a new one.

## Maps

Every location has an Open in menu: OpenStreetMap, Google Maps or Apple Maps. Crew Call remembers the last one each person used and puts it first.

## Reports and safety

- Anyone signed in can report a profile, a project or a script. There's also a general Report a problem link in the footer.
- Only admins with the Reports and privacy permission see reports. The person reported is never told who reported them.
- For each report: read it, act (hide the project or script, or remove the person), write a short note, then click Mark dealt with. The person who reported it is told.
- Admins are students, not investigators. Pass anything about safety, harassment or discrimination to LFS Student Services. Record the LFS contact here once you have it: [LFS contact].

## Develop, Shoot, Post, Release

The app follows a film from idea to audience, in four tabs.

- Develop: screenwriters post a script (logline only) and producers post a pitch (an idea, a true story they have access to, or rights they hold). Others put their hand up for a role, and the poster brings people on. Only people brought on see the script or pitch deck link. When it's ready, the poster clicks Turn into a shoot.
- Shoot: the projects board. Crew request roles here.
- Wrap: from the shoot's page or My shoots, whoever runs it clicks Wrap shoot once filming has started. It stays on the Shoot board greyed out under Wrapped (until its delivery date, or 30 days after the last day if there isn't one), crew get the credit, waiting requests close and any shoot days after today come off the calendar (Undo wrap puts them back). Wrap and move to Post opens the Post form straight away. Shoots also count as wrapped automatically after their last day. The shoot form has an optional Delivery date: when post has to be finished.
- Post: once a shoot has wrapped, the director or producer sees a prompt to list it for post. Editors, colourists, sound designers, composers and VFX artists offer to help with editing, assistant editing, colour grade, sound design and mix, music, VFX or titles and graphics. Post roles picked on the shoot (Editor, Colourist, VFX, Sound Designer, Composer) show on Post automatically: filled ones as the team, open ones as needs, even before anyone lists the film. Bringing someone on fills the shoot's matching role. Each post lists a delivery date (picture lock, a festival or the school hand-in), where the work happens (remote, on campus or either), software and footage. The link to the cut is only shown to the team. Each person brought on gets a credit on their profile (Editor, Colourist, Sound Designer and so on). Once the delivery date passes the film is greyed out under Delivered, then drops off 30 days later. When the picture is locked, the lister clicks Picture locked? List it in Release.
- Release: once a shoot has wrapped, the director or producer sees a prompt to list it. Marketing students (and anyone else) offer festival strategy, poster and key art, trailer, socials, press kit or stills. The screener link is only shown to the team. Each job brought on becomes a credit on that person's profile.

Every board has a search bar, a Matches me switch (shows posts needing a role on your profile), tap-to-filter chips, sorting, and Show more after 12 posts. Filled or fully crewed posts are hidden unless you tick the box in Filters. On phones, Filters opens as a panel from the bottom of the screen, and every dropdown in the app opens as a tap-to-pick list instead.

## Privacy and data

- The privacy notice is in the footer and on the sign-in screen. If the owner, help address or retention period changes, it updates by itself.
- Alumni and guests who haven't signed in for 12 months (change it in Admin, Privacy and data) get a warning email 30 days before, then are deleted by the nightly job. Signing in at any point keeps them. To delete by hand instead, untick Delete old profiles automatically each night in Admin, Privacy and data. Admins and the owner are never removed automatically.
- Anyone can download their own data or delete their profile from My profile.
- Backups: see `docs/BACKUPS.md`.

## Newsletter

Admin, then Newsletter. Every admin can read past issues and the history; only the levels below can change anything.

- **Two levels.** Newsletter: draft lets someone design and ask for approval. Newsletter: send lets someone approve, schedule and send. Give them in Admin, then Access. The owner always has both.
- **Second approval.** On by default. The person who wrote or last edited an issue can't send it themselves while another admin can. Only the owner can turn it off.
- **Who controls it** is shown at the top of the Newsletter tab, and each issue keeps a trail: drafted by, last edited by, asked for approval, approved and sent by. Every step goes into Activity.
- **Building an issue.** Add blocks (heading, text, image, button, divider) or live blocks (upcoming shoots, open roles, develop posts, release films) that fill in from Crew Call when it's sent. Preview on computer or phone, then send yourself a test.
- **Who gets it.** Everyone, LFS only, a course, a term, a cohort, or the school mass email alias. People who turn off "Email me the Crew Call newsletter" in their profile are left out.
- The email design lives in `emails/newsletter-template.js`.

## Languages

Crew Call works in English, Traditional Chinese, Simplified Chinese, French, Spanish, Russian, Arabic (right to left), Hindi and Portuguese (Brazilian). Pick one from the globe button at the top or the footer; otherwise it follows the phone or browser language. Once Supabase is connected, save the choice on each profile (see `store()` in `i18n.js`).

- Month and weekday names come from Unicode CLDR, which is built into every browser, so they're always correct.
- What people write themselves (project posts, bios, newsletters) stays in the language they wrote it in.
- Emails and notification sentences are still in English.
- In any language except English, a **Wrong word?** button sits in the bottom corner of every page. Members tap it, then tap the words that look wrong. The suggestion arrives with the page and section it came from, so admins know exactly where to look. They can also use "Suggest a better translation" in the language menu. Fixes arrive in Admin, Languages, where admins also fill in new role names from Wikidata. See [TRANSLATION.md](TRANSLATION.md) for Weblate and LibreTranslate.
- **Before you promote a language,** have a student who speaks it check it on set terms, not word for word. The rules, glossary and checklist are in [TRANSLATION.md](TRANSLATION.md).
- **Fixing a translation.** Edit `tools/i18n/words*.txt` (Russian and Arabic are in `tools/i18n/ru-ar/`, Hindi and Portuguese in `tools/i18n/hi-pt/`) (one line per phrase: `English || 繁體 || Français || Español`) or `patterns.txt` for sentences with names or numbers in them. Then run `python3 tools/build_i18n.py`, which also makes the Simplified Chinese. You can do this in the GitHub web editor and ask someone with Python to run the build, or have someone who codes do both.
