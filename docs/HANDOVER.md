# Crew Call: handover document

Keep this document with the app. Whoever looks after Crew Call next should be able to run it from this page, without writing any code.

## What Crew Call is

Crew Call is a free, student-run website for LFS students to:

- post shoots and the roles they need
- mark the days they're free
- find crew by role, term, cohort and kit
- develop ideas: writers post scripts and producers post pitches looking for a writer or director
- get wrapped films to festivals: directors list finished films and marketing students offer posters, trailers, press kits and festival plans
- post a crowdfunding campaign for a film, with its goal and deadline
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
| Languages | Approve translation suggestions and fix words in any language |
| Email settings | Sending address, help address, school mass email alias, digest day and time |
| Reports and privacy | Read and act on reports, delete old profiles, download and restore backups |
| Newsletter: draft | Design newsletters, save drafts, send a test to themselves and ask for approval |
| Newsletter: send | Approve, schedule and send a newsletter to everyone or a chosen group |

Languages was added in v20. Until then, approving translations came with Terms and lists. **Re-run `supabase/schema.sql` once** (Supabase, SQL Editor, paste the whole file, Run): it gives Languages to everyone who already has Terms and lists, so nobody loses access. Until you do, only the owner can approve translations.

Admins with Projects (and the owner) can edit any project, not just their own, to fix mistakes. The project window shows an Admin access box with Edit, Hand over, Archive and Delete.

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

The top bar is Calendar | Funding | Projects | Paid | Crew (plus My shoots, My profile and Admin). Projects holds the four stages of a film, from idea to audience, in a second row of tabs: 1 Develop, 2 Casting, 3 Shoot, 4 Post, 5 Release. Projects remembers the last stage you opened.

- Develop: screenwriters post a script (logline only) and producers post a pitch (an idea, a true story they have access to, or rights they hold). Others put their hand up for a role, and the poster brings people on. Only people brought on see the script or pitch deck link. When it's ready, the poster clicks Turn into a shoot.
- Shoot: the projects board. Crew request roles here.
- Wrap: from the shoot's page or My shoots, whoever runs it clicks Wrap shoot once filming has started. It stays on the Shoot board greyed out under Wrapped (until its delivery date, or 30 days after the last day if there isn't one), crew get the credit, waiting requests close and any shoot days after today come off the calendar (Undo wrap puts them back). Wrap and move to Post opens the Post form straight away. Shoots also count as wrapped automatically after their last day. The shoot form has an optional Delivery date: when post has to be finished.
- Post: once a shoot has wrapped, the director or producer sees a prompt to list it for post. Editors, colourists, sound designers, composers and VFX artists offer to help with editing, assistant editing, colour grade, sound design and mix, music, VFX or titles and graphics. Post roles picked on the shoot (Editor, Colourist, VFX, Sound Designer, Composer) show on Post automatically: filled ones as the team, open ones as needs, even before anyone lists the film. Bringing someone on fills the shoot's matching role. Each post lists a delivery date (picture lock, a festival or the school hand-in), where the work happens (remote, on campus or either), software and footage. The link to the cut is only shown to the team. Each person brought on gets a credit on their profile (Editor, Colourist, Sound Designer and so on). Once the delivery date passes the film is greyed out under Delivered, then drops off 30 days later. When the picture is locked, the lister clicks Picture locked? List it in Release.
- Release: once a shoot has wrapped, the director or producer sees a prompt to list it. Marketing students (and anyone else) offer festival strategy, poster and key art, trailer, socials, press kit or stills. The screener link is only shown to the team. Each job brought on becomes a credit on that person's profile.

Every board has a search bar, a Matches me switch (shows posts needing a role on your profile), tap-to-filter chips, sorting, and Show more after 12 posts. Filled or fully crewed posts are hidden unless you tick the box in Filters. On phones, Filters opens as a panel from the bottom of the screen, and every dropdown in the app opens as a tap-to-pick list instead.

## Signing in

People type the first part of their email and pick the ending from a list: @student.lfs.org.uk (the default), @lfs.org.uk, @gmail.com, @outlook.com, @hotmail.com, @icloud.com, @yahoo.com, or Other… for any other address. Typing an @ switches to a full address automatically. Supabase emails a 6-digit code (see SETUP.md, step 5, for the email templates).

## Updating the site

When you change the code, raise the version number in two places so phones don't mix old and new files: `CACHE` in sw.js (crewcall-v24) and every `?v=24` in index.html.

## Funding

Crowdfunding campaigns for LFS films (Kickstarter, Indiegogo, Seed&Spark, GoFundMe, Crowdfunder or anything else). Members only.

- Anyone can post a campaign from Funding, or the director or producer can click Add crowdfunding in a shoot's window. Linked campaigns show on the shoot card and in its window, and the locked crew get a notification.
- Each campaign has a platform, link, goal, currency, total raised, deadline, pitch, what the money pays for and an optional photo.
- The money goes through the platform, never through Crew Call. The total raised is updated by hand: whoever posted it (or an admin) clicks Update in the campaign.
- After the deadline the campaign is greyed out under Ended, then drops off 30 days later.

## Photos

Projects, Post, Release and Funding posts can have one photo (a still or poster). It is cropped to 16:9 and shrunk to about 100 KB before uploading, so the free Supabase limits (1 GB storage, 5 GB egress a month, see [Supabase pricing](https://supabase.com/pricing)) go a long way.

- To switch photos on, run supabase/storage.sql once: Supabase, SQL Editor, paste the file, Run. It creates a public bucket called covers (JPEG only, 600 KB each). Members can only upload or delete files in their own folder.
- Until it's run, adding a photo shows "Photos aren't switched on yet".

## Added by name (claims)

When someone is added to a shoot by typing their name ("Someone not on Crew Call", or a director or producer typed in by name), and later joins Crew Call with that name, they see a banner: Is this you?

- They click That's me (or Not me to hide it). Whoever typed the name in (or the project's managers) gets a request: Is this them? Approve or Not them.
- Approving puts the member on the role, so it shows on their profile as a credit.
- Names are matched loosely (case and accents ignored). Post-board names aren't included.

## Adding yourself to a crew

In a project's Crew tab, anyone signed in who isn't on it sees Add me to the crew. They pick their role (an open one, or any other) and can add a message. Whoever runs the project gets it in Requests and clicks Approve or Decline.

- Wrapped project: approving puts them on that role, so it becomes a credit on their profile.
- Upcoming project: approving locks them in, as if they'd requested the role.
- If the role isn't on the project, it's added.
- My profile also has Missing a credit?, which lists wrapped projects to pick from.

## Project window

A shoot's window has tabs: Open roles, Cast, Schedule, Crew, Contact and Requests (managers only). Under the logline it shows what crew get (Meals, Travel, Credit) and how many roles are paid. Crew lists everyone with their number of credits and an Email or Message button. Tap a name to see their profile, then Back to the project.

## Casting

Actor is now called Talent, and there's a new role, Supporting artist. Both sit under Cast. Older records that say Actor are read as Talent automatically.

- When posting a shoot, each Talent or Supporting artist row has Character, Playing age and About the part. The Casting box holds an optional casting call link (Backstage, Spotlight, StarNow, Mandy or a form), closing date, pay and notes.
- The project window has a Cast tab with the casting call, the parts still to cast and the cast list.
- Casting is stage 2 under Projects. It has two views. Parts lists every open part, with Ask to play and Apply on Backstage when there's a link. Talent (signed-in only) lists everyone with Talent or Supporting artist on their profile, or with an LFS acting credit, so you can contact previous actors.

## Posting and editing a shoot

The form has tabs: Basics, Dates and places, Roles, Casting and Crew hub. Pop-ups with tabs stay one size, and the tab bar stays at the top while you scroll, so switching tabs doesn't make the window jump. If something's missing when you post, it jumps to the right tab and says what to add.

In Roles, filled roles can be changed too: change or clear the name, or press Remove. Whoever was taken off gets a notification when you save. Managers (and admins with Projects) can also reopen or fill roles on wrapped shoots, to fix credits. Anything long in Crew Call uses tabs like this.

## Paid roles and perks

- Most school shoots are unpaid, but some roles are paid. In the Roles tab, open Details on a role, tick This role is paid and add the rate (for example £150 a day). Paid roles show a black rate tag.
- What crew get: tick Meals, Travel and Credit for everyone on the shoot. New shoots start with Meals and Credit ticked.
- Paid lists upcoming LFS shoots with paid roles (type LFS shoot) alongside jobs posted by students, alumni and industry. Tapping one opens the shoot.

## Crew

Crew is a table, so it stays tidy as it grows. Every row is the same height; anything too long is cut short with "…" (hover to see it all) and extra roles show as +2. Filter by department (Camera, Sound and so on), roles, term, cohort, kit and free dates. Searching a department name works too.

- Sorted A to Z by name to start with (Sort has Best match and the others).
- Columns shown: Name, Departments, Available, Credits, Contact. Available shows just the dates (with dates picked: "All 3 days" or "2 of 3 days"). Main role, Also does, Kit, Based in, Term and Updated are hidden; switch them on under Columns (remembered on that device).
- The table scrolls sideways (trackpad, Shift + mouse wheel, swipe, or the ‹ › buttons), with names locked on the left.
- Departments shows one icon per kind of work: clapperboard (directing, ADs, script supervisor, runner), clipboard (producing and production office), pen (writing), camera, bulb (lighting and grip), microphone (sound), note (music), palette (art and costume), scissors (post), megaphone (marketing), star (cast). The red icon is their main role. Hover, or tap on a phone, to see the roles.

## Calendar

Months are stacked with this month at the top; scroll down for later ones. The default is 6 months, with 3 months, 1 month and Week as options (remembered on that device). ‹ › move a month at a time, and the button at the bottom jumps to the next block. On a computer the day panel stays on the right as you scroll. On a phone or tablet, tapping a day opens it in a pop-up.

- A key sits at the top of the day panel (on a phone, above the calendar): shoot, crew available, you're booked, you marked it free, UK bank holiday, school date, today.
- The person-with-a-tick icon on a day means someone is available.
- When you're signed in, days you're booked on are filled light green.
- UK bank holidays (England and Wales) show in purple. They're built in up to 2028 and refreshed weekly from [GOV.UK](https://www.gov.uk/bank-holidays.json), so new ones appear by themselves.
- The day panel lists the available crew by name only; tap a name for their profile. Signed-out visitors only see how many.

## Kit

A Kit tab (signed-in only) lists every piece of kit people have put on their profiles, with how many people have the same thing, so people can borrow, lend or share.

- Items are split on commas, so "Aputure 300d II, 2x Amaran 200x" counts as two. Matching ignores capitals, spaces, punctuation and quantities like 2x.
- Search, filter by type, and sort by Most people or A–Z.
- See who opens the list of owners, with their contact buttons (email only if they've chosen to share it).
- Add your kit goes straight to the Kit tab of My profile.

## Credits

Credits include shoots someone is locked on that haven't wrapped yet, marked Current, as well as wrapped ones.

## Account menu

The avatar menu is grouped: You (My profile, My availability, Messages, My shoots, Admin), Projects (1 to 5), More (Calendar, Crew, Funding, Paid) and Crew Call (Add to home screen, Privacy notice, About). The calendar's button is now My availability.

## Notifications

The bell groups similar notifications: one card per project and type (and per person for messages), with the newest on top and Show earlier for the rest. The red count is the number of groups with something new. Emails were already sent together, at most one every 10 minutes.

## Messages

The speech-bubble button in the header opens Messages, with a red count of unread messages. Each conversation shows as a chat and has a reply box (Ctrl or Cmd + Enter sends). Messages are private between the two people. New ones are also emailed, unless someone has turned that off. No database change was needed.

Optional: redeploy the Supabase function so message emails link straight to the conversation. Open Edge Functions, then crewcall, then Code, paste in all of `supabase/functions/crewcall/index.ts` and press Deploy (as in SETUP.md, step 10). Without it, they link to the home page.

## My profile

My profile has tabs: Availability (first), About me, Roles, Kit, Credits, and Emails and privacy. Someone signing up for the first time starts on About me. It saves as you type, so there's no Save button to forget. About me includes Preferred name (what people call you, shown in brackets after the full name and used in greetings), Based in and From. Crew search finds people by preferred name and city.

Roles tab: a highlighted Main role box at the top, with one dropdown for the job you most want to be hired for. Under it, "Other roles I can do" lists everything else you can do, and your main role is labelled Main there. On a profile, Main role and Also does are shown separately, and in Crew they're separate columns. If someone removes their main role, the tab asks them to choose a new one.

## Drafts

If someone closes a form part-way, by clicking outside it or pressing Escape, nothing is lost. Clicking outside a form you've typed in doesn't close it. Use × or Cancel. Reopening the form brings the text back, with Start again to clear it. Drafts are kept on that device only and cleared when signing out.

Tapping any date or time box opens the calendar picker.

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
- In any language except English, a **Wrong word?** button sits in the bottom corner of every page. Members tap it, then tap the words that look wrong. The suggestion arrives with the page and section it came from, so admins know exactly where to look. They can also use "Suggest a better translation" in the language menu. Fixes arrive in Admin, Languages, where admins with the Languages permission approve them and fill in new role names from Wikidata. See [TRANSLATION.md](TRANSLATION.md) for Weblate and LibreTranslate.
- **Before you promote a language,** have a student who speaks it check it on set terms, not word for word. The rules, glossary and checklist are in [TRANSLATION.md](TRANSLATION.md).
- **Fixing a translation.** Edit `tools/i18n/words*.txt` (Russian and Arabic are in `tools/i18n/ru-ar/`, Hindi and Portuguese in `tools/i18n/hi-pt/`) (one line per phrase: `English || 繁體 || Français || Español`) or `patterns.txt` for sentences with names or numbers in them. Then run `python3 tools/build_i18n.py`, which also makes the Simplified Chinese. You can do this in the GitHub web editor and ask someone with Python to run the build, or have someone who codes do both.
