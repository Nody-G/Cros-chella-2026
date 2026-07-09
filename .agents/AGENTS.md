# Rules for Cros-chella

When the user types "push", perform the following actions:
1. Commit all local code changes with a descriptive message and push them to GitHub.
2. If there are SQL changes (e.g. in `supabase/schema.sql`), notify the user of database schema updates or run migration scripts if applicable.
