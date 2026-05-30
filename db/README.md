# Database Migrations

SQL migration files for ReviseFlow, organised by date.

## File naming convention

```
db/migrations/YYYYMMDD_NNN_description.sql
```

| Part | Meaning |
|------|---------|
| `YYYYMMDD` | Date the migration was created |
| `NNN` | Zero-padded sequence number within that date (001, 002 …) |
| `description` | Short snake_case summary of the change |

## How to run

Open **Supabase Dashboard → SQL Editor**, paste and run each file in order.

Always run migrations in ascending sequence order — never skip one.

## Migrations

| File | Description |
|------|-------------|
| [20260530_001_initial_schema.sql](migrations/20260530_001_initial_schema.sql) | Core tables: profiles, subjects, topics, revisions + RLS + signup trigger |
| [20260530_002_google_calendar_tokens.sql](migrations/20260530_002_google_calendar_tokens.sql) | Google OAuth token columns on `profiles` |
| [20260530_003_revision_google_event_id.sql](migrations/20260530_003_revision_google_event_id.sql) | `google_event_id` on `revisions` to prevent duplicate Calendar events |

## Adding a new migration

1. Create a file: `db/migrations/YYYYMMDD_NNN_description.sql`
2. Write only **additive** SQL (`alter table … add column if not exists`, `create table if not exists`, etc.)
3. Never edit an existing migration file — that's what the next numbered file is for
4. Add a row to the table above
