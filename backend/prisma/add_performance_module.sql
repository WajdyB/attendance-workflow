-- Add EvaluationType enum
DO $$ BEGIN
    CREATE TYPE public.evaluation_type AS ENUM ('ANNUAL','SEMIANNUAL','PROJECT','THREE_SIXTY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add SalaryIncreaseReason enum
DO $$ BEGIN
    CREATE TYPE public.salary_increase_reason AS ENUM ('PROMOTION','PERFORMANCE','INFLATION','ANNUAL_REVIEW','OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add new columns to evaluations table
ALTER TABLE public.evaluations
    ADD COLUMN IF NOT EXISTS evaluation_type public.evaluation_type NOT NULL DEFAULT 'ANNUAL',
    ADD COLUMN IF NOT EXISTS period TEXT,
    ADD COLUMN IF NOT EXISTS technical_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS soft_skill_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS objectives TEXT,
    ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add new columns to salary_history table
ALTER TABLE public.salary_history
    ADD COLUMN IF NOT EXISTS reason public.salary_increase_reason,
    ADD COLUMN IF NOT EXISTS attachment_url TEXT;
