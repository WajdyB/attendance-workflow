-- Attendance Workflow - Full Database Schema (PDF aligned)
-- Target: Supabase PostgreSQL
-- Source of truth: "Architecture Base de Données" PDF

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ENUMS (roles are NOT enums by design)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_type') THEN
    CREATE TYPE contract_type AS ENUM ('CDI', 'CDD', 'STAGE', 'FREELANCE');
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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM ('DRAFT', 'SENT', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type') THEN
    CREATE TYPE request_type AS ENUM ('LEAVE', 'AUGMENTATION', 'OTHER');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('IN_PROGRESS', 'FINISHED', 'SUSPENDED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('VALIDATED', 'INVALIDATED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE notification_status AS ENUM ('SEEN', 'UNSEEN');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'PUSH');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
    CREATE TYPE document_category AS ENUM ('HR', 'CONTRACT', 'PAYROLL', 'REQUEST_ATTACHMENT', 'OTHER');
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
-- STRUCTURAL TABLES
-- =========================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Central business profile table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  phone_fixed TEXT,
  address TEXT,
  personal_email TEXT UNIQUE,
  work_email TEXT UNIQUE,
  job_title TEXT,
  bank_name TEXT,
  bank_bic_swift TEXT,
  rib TEXT,
  cnss_number TEXT UNIQUE,
  account_status account_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If auth.users exists, enforce users.id -> auth.users(id) (ON DELETE CASCADE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    BEGIN
      ALTER TABLE users
        ADD CONSTRAINT users_id_auth_users_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

-- =========================================================
-- UML INHERITANCE SPECIALIZATION TABLES (1:1 strict)
-- =========================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaborators (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT collaborators_no_self_manager_chk CHECK (id <> manager_id)
);

-- =========================================================
-- FUNCTIONAL MODULES
-- =========================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_type contract_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  weekly_hours NUMERIC(5,2),
  base_salary NUMERIC(12,2),
  net_salary NUMERIC(12,2),
  bonuses NUMERIC(12,2),
  benefits_in_kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contracts_dates_chk CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  validated_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  old_salary NUMERIC(12,2) NOT NULL,
  new_salary NUMERIC(12,2) NOT NULL,
  change_date DATE NOT NULL,
  status approval_status NOT NULL DEFAULT 'VALIDATED',
  decision_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salary_history_non_negative_chk CHECK (old_salary >= 0 AND new_salary >= 0)
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  allocated_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  pending_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  remaining_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_balances_unique_user_year UNIQUE (user_id, year)
);

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decided_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  status timesheet_status NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  decision_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT timesheets_unique_user_week UNIQUE (user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT,
  status project_status NOT NULL DEFAULT 'IN_PROGRESS',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_dates_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  role_on_project TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_assignments_dates_chk CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
);

-- One active assignment max for each (project, collaborator)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_assignments_active
ON project_assignments(project_id, collaborator_id)
WHERE unassigned_at IS NULL;

-- Single-table inheritance for leave + augmentation requests
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decided_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  request_type request_type NOT NULL,
  status request_status NOT NULL DEFAULT 'DRAFT',
  comment TEXT,
  decision_comment TEXT,
  leave_paid BOOLEAN,
  leave_start_date DATE,
  leave_end_date DATE,
  proposed_salary NUMERIC(12,2),
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT requests_leave_dates_chk CHECK (leave_end_date IS NULL OR leave_start_date IS NULL OR leave_end_date >= leave_start_date),
  CONSTRAINT requests_type_consistency_chk CHECK (
    (request_type = 'LEAVE' AND leave_start_date IS NOT NULL AND leave_end_date IS NOT NULL)
    OR (request_type = 'AUGMENTATION' AND proposed_salary IS NOT NULL AND effective_date IS NOT NULL)
    OR (request_type = 'OTHER')
  )
);

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  review_date DATE,
  global_score NUMERIC(5,2),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluations_score_chk CHECK (global_score IS NULL OR (global_score >= 0 AND global_score <= 100))
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  category document_category NOT NULL,
  title TEXT,
  description TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  original_name TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  file_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT documents_file_size_chk CHECK (file_size IS NULL OR file_size >= 0),
  CONSTRAINT documents_version_chk CHECK (version_number > 0)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  title TEXT,
  message TEXT,
  status notification_status NOT NULL DEFAULT 'UNSEEN',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_personal_email ON users(personal_email);
CREATE INDEX IF NOT EXISTS idx_users_work_email ON users(work_email);

CREATE INDEX IF NOT EXISTS idx_collaborators_manager_id ON collaborators(manager_id);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_user_id ON salary_history(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_status ON timesheets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_collaborator ON project_assignments(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_requests_submitted_by ON requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_requests_decided_by ON requests(decided_by);
CREATE INDEX IF NOT EXISTS idx_requests_type_status ON requests(request_type, status);
CREATE INDEX IF NOT EXISTS idx_evaluations_manager ON evaluations(manager_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_collaborator ON evaluations(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_user_title_category_version ON documents(user_id, title, category, version_number);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON notifications(recipient_id, status);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================
DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_salary_history_updated_at ON salary_history;
CREATE TRIGGER trg_salary_history_updated_at BEFORE UPDATE ON salary_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER trg_leave_balances_updated_at BEFORE UPDATE ON leave_balances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_timesheets_updated_at ON timesheets;
CREATE TRIGGER trg_timesheets_updated_at BEFORE UPDATE ON timesheets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_assignments_updated_at ON project_assignments;
CREATE TRIGGER trg_project_assignments_updated_at BEFORE UPDATE ON project_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_evaluations_updated_at ON evaluations;
CREATE TRIGGER trg_evaluations_updated_at BEFORE UPDATE ON evaluations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- RLS BASELINE (Collaborator / Manager / Admin)
-- =========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT r.description
  FROM public.users u
  LEFT JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() ILIKE 'admin%', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() ILIKE 'manager%', FALSE);
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_policy'
  ) THEN
    CREATE POLICY users_select_policy ON users
      FOR SELECT
      USING (
        auth.uid() = id
        OR public.is_admin()
        OR (
          public.is_manager()
          AND EXISTS (
            SELECT 1
            FROM collaborators c
            WHERE c.id = users.id AND c.manager_id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timesheets' AND policyname = 'timesheets_policy'
  ) THEN
    CREATE POLICY timesheets_policy ON timesheets
      FOR ALL
      USING (
        auth.uid() = user_id
        OR public.is_admin()
        OR (
          public.is_manager()
          AND EXISTS (
            SELECT 1
            FROM collaborators c
            WHERE c.id = timesheets.user_id AND c.manager_id = auth.uid()
          )
        )
      )
      WITH CHECK (
        auth.uid() = user_id
        OR public.is_admin()
        OR (
          public.is_manager()
          AND EXISTS (
            SELECT 1
            FROM collaborators c
            WHERE c.id = timesheets.user_id AND c.manager_id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requests' AND policyname = 'requests_policy'
  ) THEN
    CREATE POLICY requests_policy ON requests
      FOR ALL
      USING (
        auth.uid() = submitted_by
        OR public.is_admin()
        OR (
          public.is_manager()
          AND EXISTS (
            SELECT 1
            FROM collaborators c
            WHERE c.id = requests.submitted_by AND c.manager_id = auth.uid()
          )
        )
      )
      WITH CHECK (
        auth.uid() = submitted_by
        OR public.is_admin()
        OR (
          public.is_manager()
          AND EXISTS (
            SELECT 1
            FROM collaborators c
            WHERE c.id = requests.submitted_by AND c.manager_id = auth.uid()
          )
        )
      );
  END IF;
END$$;

COMMIT;
