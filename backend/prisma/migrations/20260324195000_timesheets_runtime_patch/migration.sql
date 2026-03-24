ALTER TABLE "public"."timesheets"
  ADD COLUMN IF NOT EXISTS "total_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "regular_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overtime_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "public"."timesheet_entries" (
  "id" UUID NOT NULL,
  "timesheet_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "entry_date" DATE NOT NULL,
  "task_name" TEXT,
  "hours" DECIMAL(6,2) NOT NULL,
  "activity_description" TEXT,
  "comments" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "timesheet_entries_idx_timesheet" ON "public"."timesheet_entries"("timesheet_id");
CREATE INDEX IF NOT EXISTS "timesheet_entries_idx_project" ON "public"."timesheet_entries"("project_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'timesheet_entries_timesheet_id_fkey'
  ) THEN
    ALTER TABLE "public"."timesheet_entries"
      ADD CONSTRAINT "timesheet_entries_timesheet_id_fkey"
      FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'timesheet_entries_project_id_fkey'
  ) THEN
    ALTER TABLE "public"."timesheet_entries"
      ADD CONSTRAINT "timesheet_entries_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
