-- Attendance Workflow - Full Database Schema
-- Target: PostgreSQL / Supabase
-- Notes:
-- 1) Execute on a clean database or adapt for migration scenarios.
-- 2) This script follows the project specification (MVP + planned structural entities).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('COLLABORATOR', 'MANAGER', 'HR_ADMIN', 'DIRECTION');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
    CREATE TYPE employment_type AS ENUM ('CDI', 'CDD', 'INTERNSHIP', 'FREELANCE');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SUSPENDED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timesheet_status') THEN
    CREATE TYPE timesheet_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_request_status') THEN
    CREATE TYPE leave_request_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type') THEN
    CREATE TYPE leave_type AS ENUM ('PTO', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'TRAINING', 'FAMILY_EVENT', 'OTHER');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
    CREATE TYPE document_category AS ENUM (
      'CONTRACT',
      'PAYSLIP',
      'DIPLOMA_CERTIFICATE',
      'WORK_CERTIFICATE',
      'PERFORMANCE_REVIEW',
      'EXPENSE_NOTE',
      'ADMINISTRATIVE',
      'SALARY_AMENDMENT',
      'OTHER'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_type') THEN
    CREATE TYPE evaluation_type AS ENUM ('ANNUAL', 'SEMESTER', 'PROJECT_END', 'FEEDBACK_360');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'TIMESHEET_SUBMITTED',
      'TIMESHEET_APPROVED',
      'TIMESHEET_REJECTED',
      'LEAVE_REQUEST_SUBMITTED',
      'LEAVE_REQUEST_APPROVED',
      'LEAVE_REQUEST_REJECTED',
      'PERFORMANCE_REVIEW_CREATED',
      'GENERAL'
    );
  END IF;
END$$;

-- =========================================================
-- UTILITY FUNCTION: updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- CORE SECURITY / ACCESS TABLES
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'COLLABORATOR',
  account_status account_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_format_chk CHECK (POSITION('@' IN email) > 1)
);

-- In Supabase this can link to auth.users when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_code TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  cnss_number TEXT UNIQUE NOT NULL,
  personal_email TEXT UNIQUE NOT NULL,
  work_email TEXT UNIQUE NOT NULL,
  mobile_phone TEXT,
  fixed_phone TEXT,
  postal_address TEXT,
  iban TEXT,
  bic_swift TEXT,
  bank_name TEXT,
  job_title TEXT NOT NULL,
  role_function TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  current_pto_balance_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employees_personal_email_format_chk CHECK (POSITION('@' IN personal_email) > 1),
  CONSTRAINT employees_work_email_format_chk CHECK (POSITION('@' IN work_email) > 1),
  CONSTRAINT employees_no_self_manager_chk CHECK (manager_id IS NULL OR manager_id <> id)
);

CREATE TABLE IF NOT EXISTS hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  started_at DATE NOT NULL,
  ended_at DATE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hierarchy_period_chk CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT hierarchy_no_self_relation_chk CHECK (employee_id <> manager_id)
);

-- =========================================================
-- EMPLOYMENT / COMPENSATION TABLES
-- =========================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_type employment_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  weekly_hours NUMERIC(5,2) NOT NULL,
  gross_monthly_salary NUMERIC(12,2),
  net_monthly_salary NUMERIC(12,2),
  bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  benefits_in_kind TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contracts_dates_chk CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT contracts_weekly_hours_chk CHECK (weekly_hours > 0)
);

CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL,
  old_salary NUMERIC(12,2) NOT NULL,
  new_salary NUMERIC(12,2) NOT NULL,
  increase_percent NUMERIC(6,2),
  reason TEXT,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salary_history_non_negative_chk CHECK (old_salary >= 0 AND new_salary >= 0)
);

-- =========================================================
-- PROJECTS / ASSIGNMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  start_date DATE,
  end_date DATE,
  status project_status NOT NULL DEFAULT 'IN_PROGRESS',
  budget_hours NUMERIC(10,2),
  budget_amount NUMERIC(14,2),
  project_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_dates_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT projects_budget_chk CHECK (
    (budget_hours IS NULL OR budget_hours >= 0) AND
    (budget_amount IS NULL OR budget_amount >= 0)
  )
);

CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_on_project TEXT,
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  released_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_assignments_dates_chk CHECK (released_at IS NULL OR released_at >= assigned_at),
  CONSTRAINT project_assignments_unique_active UNIQUE (project_id, employee_id, assigned_at)
);

-- =========================================================
-- TIMESHEETS
-- =========================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status timesheet_status NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewer_comment TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT timesheets_week_range_chk CHECK (week_end_date >= week_start_date),
  CONSTRAINT timesheets_unique_employee_week UNIQUE (employee_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  task_label TEXT,
  activity_description TEXT,
  hours_worked NUMERIC(5,2) NOT NULL,
  overtime_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT timesheet_entries_hours_chk CHECK (
    hours_worked >= 0 AND overtime_hours >= 0 AND hours_worked <= 24
  )
);

-- =========================================================
-- LEAVE MANAGEMENT
-- =========================================================
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_year INTEGER NOT NULL,
  leave_type leave_type NOT NULL DEFAULT 'PTO',
  allocated_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  pending_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  remaining_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_balances_unique_year_type UNIQUE (employee_id, leave_year, leave_type)
);

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country_code TEXT DEFAULT 'MA',
  is_variable_date BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  working_days_count NUMERIC(6,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status leave_request_status NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewer_comment TEXT,
  medical_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_requests_dates_chk CHECK (end_date >= start_date)
);

-- =========================================================
-- PERFORMANCE
-- =========================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  evaluation_type evaluation_type NOT NULL,
  evaluation_date DATE NOT NULL,
  overall_score NUMERIC(5,2),
  criteria_json JSONB,
  comments TEXT,
  recommendations TEXT,
  next_period_objectives TEXT,
  signed_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluations_score_chk CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100))
);

-- =========================================================
-- DOCUMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  category document_category NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  version_number INTEGER NOT NULL DEFAULT 1,
  tags TEXT[],
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT documents_size_chk CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  CONSTRAINT documents_version_chk CHECK (version_number >= 1)
);

-- Backfill optional FK references that depend on documents table
ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_medical_document_id_fkey
  FOREIGN KEY (medical_document_id) REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE evaluations
  ADD CONSTRAINT evaluations_signed_document_id_fkey
  FOREIGN KEY (signed_document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- =========================================================
-- NOTIFICATIONS / AUDIT
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_last_first_name ON employees(last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_contracts_employee_id ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_is_active ON contracts(is_active);

CREATE INDEX IF NOT EXISTS idx_salary_history_employee_id ON salary_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_effective_date ON salary_history(effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON projects(project_manager_id);

CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee_id ON project_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_timesheets_employee_status ON timesheets(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_timesheets_week_start ON timesheets(week_start_date);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet_id ON timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_employee_id ON timesheet_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project_id ON timesheet_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_entry_date ON timesheet_entries(entry_date);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON leave_balances(employee_id, leave_year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_period ON leave_requests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_evaluations_employee_id ON evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON evaluations(evaluation_date DESC);

CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_tags_gin ON documents USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_is_read ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_assignments_updated_at ON project_assignments;
CREATE TRIGGER trg_project_assignments_updated_at BEFORE UPDATE ON project_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_timesheets_updated_at ON timesheets;
CREATE TRIGGER trg_timesheets_updated_at BEFORE UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_timesheet_entries_updated_at ON timesheet_entries;
CREATE TRIGGER trg_timesheet_entries_updated_at BEFORE UPDATE ON timesheet_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER trg_leave_balances_updated_at BEFORE UPDATE ON leave_balances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_holidays_updated_at ON holidays;
CREATE TRIGGER trg_holidays_updated_at BEFORE UPDATE ON holidays
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_evaluations_updated_at ON evaluations;
CREATE TRIGGER trg_evaluations_updated_at BEFORE UPDATE ON evaluations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
