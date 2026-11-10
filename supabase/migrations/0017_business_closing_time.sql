-- MELA: Add closing_time to businesses table.
-- Used to trigger daily summary notifications at the end of the business day.
-- Format: HH:MM (24-hour), e.g. '18:00'. Nullable — null means no daily summary.

alter table public.businesses
  add column if not exists closing_time text
    check (closing_time is null or closing_time ~ '^\d{2}:\d{2}$');
