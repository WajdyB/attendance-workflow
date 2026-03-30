-- Add new columns to projects table
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS client TEXT,
    ADD COLUMN IF NOT EXISTS budget_hours DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Index for lead_id lookups
CREATE INDEX IF NOT EXISTS projects_lead_id_idx ON public.projects(lead_id);
