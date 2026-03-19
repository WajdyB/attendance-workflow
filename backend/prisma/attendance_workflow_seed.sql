-- Attendance Workflow - Seed Data
-- Target: PostgreSQL / Supabase
-- Prerequisite: execute attendance_workflow_full_schema.sql first.
-- Idempotent style: uses ON CONFLICT where possible.

BEGIN;

-- =========================================================
-- DEPARTMENTS
-- =========================================================
INSERT INTO departments (code, name, description)
VALUES
  ('RH', 'Human Resources', 'HR operations and workforce administration'),
  ('ENG', 'Engineering', 'Software development and technical delivery'),
  ('FIN', 'Finance', 'Financial management and reporting'),
  ('OPS', 'Operations', 'Operational support and service continuity')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =========================================================
-- USERS (access accounts)
-- =========================================================
INSERT INTO users (email, role, account_status)
VALUES
  ('hr.admin@attendance.local', 'HR_ADMIN', 'ACTIVE'),
  ('manager.operations@attendance.local', 'MANAGER', 'ACTIVE'),
  ('employee.dev1@attendance.local', 'COLLABORATOR', 'ACTIVE'),
  ('employee.dev2@attendance.local', 'COLLABORATOR', 'ACTIVE'),
  ('director@attendance.local', 'DIRECTION', 'ACTIVE')
ON CONFLICT (email) DO UPDATE
SET
  role = EXCLUDED.role,
  account_status = EXCLUDED.account_status,
  updated_at = NOW();

-- =========================================================
-- EMPLOYEES (linked to users)
-- =========================================================
INSERT INTO employees (
  user_id,
  employee_code,
  first_name,
  last_name,
  birth_date,
  cnss_number,
  personal_email,
  work_email,
  mobile_phone,
  fixed_phone,
  postal_address,
  iban,
  bic_swift,
  bank_name,
  job_title,
  role_function,
  department_id,
  current_pto_balance_days
)
SELECT
  u.id,
  v.employee_code,
  v.first_name,
  v.last_name,
  v.birth_date,
  v.cnss_number,
  v.personal_email,
  v.work_email,
  v.mobile_phone,
  v.fixed_phone,
  v.postal_address,
  v.iban,
  v.bic_swift,
  v.bank_name,
  v.job_title,
  v.role_function,
  d.id,
  v.current_pto_balance_days
FROM (
  VALUES
    (
      'hr.admin@attendance.local',
      'EMP-001',
      'Nadia',
      'Amrani',
      DATE '1989-04-16',
      'CNSS-HR-001',
      'nadia.amrani.personal@example.com',
      'nadia.amrani@attendance.local',
      '+212600000001',
      '+212500000001',
      'Casablanca, Morocco',
      'MA6400112200112233445566',
      'BCMAMAMC',
      'Banque Centrale',
      'HR Administrator',
      'People Operations Lead',
      'RH',
      24.0
    ),
    (
      'manager.operations@attendance.local',
      'EMP-002',
      'Youssef',
      'Bennani',
      DATE '1987-09-03',
      'CNSS-MGR-002',
      'youssef.bennani.personal@example.com',
      'youssef.bennani@attendance.local',
      '+212600000002',
      '+212500000002',
      'Rabat, Morocco',
      'MA6400112200112233445567',
      'BCMAMAMC',
      'Banque Centrale',
      'Operations Manager',
      'Team Manager',
      'OPS',
      18.0
    ),
    (
      'employee.dev1@attendance.local',
      'EMP-003',
      'Salma',
      'El Idrissi',
      DATE '1994-01-22',
      'CNSS-EMP-003',
      'salma.idrissi.personal@example.com',
      'salma.idrissi@attendance.local',
      '+212600000003',
      NULL,
      'Kenitra, Morocco',
      'MA6400112200112233445568',
      'BCMAMAMC',
      'Banque Centrale',
      'Frontend Engineer',
      'Software Engineer',
      'ENG',
      16.0
    ),
    (
      'employee.dev2@attendance.local',
      'EMP-004',
      'Omar',
      'Fassi',
      DATE '1992-11-10',
      'CNSS-EMP-004',
      'omar.fassi.personal@example.com',
      'omar.fassi@attendance.local',
      '+212600000004',
      NULL,
      'Tangier, Morocco',
      'MA6400112200112233445569',
      'BCMAMAMC',
      'Banque Centrale',
      'Backend Engineer',
      'Software Engineer',
      'ENG',
      14.0
    ),
    (
      'director@attendance.local',
      'EMP-005',
      'Karim',
      'Alaoui',
      DATE '1982-06-08',
      'CNSS-DIR-005',
      'karim.alaoui.personal@example.com',
      'karim.alaoui@attendance.local',
      '+212600000005',
      '+212500000005',
      'Casablanca, Morocco',
      'MA6400112200112233445570',
      'BCMAMAMC',
      'Banque Centrale',
      'Director of Operations',
      'Executive Leadership',
      'OPS',
      30.0
    )
) AS v(
  user_email,
  employee_code,
  first_name,
  last_name,
  birth_date,
  cnss_number,
  personal_email,
  work_email,
  mobile_phone,
  fixed_phone,
  postal_address,
  iban,
  bic_swift,
  bank_name,
  job_title,
  role_function,
  department_code,
  current_pto_balance_days
)
JOIN users u ON u.email = v.user_email
JOIN departments d ON d.code = v.department_code
ON CONFLICT (user_id) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  birth_date = EXCLUDED.birth_date,
  mobile_phone = EXCLUDED.mobile_phone,
  fixed_phone = EXCLUDED.fixed_phone,
  postal_address = EXCLUDED.postal_address,
  iban = EXCLUDED.iban,
  bic_swift = EXCLUDED.bic_swift,
  bank_name = EXCLUDED.bank_name,
  job_title = EXCLUDED.job_title,
  role_function = EXCLUDED.role_function,
  department_id = EXCLUDED.department_id,
  current_pto_balance_days = EXCLUDED.current_pto_balance_days,
  updated_at = NOW();

-- Manager hierarchy setup
UPDATE employees e
SET manager_id = m.id,
    updated_at = NOW()
FROM employees m
WHERE m.work_email = 'youssef.bennani@attendance.local'
  AND e.work_email IN ('salma.idrissi@attendance.local', 'omar.fassi@attendance.local')
  AND (e.manager_id IS DISTINCT FROM m.id);

INSERT INTO hierarchy (employee_id, manager_id, started_at, reason)
SELECT
  e.id,
  m.id,
  DATE '2026-01-01',
  'Initial team assignment'
FROM employees e
JOIN employees m ON m.work_email = 'youssef.bennani@attendance.local'
WHERE e.work_email IN ('salma.idrissi@attendance.local', 'omar.fassi@attendance.local')
  AND NOT EXISTS (
    SELECT 1 FROM hierarchy h
    WHERE h.employee_id = e.id
      AND h.manager_id = m.id
      AND h.started_at = DATE '2026-01-01'
  );

-- =========================================================
-- CONTRACTS + SALARY HISTORY
-- =========================================================
INSERT INTO contracts (
  employee_id,
  contract_type,
  start_date,
  end_date,
  weekly_hours,
  gross_monthly_salary,
  net_monthly_salary,
  bonuses,
  benefits_in_kind,
  is_active
)
SELECT
  e.id,
  v.contract_type::employment_type,
  v.start_date,
  v.end_date,
  v.weekly_hours,
  v.gross_salary,
  v.net_salary,
  v.bonuses,
  v.benefits,
  TRUE
FROM (
  VALUES
    ('nadia.amrani@attendance.local', 'CDI', DATE '2024-01-01', NULL::date, 40.0, 32000.00, 25000.00, 2000.00, 'Health package + transport'),
    ('youssef.bennani@attendance.local', 'CDI', DATE '2023-03-15', NULL::date, 40.0, 36000.00, 28000.00, 2500.00, 'Health package + meal allowance'),
    ('salma.idrissi@attendance.local', 'CDI', DATE '2025-02-10', NULL::date, 40.0, 22000.00, 17000.00, 1200.00, 'Transport allowance'),
    ('omar.fassi@attendance.local', 'CDI', DATE '2025-02-10', NULL::date, 40.0, 22500.00, 17400.00, 1200.00, 'Transport allowance'),
    ('karim.alaoui@attendance.local', 'CDI', DATE '2021-09-01', NULL::date, 40.0, 50000.00, 38500.00, 5000.00, 'Executive package')
) AS v(
  work_email,
  contract_type,
  start_date,
  end_date,
  weekly_hours,
  gross_salary,
  net_salary,
  bonuses,
  benefits
)
JOIN employees e ON e.work_email = v.work_email
WHERE NOT EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.employee_id = e.id
    AND c.start_date = v.start_date
    AND c.is_active = TRUE
);

INSERT INTO salary_history (
  employee_id,
  contract_id,
  effective_date,
  old_salary,
  new_salary,
  increase_percent,
  reason,
  approved_by_user_id
)
SELECT
  e.id,
  c.id,
  DATE '2026-01-01',
  20500.00,
  22000.00,
  7.32,
  'Annual review adjustment',
  u.id
FROM employees e
JOIN contracts c ON c.employee_id = e.id AND c.is_active = TRUE
JOIN users u ON u.email = 'hr.admin@attendance.local'
WHERE e.work_email = 'salma.idrissi@attendance.local'
  AND NOT EXISTS (
    SELECT 1 FROM salary_history sh
    WHERE sh.employee_id = e.id
      AND sh.effective_date = DATE '2026-01-01'
  );

-- =========================================================
-- PROJECTS + ASSIGNMENTS
-- =========================================================
INSERT INTO projects (
  project_code,
  name,
  description,
  client_name,
  start_date,
  end_date,
  status,
  budget_hours,
  budget_amount,
  project_manager_id
)
SELECT
  v.project_code,
  v.name,
  v.description,
  v.client_name,
  v.start_date,
  v.end_date,
  v.status::project_status,
  v.budget_hours,
  v.budget_amount,
  pm.id
FROM (
  VALUES
    ('PRJ-HR-001', 'Attendance Workflow MVP', 'Core HR platform implementation for workflows and governance.', 'Internal', DATE '2026-01-10', NULL::date, 'IN_PROGRESS', 1800.0, 650000.00, 'youssef.bennani@attendance.local'),
    ('PRJ-BI-002', 'HR Analytics Enablement', 'Operational reporting pipeline and dashboard architecture.', 'Internal', DATE '2026-02-01', NULL::date, 'IN_PROGRESS', 700.0, 280000.00, 'karim.alaoui@attendance.local'),
    ('PRJ-OPS-003', 'Policy Digitization', 'Digital workflow mapping of leave and compliance policies.', 'Internal', DATE '2026-01-20', NULL::date, 'IN_PROGRESS', 420.0, 120000.00, 'nadia.amrani@attendance.local')
) AS v(
  project_code,
  name,
  description,
  client_name,
  start_date,
  end_date,
  status,
  budget_hours,
  budget_amount,
  manager_email
)
LEFT JOIN employees pm ON pm.work_email = v.manager_email
ON CONFLICT (project_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  client_name = EXCLUDED.client_name,
  status = EXCLUDED.status,
  budget_hours = EXCLUDED.budget_hours,
  budget_amount = EXCLUDED.budget_amount,
  project_manager_id = EXCLUDED.project_manager_id,
  updated_at = NOW();

INSERT INTO project_assignments (project_id, employee_id, role_on_project, assigned_at)
SELECT p.id, e.id, v.role_on_project, v.assigned_at
FROM (
  VALUES
    ('PRJ-HR-001', 'salma.idrissi@attendance.local', 'Frontend Lead', DATE '2026-01-15'),
    ('PRJ-HR-001', 'omar.fassi@attendance.local', 'Backend Lead', DATE '2026-01-15'),
    ('PRJ-HR-001', 'youssef.bennani@attendance.local', 'Project Manager', DATE '2026-01-10'),
    ('PRJ-BI-002', 'karim.alaoui@attendance.local', 'Executive Sponsor', DATE '2026-02-01'),
    ('PRJ-BI-002', 'nadia.amrani@attendance.local', 'Business Owner', DATE '2026-02-05')
) AS v(project_code, work_email, role_on_project, assigned_at)
JOIN projects p ON p.project_code = v.project_code
JOIN employees e ON e.work_email = v.work_email
ON CONFLICT (project_id, employee_id, assigned_at) DO NOTHING;

-- =========================================================
-- TIMESHEETS + ENTRIES
-- =========================================================
INSERT INTO timesheets (
  employee_id,
  week_start_date,
  week_end_date,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by_employee_id,
  reviewer_comment,
  is_locked
)
SELECT
  e.id,
  DATE '2026-03-09',
  DATE '2026-03-15',
  'APPROVED',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '4 days',
  m.id,
  'Validated and approved.',
  TRUE
FROM employees e
LEFT JOIN employees m ON m.work_email = 'youssef.bennani@attendance.local'
WHERE e.work_email = 'salma.idrissi@attendance.local'
ON CONFLICT (employee_id, week_start_date) DO UPDATE
SET
  status = EXCLUDED.status,
  submitted_at = EXCLUDED.submitted_at,
  reviewed_at = EXCLUDED.reviewed_at,
  reviewed_by_employee_id = EXCLUDED.reviewed_by_employee_id,
  reviewer_comment = EXCLUDED.reviewer_comment,
  is_locked = EXCLUDED.is_locked,
  updated_at = NOW();

INSERT INTO timesheet_entries (
  timesheet_id,
  employee_id,
  project_id,
  entry_date,
  task_label,
  activity_description,
  hours_worked,
  overtime_hours,
  is_overtime
)
SELECT
  t.id,
  e.id,
  p.id,
  v.entry_date,
  v.task_label,
  v.activity_description,
  v.hours_worked,
  v.overtime_hours,
  (v.overtime_hours > 0)
FROM (
  VALUES
    ('salma.idrissi@attendance.local', 'PRJ-HR-001', DATE '2026-03-10', 'UI Architecture', 'Structured dashboard layout and reusable components.', 8.0, 0.0),
    ('salma.idrissi@attendance.local', 'PRJ-HR-001', DATE '2026-03-11', 'Auth UX', 'Improved login and password recovery flows.', 8.5, 0.5),
    ('salma.idrissi@attendance.local', 'PRJ-HR-001', DATE '2026-03-12', 'Landing Page', 'Implemented premium landing sections and interactions.', 9.0, 1.0),
    ('salma.idrissi@attendance.local', 'PRJ-BI-002', DATE '2026-03-13', 'Data Visual Spec', 'Prepared KPI card and reporting visual specs.', 7.5, 0.0)
) AS v(work_email, project_code, entry_date, task_label, activity_description, hours_worked, overtime_hours)
JOIN employees e ON e.work_email = v.work_email
JOIN timesheets t ON t.employee_id = e.id AND t.week_start_date = DATE '2026-03-09'
JOIN projects p ON p.project_code = v.project_code
WHERE NOT EXISTS (
  SELECT 1 FROM timesheet_entries te
  WHERE te.timesheet_id = t.id
    AND te.project_id = p.id
    AND te.entry_date = v.entry_date
    AND COALESCE(te.task_label, '') = COALESCE(v.task_label, '')
);

-- =========================================================
-- HOLIDAYS + LEAVE BALANCES + LEAVE REQUESTS
-- =========================================================
INSERT INTO holidays (holiday_date, name, country_code, is_variable_date)
VALUES
  (DATE '2026-01-01', 'New Year', 'MA', FALSE),
  (DATE '2026-03-20', 'Aid al-Fitr (Estimated)', 'MA', TRUE),
  (DATE '2026-05-01', 'Labour Day', 'MA', FALSE),
  (DATE '2026-07-30', 'Throne Day', 'MA', FALSE)
ON CONFLICT (holiday_date) DO UPDATE
SET
  name = EXCLUDED.name,
  country_code = EXCLUDED.country_code,
  is_variable_date = EXCLUDED.is_variable_date,
  updated_at = NOW();

INSERT INTO leave_balances (
  employee_id,
  leave_year,
  leave_type,
  allocated_days,
  carried_over_days,
  used_days,
  pending_days,
  remaining_days
)
SELECT
  e.id,
  2026,
  'PTO',
  22.0,
  2.0,
  5.0,
  2.0,
  17.0
FROM employees e
WHERE e.work_email IN (
  'salma.idrissi@attendance.local',
  'omar.fassi@attendance.local',
  'youssef.bennani@attendance.local'
)
ON CONFLICT (employee_id, leave_year, leave_type) DO UPDATE
SET
  allocated_days = EXCLUDED.allocated_days,
  carried_over_days = EXCLUDED.carried_over_days,
  used_days = EXCLUDED.used_days,
  pending_days = EXCLUDED.pending_days,
  remaining_days = EXCLUDED.remaining_days,
  updated_at = NOW();

INSERT INTO leave_requests (
  employee_id,
  leave_type,
  start_date,
  end_date,
  working_days_count,
  reason,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by_employee_id,
  reviewer_comment
)
SELECT
  e.id,
  'PTO',
  DATE '2026-04-07',
  DATE '2026-04-09',
  3.0,
  'Personal leave',
  'APPROVED',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '9 days',
  m.id,
  'Approved with no conflict in team schedule.'
FROM employees e
LEFT JOIN employees m ON m.work_email = 'youssef.bennani@attendance.local'
WHERE e.work_email = 'salma.idrissi@attendance.local'
  AND NOT EXISTS (
    SELECT 1 FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.start_date = DATE '2026-04-07'
      AND lr.end_date = DATE '2026-04-09'
      AND lr.leave_type = 'PTO'
  );

-- =========================================================
-- DOCUMENTS + EVALUATIONS
-- =========================================================
INSERT INTO documents (
  employee_id,
  category,
  title,
  file_name,
  file_path,
  mime_type,
  file_size_bytes,
  version_number,
  tags,
  uploaded_by_user_id,
  metadata
)
SELECT
  e.id,
  'CONTRACT',
  'Employment Contract - Salma El Idrissi',
  'contract_salma_el_idrissi_v1.pdf',
  'documents/contracts/salma_el_idrissi/contract_v1.pdf',
  'application/pdf',
  248000,
  1,
  ARRAY['contract', 'employment', 'signed'],
  u.id,
  jsonb_build_object('confidential', true, 'source', 'hr-upload')
FROM employees e
JOIN users u ON u.email = 'hr.admin@attendance.local'
WHERE e.work_email = 'salma.idrissi@attendance.local'
  AND NOT EXISTS (
    SELECT 1 FROM documents d
    WHERE d.employee_id = e.id
      AND d.file_name = 'contract_salma_el_idrissi_v1.pdf'
  );

INSERT INTO evaluations (
  employee_id,
  evaluator_employee_id,
  evaluation_type,
  evaluation_date,
  overall_score,
  criteria_json,
  comments,
  recommendations,
  next_period_objectives
)
SELECT
  e.id,
  m.id,
  'SEMESTER',
  DATE '2026-06-30',
  87.5,
  jsonb_build_object(
    'technical_skills', 90,
    'delivery_reliability', 86,
    'collaboration', 88,
    'communication', 84
  ),
  'Strong ownership and consistent delivery quality.',
  'Expand mentoring responsibilities in frontend architecture.',
  'Lead one cross-team UI architecture initiative in next cycle.'
FROM employees e
LEFT JOIN employees m ON m.work_email = 'youssef.bennani@attendance.local'
WHERE e.work_email = 'salma.idrissi@attendance.local'
  AND NOT EXISTS (
    SELECT 1 FROM evaluations ev
    WHERE ev.employee_id = e.id
      AND ev.evaluation_type = 'SEMESTER'
      AND ev.evaluation_date = DATE '2026-06-30'
  );

-- =========================================================
-- NOTIFICATIONS + AUDIT LOGS
-- =========================================================
INSERT INTO notifications (
  recipient_user_id,
  sender_user_id,
  type,
  title,
  message,
  payload,
  is_read,
  read_at
)
SELECT
  recipient.id,
  sender.id,
  'TIMESHEET_APPROVED',
  'Timesheet Approved',
  'Your weekly timesheet for 2026-03-09 to 2026-03-15 has been approved.',
  jsonb_build_object('week_start_date', '2026-03-09', 'week_end_date', '2026-03-15'),
  FALSE,
  NULL
FROM users recipient
JOIN users sender ON sender.email = 'manager.operations@attendance.local'
WHERE recipient.email = 'employee.dev1@attendance.local'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.recipient_user_id = recipient.id
      AND n.title = 'Timesheet Approved'
      AND n.created_at::date = CURRENT_DATE
  );

INSERT INTO audit_logs (
  actor_user_id,
  actor_employee_id,
  action,
  entity_type,
  entity_id,
  details,
  ip_address,
  user_agent
)
SELECT
  u.id,
  e.id,
  'APPROVE_TIMESHEET',
  'timesheets',
  t.id,
  jsonb_build_object('status', 'APPROVED', 'comment', 'Validated and approved.'),
  '127.0.0.1'::inet,
  'seed-script'
FROM users u
JOIN employees e ON e.user_id = u.id
JOIN timesheets t ON t.employee_id = (SELECT id FROM employees WHERE work_email = 'salma.idrissi@attendance.local')
WHERE u.email = 'manager.operations@attendance.local'
  AND t.week_start_date = DATE '2026-03-09'
  AND NOT EXISTS (
    SELECT 1 FROM audit_logs a
    WHERE a.entity_type = 'timesheets'
      AND a.entity_id = t.id
      AND a.action = 'APPROVE_TIMESHEET'
  );

COMMIT;
