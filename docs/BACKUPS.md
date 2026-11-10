# Crew Call: backups

Supabase backs up Pro, Team and Enterprise projects every day, but not free projects. For free projects, Supabase recommends regularly exporting your data with the `db dump` command and keeping copies somewhere else ([Supabase backups](https://supabase.com/docs/guides/platform/backups)). Crew Call does this for you, for free.

## What's set up

| Backup | How often | Where it's kept | How long |
|---|---|---|---|
| Nightly database dump | Every night at 3am | GitHub, in the private `crewcall-backups` repository's Actions tab | 30 days |
| Download from the app | Whenever an admin clicks it | Wherever you save it | Until you delete it |

The nightly job is `.github/workflows/backup.yml`. It runs the three dump commands from the [Supabase backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore): roles, schema and data.

## Turn it on (once, 5 minutes)

1. In Supabase, click Connect and copy the Session pooler connection string. Put your database password into it.
2. In GitHub, open the private `crewcall-backups` repository (with `.github/workflows/backup.yml` uploaded into it), then Settings, Secrets and variables, Actions.
3. Click New repository secret. Name it `SUPABASE_DB_URL` and paste the connection string.
4. Open the Actions tab, pick Nightly database backup, then Run workflow. Check it goes green.

Keep the backups repository private: the backup contains people's profiles. The website's code repository can be public, but never put the backup job there. A private repository on GitHub Free includes a monthly allowance of Actions use and 500 MB of artifact storage ([GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). A nightly dump of a database this size uses a small part of it.

## Restore

- **Small mistake (someone deleted a project):** Admin, Privacy and data, Restore from a backup, using a file downloaded from the app.
- **Whole database lost:** download the latest backup from GitHub Actions, then follow the restore steps in the [Supabase guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), or ask someone who knows databases to do it with you.

- **After restoring the whole database,** run `supabase/jobs.sql` again (with your cron secret) so the email and nightly timers start. Calendar links keep working because they're saved in the database.

## Each term

Open the Actions tab and check the last few backups are green. If they've turned red, the database password has probably changed. Update the secret.
