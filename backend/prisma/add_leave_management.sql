-- Add CANCELLED to request_status enum
DO $$ BEGIN
    ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create leave_type enum
DO $$ BEGIN
    CREATE TYPE public.leave_type AS ENUM (
        'PTO',
        'SICK',
        'MATERNITY',
        'PATERNITY',
        'UNPAID',
        'TRAINING',
        'FAMILY_EVENT',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to requests table
ALTER TABLE public.requests
    ADD COLUMN IF NOT EXISTS leave_type public.leave_type,
    ADD COLUMN IF NOT EXISTS working_days_count INTEGER,
    ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create public_holidays table
CREATE TABLE IF NOT EXISTS public.public_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default Moroccan public holidays (recurring, year = NULL)
INSERT INTO public.public_holidays (name, date, year) VALUES
    ('Nouvel An', '2026-01-01', NULL),
    ('Fête du Travail', '2026-05-01', NULL),
    ('Fête de l''Indépendance', '2026-11-18', NULL),
    ('Fête du Trône', '2026-07-30', NULL),
    ('Marche Verte', '2026-11-06', NULL),
    ('Fête de la Jeunesse', '2026-08-21', NULL)
ON CONFLICT DO NOTHING;
