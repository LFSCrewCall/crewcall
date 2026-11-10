# Crew Call: launch guide

This takes Crew Call from the demo to a live site that LFS students sign in to and that saves everything in the cloud. It costs £0 a month. Allow an afternoon. No coding is needed: you'll copy, paste and click.

The first owner is **chanchrisna.lee@student.lfs.org.uk**. That's already written into the database setup file.

## How your data is saved

Nothing is kept on anyone's computer or phone. Everything lives in one online database, so every member sees the same shoots, profiles and calendar from any device.

- **Where:** a Supabase project. Supabase is a hosted Postgres database with sign-in built in. Choose the **London** region when you create it, so the data stays in the UK.
- **What's in it:**
  - `records`: every profile, project, request, script, film, paid job, notification, report and setting. Each is one row, saved the moment someone changes it.
  - `emails`: everyone's email address, kept apart, so it's only shown when the person chooses to share it, or to the producer and director of a shoot they're locked on.
  - `app_meta`: the first owner's email and the LFS email domains allowed in.
  - `cal_tokens` and `email_log`: each person's private calendar link, and a list of emails already sent so nobody gets one twice. Only the server can read them.
- **Who can see what:** row-level security rules in the database decide who can read and change each row. They work even if someone tinkers with the website code. People who aren't signed in see shoot titles and dates only, with no names, emails or crew hubs. Only @student.lfs.org.uk and @lfs.org.uk addresses, or people an LFS member has invited, can sign in. These rules were tested with 64 checks before launch.
- **What's on the device:** only the sign-in session, so people stay signed in. Signing out removes it. On a phone that has added Crew Call to the home screen, the app's own files (not people's data) are kept so it opens quickly.
- **Saving:** changes save straight away. A small label at the bottom of the screen says "Saving…", then "Saved". If the signal drops, it says so and tries again. Crew Call also refreshes every two minutes, and whenever you come back to the tab, so you see other people's changes.
- **Backups:** Supabase doesn't back up free projects ([Supabase backups](https://supabase.com/docs/guides/platform/backups)), so step 9 below sets up a free nightly backup on GitHub. Admins can also download a full copy at any time in Admin, Privacy and data.

## What you need

| Part | Service and plan | Cost |
|---|---|---|
| Database and sign-in | Supabase Free, in an organisation | £0. 500 MB database and 50,000 monthly users. Free projects pause after a week with no activity ([Supabase pricing](https://supabase.com/pricing)). |
| Code and website | GitHub Free organisation, with GitHub Pages | £0. Pages is free for public repositories ([GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)). |
| Backups | A second, private GitHub repository | £0 |
| Sending sign-in codes | An SMTP sender: an LFS shared mailbox, Brevo's free plan (300 emails a day, [Brevo](https://www.brevo.com/free-smtp-server/)), or a Gmail used only for sending | £0 |

Supabase's built-in email only sends to your own team, 2 an hour, so you do need your own sender ([Supabase SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)).

The code is safe to make public. It contains no passwords: the Supabase publishable key is designed to sit in browser code, and the database rules decide what it can reach ([Supabase API keys](https://supabase.com/docs/guides/api/api-keys)). People's data is never in the code repository. It's in Supabase, and backups go to the private repository.

## Step by step

### 1. GitHub (10 minutes)

1. Sign in to [GitHub](https://github.com) with your school email.
2. Create a free organisation, for example `crewcall-lfs`. Invite your cohort rep as a second Owner, so it never depends on one person.
3. In the organisation, create a **public** repository called `crewcall`.
4. Unzip the Crew Call download. On the repository page, choose Add file, then Upload files, and drag in everything inside the `crewcall` folder. Commit.

### 2. Supabase project (10 minutes)

1. Sign in to [Supabase](https://supabase.com) with your school email.
2. Create an organisation (Free plan) and invite your rep.
3. Create a project called Crew Call. Pick the **London** region. Save the database password in a password manager; you'll need it for backups.

### 3. Create the database (2 minutes)

1. In the project, open **SQL Editor**, then New query.
2. Open `supabase/schema.sql` from the download, copy all of it, paste it in and press **Run**. It should say "Success". Running it again later is safe.

This creates the tables and all the privacy rules. If the first owner isn't you, change the email near the top of the file before you run it.

### 4. Email sender (20 minutes)

What works today: a Gmail made just for Crew Call (`lfscrewcall@gmail.com`) as the sender, sent through a free Brevo account. Later you can swap to an LFS shared mailbox (see `docs/LFS-REQUEST.md`).

1. Make a free [Brevo](https://www.brevo.com) account. Add `lfscrewcall@gmail.com` as a sender under **Senders, domains and dedicated IPs** and confirm it from the Gmail inbox. Ignore the "non-compliant" banner: it's only a warning.
2. In Brevo, open **SMTP & API**, then **SMTP**, and generate an SMTP key. Note the SMTP login (it ends `@smtp-brevo.com`). The login is a username only. Never use it as the sender address.
3. In Brevo, open **Security**, then **Authorized IPs** ([Brevo help](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security)). On the **SMTP keys** row click **Deactivate for SMTP**, then confirm. Without this every email fails with "525 Unauthorized IP address", because Supabase's addresses change.
4. In Supabase, open **Authentication**, then **Emails**, then **SMTP Settings**. Turn on custom SMTP:
   - Sender email: `lfscrewcall@gmail.com`. Sender name: `Crew Call`.
   - Host: `smtp-relay.brevo.com`. Port: `587`.
   - Username: the Brevo SMTP login. Password: the SMTP key.
5. Test by signing in with the Gmail first, then a school email. If Brevo's logs say Delivered but a school inbox gets nothing, the school's filter is dropping it: ask LFS IT to allow the sender.
6. Open **Authentication**, then **Rate Limits**, and raise emails per hour to about 100. It starts at 30 once custom SMTP is on ([Supabase SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)).

### 5. Send a 6-digit code, not a link (5 minutes)

Crew Call signs people in with a code they type, which works even when the email opens on a different device.

1. In **Authentication**, then **Emails**, open the **Magic Link** template. Supabase sends codes through this template ([Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)).
2. Replace its body with:

   ```html
   <h2>Your Crew Call code</h2>
   <p>Type this code into Crew Call to sign in: <strong>{{ .Token }}</strong></p>
   <p>It works once and runs out in an hour. If you didn't ask for it, ignore this email.</p>
   ```
3. Subject: `Your Crew Call code`. Save.
4. Do the same for the **Confirm signup** template, so first-time sign-ins also get a code.

Codes run out after an hour by default. You can change that in Authentication, Sign In / Providers, Email.

### 6. Website address (5 minutes)

1. In the GitHub repository, open **Settings**, then **Pages**. Under Source choose Deploy from a branch, branch `main`, folder `/ (root)`. Save.
2. After a minute it shows the address. Ours is `https://lfscrewcall.github.io/crewcall/`. The `/crewcall/` on the end is needed: without it you get a 404.
3. In Supabase, open **Authentication**, then **URL Configuration**. Set Site URL to that address, and add it under Redirect URLs too.

### 7. Connect the app to the database (5 minutes)

1. In Supabase, press **Connect** at the top of the project (or open Settings, then API Keys). Copy the **Project URL** and the **publishable key** (it starts `sb_publishable_`).
2. In GitHub, open `config.js` in the repository and press the pencil to edit.
3. Paste them in between the quotes, not into the comment lines (the ones starting `//`). If they're in a comment the site stays the demo:

   ```js
   window.CC_CLOUD = {
     url: "https://abcdefghijkl.supabase.co",
     key: "sb_publishable_..."
   };
   ```
4. Commit. GitHub Pages republishes in a minute or two.

This is the only link between GitHub and Supabase: `config.js` tells the site where the database is, and step 6's URL Configuration tells Supabase where the site is. When you upload new versions of Crew Call later, never replace your `config.js`.

Never paste the **secret** key or the database password into the code.

### 8. Sign in as the owner (5 minutes)

1. Open the site and press **Sign in**. Enter the first owner's school email. Type the 6-digit code from the email.
2. You're now the owner. The sample people and projects are gone: the live site starts empty.
3. In **Admin**, check **Terms and cohorts** (term dates and cohort codes are already filled in from the LFS key dates), then **Email**, then **Privacy and data**.
4. In **Admin**, then **Access**, choose a rep for each cohort once they've signed in. Reps become admins.

### 9. Backups (10 minutes)

1. Create a second repository called `crewcall-backups` and make it **private**.
2. In it, choose **Add file**, then **Create new file**. Name it `.github/workflows/backup.yml` and paste in the file of that name from the download. Commit. Delete that file from the public repository if it's there.
3. In Supabase, press **Connect**, then **Direct**, and change the type to **Session pooler**. Copy the string.
4. You need the database password. Supabase never shows it again, so if it's lost, reset it in **Project Settings**, then **Database**. Use letters and numbers only. Nothing else uses this password, so resetting is safe.
5. Put the password in place of `[YOUR-PASSWORD]` (brackets too). In `crewcall-backups`, open **Settings**, **Secrets and variables**, **Actions**, **New repository secret**. Name it `SUPABASE_DB_URL` and paste the string.
6. In **Actions**, run **Nightly database backup** once. A green tick means it worked. "password authentication failed" means the password in the secret is wrong.

The database password is not the publishable key. Never put it in `config.js`.

The backup contains people's profiles, so it must stay in the private repository.

### 10. Emails, calendar links and nightly jobs (30 minutes)

This turns on emailed notifications, the weekly digest, sending newsletters, calendar links that update themselves, and the nightly term check and clean-up. They all run in one small free server piece (a Supabase Edge Function called `crewcall`), started on a timer by the database.

1. **Update the database.** Run `supabase/schema.sql` again in the SQL Editor. It's safe to re-run and keeps all data.
2. **Make a Brevo API key.** In Brevo, open your name (top right), then **SMTP & API**, then the **API keys** tab, and press **Generate a new API key**. Name it `crewcall` and copy it. This is not the SMTP key from step 4.
3. **Let the server use it.** In Brevo, open **Security**, then **Authorised IPs**, and deactivate IP blocking. Supabase's servers don't have a fixed address, so Brevo would otherwise refuse them ([Brevo IP security](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security)).
4. **Make a secret.** Think of a long random password, for example 30 letters and numbers. You'll paste it twice below. Call it the cron secret.
5. **Deploy the function.** In Supabase, open **Edge Functions**, then **Deploy a new function**, then **Via Editor**.
   - Name it exactly `crewcall`.
   - Delete the sample code and paste in all of `supabase/functions/crewcall/index.ts`.
   - Press **Deploy**.
   - Open the function's **Details** and turn **off** "Verify JWT" (calendar apps can't sign in). Save.
6. **Add its secrets.** In **Edge Functions**, then **Secrets**, add:
   - `BREVO_API_KEY`: the key from step 2.
   - `CRON_SECRET`: the secret from step 4.
   - `SENDER_EMAIL`: `lfscrewcall@gmail.com` (the sender you verified in Brevo).
   - `SENDER_NAME`: `Crew Call`.
   - `SITE_URL`: `https://lfscrewcall.github.io/crewcall/`.
7. **Start the timers.** Open `supabase/jobs.sql`, put your cron secret on the line marked `CHANGE ME`, and run it in the SQL Editor. Don't save the file with the secret in it to GitHub.
8. **Test.**
   - On the **Calendar** page, press **Sync calendar** and add the My shoots link to Google or Outlook. Your shoots appear within a few hours (calendar apps decide how often they check).
   - In **Admin**, then **Newsletter**, press **Send me a test**. It arrives within 10 minutes.
   - If nothing arrives, run `select status_code, content from net._http_response order by id desc limit 5;` in the SQL Editor to see the server's reply.

How it behaves:

- **Notifications** are emailed within 10 minutes, grouped into one email per person, only for the types each person ticked in My profile.
- **The weekly digest** goes out at the day and time each person picked.
- **Newsletters** go out when you press Send now, or at the scheduled time. The automatic newsletter still needs a person to press send: the server reminds senders on the Monday it's due.
- **Brevo's free plan allows 300 emails a day.** The server stops at 280 and carries on the next day, so sign-in codes always get through.
- **Every night** it moves people up a term when a term starts and tells them. It also emails alumni and guests who haven't been back for the months set in Admin, Privacy and data, and deletes them 30 days later if they still haven't signed in. The owner and admins are never deleted. Untick **Delete old profiles automatically each night** to do it by hand instead.

### 11. Ask LFS, then announce it

1. Send the request in `docs/LFS-REQUEST.md` and wait for an OK. Ideally move the sender to an LFS shared mailbox so codes reliably reach school inboxes.
2. Announce through the school's mass email alias, and post the link in cohort group chats. A draft is below.

### Show people the demo

The demo with sample people stays available at `https://lfscrewcall.github.io/crewcall/?demo`. Nothing in it is saved. There's a "Try the demo" link in the footer and on the sign-in box.

## What works now, and what comes later

Working in the live version:

- Sign-in with emailed codes, LFS addresses only, plus invited guests.
- Saving everything in the cloud: profiles, free days, shoots, requests, scripts, films, paid jobs, reports, admin settings, translation fixes and newsletters.
- In-app notifications, the calendar and every board.
- Downloading a one-off `.ics` file for a shoot.

- Emailed notifications, the weekly digest, sending newsletters, calendar subscription links, and the nightly term check and clean-up, once step 10 is done.
- Handing a project over to a new producer or director, several producers, briefs for heads of department, and putting people down for a role while posting.

Not built yet:

- **Sign in with Microsoft.** It needs approval from LFS IT ([Microsoft Entra consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent)). Email codes do the same job until then.

## If something goes wrong

| Problem | Likely cause | Fix |
|---|---|---|
| The site still shows sample people | `config.js` is empty, or Pages hasn't republished | Check both values are pasted in, then wait two minutes and reload |
| "Couldn't send the email" | SMTP settings are wrong, or Brevo's IP blocking is on | Check step 4. In Supabase, Logs, then Auth shows the error |
| "Too many codes requested" | The hourly email limit was hit | Wait an hour, or raise it in Authentication, Rate Limits |
| The code never arrives at a school inbox | The school's email filter | Check Junk, then ask LFS IT to allow the sender |
| No emails from notifications or newsletters | Step 10 isn't finished, or Brevo refused the key | Run `select status_code, content from net._http_response order by id desc limit 5;`. A 401 means the cron secret differs between step 6 and step 7 |
| A calendar link says "not found" | The link was replaced with "make a new link" | Copy the new link from Calendar, Sync calendar |
| The email has a link, not a code | The template wasn't changed | Redo step 5 |
| "…isn't an LFS address and hasn't been invited" | Not an LFS address, and not invited | An LFS member invites them from My shoots |
| The site says the database is paused | No activity for a week ([Supabase](https://supabase.com/docs/guides/platform/free-project-pausing)) | Sign in to Supabase and press Restore |
| "Offline" or "couldn't be saved" | The connection dropped, or no permission | Offline changes save when the signal is back. "Couldn't be saved" means only the owner of that item or an admin can change it |

## Before you announce it

- **Send it through the school's mass email alias.** One email reaches every student.
  - Ask whoever manages the alias how to submit a message and how long approval takes.
  - Good times: the launch, and a short reminder at the start of each term.
  - Don't send the weekly digest through the alias once it exists. Keep it opt-in.
- **Post the link in cohort group chats** too.
- **Say clearly that it's run by students.** Use something like "Crew Call (for LFS students)".
- **Privacy.** The privacy notice is built in. Ask LFS to check it first, using `docs/LFS-REQUEST.md`.
- **Phones.** People can add Crew Call to their home screen (footer, Add to home screen).

## Email to students (draft)

**Subject:** Crew Call: find crew and shoots across every term

Hi everyone,

I've built Crew Call, a free site where LFS students can post their shoots and find crew across every term and cohort.

- **Post your project.** Add the shoot days, call and wrap times, locations, and the roles you still need.
- **Mark your days.** Choose the days you're free, the roles you can do and the roles you want to learn.
- **Find people.** Search for who's free on your dates and in your role, and see who has kit.
- **Request to join a shoot.** The producer or director accepts you in one tap.

Sign in with your LFS email: [link]

Pick your course and cohort code (for example MAF217) the first time you sign in. Crew Call works out your term from it and moves you up at the start of each term. MA Screenwriting and MA Film Producing students are very welcome too.

Your email stays hidden unless you choose to share it. If you work with people outside LFS, such as HMU artists or actors, you can invite them from My shoots. Crew Call works in English, Chinese, French, Spanish, Russian, Arabic, Hindi and Portuguese.

Crew Call is run by students, not an official LFS service. If something's missing or broken, just reply to this email.

[Your name], [Cohort code]
