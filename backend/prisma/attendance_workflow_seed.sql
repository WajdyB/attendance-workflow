-- Attendance Workflow - Seed Data (PDF aligned)
-- Target: PostgreSQL / Supabase
-- Prerequisite:
--   1) Execute attendance_workflow_full_schema.sql
--   2) Create these Auth users in Supabase first (same emails as personal_email)
--      because public.users.id is aligned with auth.users.id

BEGIN;

-- =========================================================
-- STRUCTURAL REFERENCES
-- =========================================================
INSERT INTO departments (code, name)
VALUES
  ('RH', 'Human Resources'),
  ('ENG', 'Engineering'),
  ('FIN', 'Finance'),
  ('OPS', 'Operations')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = NOW();

INSERT INTO roles (description)
VALUES
  ('Admin'),
  ('Manager'),
  ('Collaborator')
ON CONFLICT (description) DO UPDATE
SET
  updated_at = NOW();

-- =========================================================
-- USERS (from auth.users)
-- =========================================================
WITH seed_users AS (
  SELECT *
  FROM (VALUES
    (
      'hr.admin@attendance.local',
      'Admin',
      'RH',
      'Nadia',
      'Amrani',
      DATE '1989-04-16',
      '+212600000001',
      'Casablanca, Morocco',
      'nadia.amrani@attendance.local',
      'HR Administrator',
      'Banque Centrale',
      'MA6400112200112233445566',
      'CNSS-HR-001'
    ),
    (
      'manager.operations@attendance.local',
      'Manager',
      'OPS',
      'Youssef',
      'Bennani',
      DATE '1987-09-03',
      '+212600000002',
      'Rabat, Morocco',
      'youssef.bennani@attendance.local',
      'Operations Manager',
      'Banque Centrale',
      'MA6400112200112233445567',
      'CNSS-MGR-002'
    ),
    (
      'employee.dev1@attendance.local',
      'Collaborator',
      'ENG',
      'Salma',
      'El Idrissi',
      DATE '1994-01-22',
      '+212600000003',
      'Kenitra, Morocco',
      'salma.idrissi@attendance.local',
      'Frontend Engineer',
      'Banque Centrale',
      'MA6400112200112233445568',
      'CNSS-EMP-003'
    ),
    (
      'employee.dev2@attendance.local',
      'Collaborator',
      'ENG',
      'Omar',
      'Fassi',
      DATE '1992-11-10',
      '+212600000004',
      'Tangier, Morocco',
      'omar.fassi@attendance.local',
      'Backend Engineer',
      'Banque Centrale',
      'MA6400112200112233445569',
      'CNSS-EMP-004'
    )
  ) AS t(
    personal_email,
    role_description,
    department_code,
    first_name,
    last_name,
    birth_date,
    phone,
    address,
    work_email,
    job_title,
    bank_name,
    rib,
    cnss_number
  )
)
INSERT INTO users (
  id,
  role_id,
  department_id,
  first_name,
  last_name,
  birth_date,
  phone,
  address,
  personal_email,
  work_email,
  job_title,
  bank_name,
  rib,
  cnss_number,
  account_status
)
SELECT
  au.id,
  r.id,
  d.id,
  su.first_name,
  su.last_name,
  su.birth_date,
  su.phone,
  su.address,
  su.personal_email,
  su.work_email,
  su.job_title,
  su.bank_name,
  su.rib,
  su.cnss_number,
  'ACTIVE'::account_status
FROM seed_users su
JOIN auth.users au ON au.email = su.personal_email
JOIN roles r ON r.description = su.role_description
JOIN departments d ON d.code = su.department_code
ON CONFLICT (id) DO UPDATE
SET
  role_id = EXCLUDED.role_id,
  department_id = EXCLUDED.department_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  birth_date = EXCLUDED.birth_date,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  personal_email = EXCLUDED.personal_email,
  work_email = EXCLUDED.work_email,
  job_title = EXCLUDED.job_title,
  bank_name = EXCLUDED.bank_name,
  rib = EXCLUDED.rib,
  cnss_number = EXCLUDED.cnss_number,
  account_status = EXCLUDED.account_status,
  updated_at = NOW();

-- =========================================================
-- SPECIALIZATION TABLES (inheritance)
-- =========================================================
INSERT INTO admins (id)
SELECT u.id
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.description = 'Admin'
ON CONFLICT (id) DO NOTHING;

INSERT INTO managers (id)
SELECT u.id
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.description = 'Manager'
ON CONFLICT (id) DO NOTHING;

INSERT INTO collaborators (id, manager_id)
SELECT
  u.id,
  m.id AS manager_id
FROM users u
JOIN roles r ON r.id = u.role_id AND r.description = 'Collaborator'
JOIN users manager_user ON manager_user.personal_email = 'manager.operations@attendance.local'
JOIN managers m ON m.id = manager_user.id
ON CONFLICT (id) DO UPDATE
SET manager_id = EXCLUDED.manager_id;

-- =========================================================
-- CONTRACTS
-- =========================================================
INSERT INTO contracts (
  user_id,
  contract_type,
  start_date,
  end_date,
  weekly_hours,
  base_salary
)
SELECT
  u.id,
  v.contract_type::contract_type,
  v.start_date,
  v.end_date,
  v.weekly_hours,
  v.base_salary
FROM (
  VALUES
    ('hr.admin@attendance.local', 'CDI', DATE '2024-01-01', NULL::date, 40.0, 32000.00),
    ('manager.operations@attendance.local', 'CDI', DATE '2023-03-15', NULL::date, 40.0, 36000.00),
    ('employee.dev1@attendance.local', 'CDI', DATE '2025-02-10', NULL::date, 40.0, 22000.00),
    ('employee.dev2@attendance.local', 'CDI', DATE '2025-02-10', NULL::date, 40.0, 22500.00)
) AS v(email, contract_type, start_date, end_date, weekly_hours, base_salary)
JOIN users u ON u.personal_email = v.email
WHERE NOT EXISTS (
  SELECT 1
  FROM contracts c
  WHERE c.user_id = u.id
    AND c.start_date = v.start_date
    AND c.contract_type = v.contract_type::contract_type
);

-- =========================================================
-- SALARY HISTORY
-- =========================================================
INSERT INTO salary_history (
  user_id,
  validated_by,
  old_salary,
  new_salary,
  change_date,
  status,
  decision_comment
)
SELECT
  user_u.id,
  manager_u.id,
  20500.00,
  22000.00,
  DATE '2026-01-01',
  'VALIDATED',
  'Annual review adjustment'
FROM users user_u
JOIN users manager_u ON manager_u.personal_email = 'manager.operations@attendance.local'
WHERE user_u.personal_email = 'employee.dev1@attendance.local'
  AND NOT EXISTS (
    SELECT 1
    FROM salary_history sh
    WHERE sh.user_id = user_u.id
      AND sh.change_date = DATE '2026-01-01'
  );

-- =========================================================
-- LEAVE BALANCES
-- =========================================================
INSERT INTO leave_balances (
  user_id,
  year,
  allocated_days,
  used_days,
  pending_days,
  remaining_days
)
SELECT
  u.id,
  2026,
  22.0,
  5.0,
  2.0,
  15.0
FROM users u
WHERE u.personal_email IN (
  'employee.dev1@attendance.local',
  'employee.dev2@attendance.local',
  'manager.operations@attendance.local'
)
ON CONFLICT (user_id, year) DO UPDATE
SET
  allocated_days = EXCLUDED.allocated_days,
  used_days = EXCLUDED.used_days,
  pending_days = EXCLUDED.pending_days,
  remaining_days = EXCLUDED.remaining_days,
  updated_at = NOW();

-- =========================================================
-- TIMESHEETS
-- =========================================================
INSERT INTO timesheets (
  user_id,
  decided_by,
  week_start_date,
  status,
  submitted_at,
  decision_comment
)
SELECT
  collab.id,
  manager.id,
  DATE '2026-03-09',
  'APPROVED',
  NOW() - INTERVAL '5 days',
  'Validated and approved.'
FROM users collab
JOIN users manager ON manager.personal_email = 'manager.operations@attendance.local'
WHERE collab.personal_email = 'employee.dev1@attendance.local'
ON CONFLICT (user_id, week_start_date) DO UPDATE
SET
  decided_by = EXCLUDED.decided_by,
  status = EXCLUDED.status,
  submitted_at = EXCLUDED.submitted_at,
  decision_comment = EXCLUDED.decision_comment,
  updated_at = NOW();

-- =========================================================
-- PROJECTS & ASSIGNMENTS
-- =========================================================
INSERT INTO projects (
  code,
  name,
  status,
  start_date,
  end_date
)
VALUES
  ('PRJ-HR-001', 'Attendance Workflow MVP', 'IN_PROGRESS', DATE '2026-01-10', NULL),
  ('PRJ-BI-002', 'HR Analytics Enablement', 'IN_PROGRESS', DATE '2026-02-01', NULL)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  updated_at = NOW();

INSERT INTO project_assignments (
  project_id,
  collaborator_id,
  role_on_project,
  assigned_at
)
SELECT
  p.id,
  c.id,
  v.role_on_project,
  v.assigned_at
FROM (
  VALUES
    ('PRJ-HR-001', 'employee.dev1@attendance.local', 'Frontend Lead', NOW() - INTERVAL '60 days'),
    ('PRJ-HR-001', 'employee.dev2@attendance.local', 'Backend Lead', NOW() - INTERVAL '60 days')
) AS v(project_code, personal_email, role_on_project, assigned_at)
JOIN projects p ON p.code = v.project_code
JOIN users u ON u.personal_email = v.personal_email
JOIN collaborators c ON c.id = u.id
WHERE NOT EXISTS (
  SELECT 1
  FROM project_assignments pa
  WHERE pa.project_id = p.id
    AND pa.collaborator_id = c.id
    AND pa.unassigned_at IS NULL
);

-- =========================================================
-- REQUESTS (single-table inheritance)
-- =========================================================
INSERT INTO requests (
  submitted_by,
  decided_by,
  request_type,
  status,
  comment,
  decision_comment,
  leave_paid,
  leave_start_date,
  leave_end_date
)
SELECT
  collab.id,
  manager.id,
  'LEAVE',
  'APPROVED',
  'Personal leave',
  'Approved with no conflict in team schedule.',
  TRUE,
  DATE '2026-04-07',
  DATE '2026-04-09'
FROM users collab
JOIN users manager ON manager.personal_email = 'manager.operations@attendance.local'
WHERE collab.personal_email = 'employee.dev1@attendance.local'
  AND NOT EXISTS (
    SELECT 1
    FROM requests r
    WHERE r.submitted_by = collab.id
      AND r.request_type = 'LEAVE'
      AND r.leave_start_date = DATE '2026-04-07'
      AND r.leave_end_date = DATE '2026-04-09'
  );

INSERT INTO requests (
  submitted_by,
  decided_by,
  request_type,
  status,
  comment,
  decision_comment,
  proposed_salary,
  effective_date
)
SELECT
  collab.id,
  manager.id,
  'AUGMENTATION',
  'PENDING',
  'Request salary review based on expanded responsibilities',
  NULL,
  24000.00,
  DATE '2026-07-01'
FROM users collab
JOIN users manager ON manager.personal_email = 'manager.operations@attendance.local'
WHERE collab.personal_email = 'employee.dev1@attendance.local'
  AND NOT EXISTS (
    SELECT 1
    FROM requests r
    WHERE r.submitted_by = collab.id
      AND r.request_type = 'AUGMENTATION'
      AND r.effective_date = DATE '2026-07-01'
  );

-- =========================================================
-- EVALUATIONS
-- =========================================================
INSERT INTO evaluations (
  manager_id,
  collaborator_id,
  review_date,
  global_score,
  comments
)
SELECT
  manager.id,
  collab.id,
  DATE '2026-06-30',
  87.5,
  'Strong ownership and delivery quality.'
FROM users manager_user
JOIN managers manager ON manager.id = manager_user.id
JOIN users collab_user ON collab_user.personal_email = 'employee.dev1@attendance.local'
JOIN collaborators collab ON collab.id = collab_user.id
WHERE manager_user.personal_email = 'manager.operations@attendance.local'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluations e
    WHERE e.manager_id = manager.id
      AND e.collaborator_id = collab.id
      AND e.review_date = DATE '2026-06-30'
  );

-- =========================================================
-- DOCUMENTS
-- =========================================================
INSERT INTO documents (
  user_id,
  category,
  title,
  file_url,
  file_type,
  file_size
)
SELECT
  u.id,
  'CONTRACT',
  'Employment Contract - Salma El Idrissi',
  'https://storage.supabase.co/object/public/documents/contracts/contract_salma_el_idrissi_v1.pdf',
  'application/pdf',
  248000
FROM users u
WHERE u.personal_email = 'employee.dev1@attendance.local'
  AND NOT EXISTS (
    SELECT 1
    FROM documents d
    WHERE d.user_id = u.id
      AND d.title = 'Employment Contract - Salma El Idrissi'
  );

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
INSERT INTO notifications (
  recipient_id,
  channel,
  title,
  message,
  status,
  sent_at
)
SELECT
  recipient.id,
  'IN_APP',
  'Timesheet Approved',
  'Your weekly timesheet has been approved.',
  'UNSEEN',
  NOW()
FROM users recipient
WHERE recipient.personal_email = 'employee.dev1@attendance.local'
  AND NOT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.recipient_id = recipient.id
      AND n.title = 'Timesheet Approved'
      AND n.created_at::date = CURRENT_DATE
  );

COMMIT;
