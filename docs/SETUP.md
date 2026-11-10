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
- **Who can see what:** row-level security rules in the database decide who can read and change each row. They work even if someone tinkers with the website code. People who aren't signed in see shoot titles and dates only, with no names, emails or crew hubs. Only @student.lfs.org.uk and @lfs.org.uk addresses, or people an LFS member has invited, can sign in. These rules were tested with 41 checks before launch.
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

1. Set up the sender: ask LFS for a shared mailbox (see `docs/LFS-REQUEST.md`), or make a free Brevo account and verify a sender address, or make a Gmail just for sending and create an app password.
2. In Supabase, open **Authentication**, then **Emails**, then **SMTP Settings**. Turn on custom SMTP and fill in the host, port, username and password. Sender name: Crew Call.
3. Open **Authentication**, then **Rate Limits**, and raise emails per hour to about 100. It starts at 30 once custom SMTP is on ([Supabase SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)).

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
2. After a minute it shows the address, such as `https://crewcall-lfs.github.io/crewcall/`.
3. In Supabase, open **Authentication**, then **URL Configuration**. Set Site URL to that address, and add it under Redirect URLs too.

### 7. Connect the app to the database (5 minutes)

1. In Supabase, press **Connect** at the top of the project (or open Settings, then API Keys). Copy the **Project URL** and the **publishable key** (it starts `sb_publishable_`).
2. In GitHub, open `config.js` in the repository and press the pencil to edit.
3. Paste them in between the quotes:

   ```js
   window.CC_CLOUD = {
     url: "https://abcdefghijkl.supabase.co",
     key: "sb_publishable_..."
   };
   ```
4. Commit. GitHub Pages republishes in a minute or two.

Never paste the **secret** key or the database password into the code.

### 8. Sign in as the owner (5 minutes)

1. Open the site and press **Sign in**. Enter the first owner's school email. Type the 6-digit code from the email.
2. You're now the owner. The sample people and projects are gone: the live site starts empty.
3. In **Admin**, check **Terms and cohorts** (term dates and cohort codes are already filled in from the LFS key dates), then **Email**, then **Privacy and data**.
4. In **Admin**, then **Access**, choose a rep for each cohort once they've signed in. Reps become admins.

### 9. Backups (5 minutes)

1. In the organisation, create a second repository called `crewcall-backups` and make it **private**.
2. Upload the `.github/workflows/backup.yml` file from the download into it, keeping the same folder path. You can then delete that file from the public repository.
3. Follow `docs/BACKUPS.md` to add the `SUPABASE_DB_URL` secret to the private repository and run the job once.

The backup contains people's profiles, so it must stay in the private repository.

### 10. Ask LFS, then announce

1. Send the request in `docs/LFS-REQUEST.md` and wait for an OK.
2. Announce through the school's mass email alias, and post the link in cohort group chats. A draft is below.

## What works now, and what comes later

Working in the live version:

- Sign-in with emailed codes, LFS addresses only, plus invited guests.
- Saving everything in the cloud: profiles, free days, shoots, requests, scripts, films, paid jobs, reports, admin settings, translation fixes and newsletters.
- In-app notifications, the calendar and every board.
- Downloading a one-off `.ics` file for a shoot.

Not built yet. These need small server jobs (Supabase Edge Functions or Cron), which are free but are a separate piece of work:

- **Emailed notifications**, the **weekly digest** and **sending newsletters**. They show and can be designed in the app, but don't send emails yet.
- **Calendar subscription links** that update on their own in Outlook or Google.
- **The nightly term check and clean-up.** Terms already move up on their own, because each person's term is worked out from their cohort every time the app opens. Deleting old profiles is done by hand from Admin, Privacy and data.
- **Sign in with Microsoft.** It needs approval from LFS IT ([Microsoft Entra consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent)). Email codes do the same job until then.

## If something goes wrong

| Problem | Likely cause | Fix |
|---|---|---|
| The site still shows sample people | `config.js` is empty, or Pages hasn't republished | Check both values are pasted in, then wait two minutes and reload |
| "Couldn't send the code" | SMTP settings are wrong, or the rate limit was hit | Check step 4. In Supabase, Logs, then Auth shows the error |
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
