/**
 * Comprehensive database seed for RHpro
 * Creates Supabase auth users + seeds all public schema tables
 * Safe to re-run: all operations use upsert / ON CONFLICT semantics
 */

import {
  PrismaClient,
  ProjectStatus,
  ContractType,
  TimesheetStatus,
  RequestStatus,
  LeaveType,
  RequestType,
  AccountStatus,
  NotificationChannel,
  NotificationStatus,
  DocumentCategory,
  ApprovalStatus,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { Decimal } from '@prisma/client/runtime/library';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns the Monday of the week containing `date` */
function monday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Create a Supabase auth user if they don't exist yet.
 * Returns the auth user UUID.
 */
async function upsertAuthUser(email: string, password: string): Promise<string> {
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`  ↺  Auth user exists: ${email}`);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Auth createUser(${email}) failed: ${error.message}`);
  console.log(`  ✔  Auth user created: ${email}`);
  return data.user.id;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' RHpro Database Seed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 0. CLEAN SLATE ──────────────────────────────────────────────────────────
  console.log('0/12  Cleaning existing data...');

  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.request.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.timesheetEntry.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.salaryHistory.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.project.deleteMany();
  await prisma.publicHoliday.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✔  All existing data cleared\n');

  // ── 1. ROLES ────────────────────────────────────────────────────────────────
  console.log('1/12  Roles & Departments...');

  const roleNames = ['Admin', 'Manager', 'Collaborator'];
  const roles: Record<string, string> = {};
  for (const desc of roleNames) {
    const r = await prisma.role.upsert({
      where: { description: desc },
      create: { description: desc },
      update: {},
    });
    roles[desc] = r.id;
  }

  // ── 2. DEPARTMENTS ──────────────────────────────────────────────────────────
  const deptData = [
    { code: 'RH', name: 'Human Resources' },
    { code: 'ENG', name: 'Engineering' },
    { code: 'FIN', name: 'Finance' },
    { code: 'OPS', name: 'Operations' },
    { code: 'MKT', name: 'Marketing' },
  ];
  const depts: Record<string, string> = {};
  for (const d of deptData) {
    const row = await prisma.department.upsert({
      where: { code: d.code },
      create: d,
      update: { name: d.name },
    });
    depts[d.code] = row.id;
  }

  // ── 3. PUBLIC HOLIDAYS ──────────────────────────────────────────────────────
  console.log('2/12  Public holidays...');

  const holidays = [
    { name: 'Nouvel An', date: new Date('2026-01-01') },
    { name: 'Fête du Travail', date: new Date('2026-05-01') },
    { name: 'Fête du Trône', date: new Date('2026-07-30') },
    { name: 'Marche Verte', date: new Date('2026-11-06') },
    { name: "Fête de l'Indépendance", date: new Date('2026-11-18') },
    { name: 'Aïd al-Fitr (1er jour)', date: new Date('2026-03-30') },
    { name: 'Aïd al-Fitr (2ème jour)', date: new Date('2026-03-31') },
    { name: 'Aïd al-Adha (1er jour)', date: new Date('2026-06-06') },
    { name: 'Aïd al-Adha (2ème jour)', date: new Date('2026-06-07') },
    { name: 'Fête de la Jeunesse', date: new Date('2026-08-21') },
    { name: 'Révolution du Roi et du Peuple', date: new Date('2026-08-20') },
    { name: 'Journée de la Marche Verte', date: new Date('2026-11-06') },
  ];
  for (const h of holidays) {
    const exists = await prisma.publicHoliday.findFirst({ where: { name: h.name, date: h.date } });
    if (!exists) await prisma.publicHoliday.create({ data: { name: h.name, date: h.date, year: h.date.getFullYear() } });
  }

  // ── 4. AUTH USERS ───────────────────────────────────────────────────────────
  console.log('3/12  Creating Supabase auth users...');

  const PASSWORD = 'RHpro2026!';
  const authIds: Record<string, string> = {};

  const authUsersData = [
    { key: 'hr_admin', email: 'hr.admin@rhpro.local' },
    { key: 'manager_eng', email: 'manager.eng@rhpro.local' },
    { key: 'manager_ops', email: 'manager.ops@rhpro.local' },
    { key: 'collab_salma', email: 'salma.idrissi@rhpro.local' },
    { key: 'collab_omar', email: 'omar.fassi@rhpro.local' },
    { key: 'collab_fatima', email: 'fatima.zaoui@rhpro.local' },
    { key: 'collab_karim', email: 'karim.berrada@rhpro.local' },
    { key: 'collab_amina', email: 'amina.tazi@rhpro.local' },
    { key: 'collab_mehdi', email: 'mehdi.alaoui@rhpro.local' },
  ];

  for (const u of authUsersData) {
    authIds[u.key] = await upsertAuthUser(u.email, PASSWORD);
  }

  // ── 5. PUBLIC USERS ─────────────────────────────────────────────────────────
  console.log('4/12  Creating public.users...');

  const usersData = [
    {
      key: 'hr_admin',
      roleKey: 'Admin',
      deptCode: 'RH',
      firstName: 'Nadia',
      lastName: 'Amrani',
      birthdate: new Date('1989-04-16'),
      phone: '+212600000001',
      address: 'Casablanca, Morocco',
      personalEmail: 'hr.admin@rhpro.local',
      workEmail: 'n.amrani@rhpro.ma',
      jobTitle: 'HR Administrator',
      bankName: 'CIH Bank',
      rib: 'MA6400011100000000000000002',
      cnssNumber: 'CNSS-HR-001',
    },
    {
      key: 'manager_eng',
      roleKey: 'Manager',
      deptCode: 'ENG',
      firstName: 'Leila',
      lastName: 'Chraibi',
      birthdate: new Date('1985-07-22'),
      phone: '+212600000020',
      address: 'Rabat, Morocco',
      personalEmail: 'manager.eng@rhpro.local',
      workEmail: 'l.chraibi@rhpro.ma',
      jobTitle: 'Engineering Manager',
      bankName: 'Banque Populaire',
      rib: 'MA6400011100000000000000003',
      cnssNumber: 'CNSS-MGR-001',
    },
    {
      key: 'manager_ops',
      roleKey: 'Manager',
      deptCode: 'OPS',
      firstName: 'Youssef',
      lastName: 'Bennani',
      birthdate: new Date('1987-09-03'),
      phone: '+212600000002',
      address: 'Rabat, Morocco',
      personalEmail: 'manager.ops@rhpro.local',
      workEmail: 'y.bennani@rhpro.ma',
      jobTitle: 'Operations Manager',
      bankName: 'Banque Centrale Populaire',
      rib: 'MA6400011100000000000000004',
      cnssNumber: 'CNSS-MGR-002',
    },
    {
      key: 'collab_salma',
      roleKey: 'Collaborator',
      deptCode: 'ENG',
      firstName: 'Salma',
      lastName: 'El Idrissi',
      birthdate: new Date('1994-01-22'),
      phone: '+212600000003',
      address: 'Kenitra, Morocco',
      personalEmail: 'salma.idrissi@rhpro.local',
      workEmail: 's.elidrissi@rhpro.ma',
      jobTitle: 'Frontend Engineer',
      bankName: 'Attijariwafa Bank',
      rib: 'MA6400011100000000000000005',
      cnssNumber: 'CNSS-EMP-001',
    },
    {
      key: 'collab_omar',
      roleKey: 'Collaborator',
      deptCode: 'ENG',
      firstName: 'Omar',
      lastName: 'Fassi',
      birthdate: new Date('1992-11-10'),
      phone: '+212600000004',
      address: 'Tanger, Morocco',
      personalEmail: 'omar.fassi@rhpro.local',
      workEmail: 'o.fassi@rhpro.ma',
      jobTitle: 'Backend Engineer',
      bankName: 'BMCE Bank',
      rib: 'MA6400011100000000000000006',
      cnssNumber: 'CNSS-EMP-002',
    },
    {
      key: 'collab_fatima',
      roleKey: 'Collaborator',
      deptCode: 'FIN',
      firstName: 'Fatima',
      lastName: 'Zaoui',
      birthdate: new Date('1996-05-14'),
      phone: '+212600000005',
      address: 'Fès, Morocco',
      personalEmail: 'fatima.zaoui@rhpro.local',
      workEmail: 'f.zaoui@rhpro.ma',
      jobTitle: 'Financial Analyst',
      bankName: 'CIH Bank',
      rib: 'MA6400011100000000000000007',
      cnssNumber: 'CNSS-EMP-003',
    },
    {
      key: 'collab_karim',
      roleKey: 'Collaborator',
      deptCode: 'OPS',
      firstName: 'Karim',
      lastName: 'Berrada',
      birthdate: new Date('1990-08-30'),
      phone: '+212600000006',
      address: 'Marrakech, Morocco',
      personalEmail: 'karim.berrada@rhpro.local',
      workEmail: 'k.berrada@rhpro.ma',
      jobTitle: 'Operations Specialist',
      bankName: 'Banque Populaire',
      rib: 'MA6400011100000000000000008',
      cnssNumber: 'CNSS-EMP-004',
    },
    {
      key: 'collab_amina',
      roleKey: 'Collaborator',
      deptCode: 'RH',
      firstName: 'Amina',
      lastName: 'Tazi',
      birthdate: new Date('1993-02-28'),
      phone: '+212600000007',
      address: 'Meknès, Morocco',
      personalEmail: 'amina.tazi@rhpro.local',
      workEmail: 'a.tazi@rhpro.ma',
      jobTitle: 'HR Specialist',
      bankName: 'Wafabank',
      rib: 'MA6400011100000000000000009',
      cnssNumber: 'CNSS-EMP-005',
    },
    {
      key: 'collab_mehdi',
      roleKey: 'Collaborator',
      deptCode: 'ENG',
      firstName: 'Mehdi',
      lastName: 'Alaoui',
      birthdate: new Date('1991-12-05'),
      phone: '+212600000008',
      address: 'Agadir, Morocco',
      personalEmail: 'mehdi.alaoui@rhpro.local',
      workEmail: 'm.alaoui@rhpro.ma',
      jobTitle: 'Fullstack Engineer',
      bankName: 'Crédit Agricole',
      rib: 'MA6400011100000000000000010',
      cnssNumber: 'CNSS-EMP-006',
    },
  ];

  const userIds: Record<string, string> = {};

  for (const u of usersData) {
    const id = authIds[u.key];
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        roleId: roles[u.roleKey],
        departmentId: depts[u.deptCode],
        firstName: u.firstName,
        lastName: u.lastName,
        birthdate: u.birthdate,
        phone: u.phone,
        address: u.address,
        personalEmail: u.personalEmail,
        workEmail: u.workEmail,
        jobTitle: u.jobTitle,
        bankName: u.bankName,
        rib: u.rib,
        cnssNumber: u.cnssNumber,
        accountStatus: AccountStatus.ACTIVE,
      },
      update: {
        roleId: roles[u.roleKey],
        departmentId: depts[u.deptCode],
        jobTitle: u.jobTitle,
      },
    });
    userIds[u.key] = id;
    console.log(`  ✔  User: ${u.firstName} ${u.lastName} (${u.roleKey})`);
  }

  // ── 6. SPECIALISATION TABLES ────────────────────────────────────────────────
  console.log('5/12  Admin / Manager / Collaborator tables...');

  // Admins
  for (const key of ['hr_admin']) {
    await prisma.admin.upsert({ where: { id: userIds[key] }, create: { id: userIds[key] }, update: {} });
  }

  // Managers
  for (const key of ['manager_eng', 'manager_ops']) {
    await prisma.manager.upsert({ where: { id: userIds[key] }, create: { id: userIds[key] }, update: {} });
  }

  // Collaborators
  const collabManagerMap: Record<string, string> = {
    collab_salma: 'manager_eng',
    collab_omar: 'manager_eng',
    collab_mehdi: 'manager_eng',
    collab_fatima: 'manager_ops',
    collab_karim: 'manager_ops',
    collab_amina: 'manager_ops',
  };
  for (const [collabKey, managerKey] of Object.entries(collabManagerMap)) {
    await prisma.collaborator.upsert({
      where: { id: userIds[collabKey] },
      create: { id: userIds[collabKey], managerId: userIds[managerKey] },
      update: { managerId: userIds[managerKey] },
    });
  }

  // ── 7. CONTRACTS ────────────────────────────────────────────────────────────
  console.log('6/12  Contracts...');

  const contractsData = [
    { key: 'hr_admin', type: ContractType.CDI, start: new Date('2024-01-01'), salary: 32000 },
    { key: 'manager_eng', type: ContractType.CDI, start: new Date('2022-06-01'), salary: 45000 },
    { key: 'manager_ops', type: ContractType.CDI, start: new Date('2023-03-15'), salary: 40000 },
    { key: 'collab_salma', type: ContractType.CDI, start: new Date('2025-02-10'), salary: 22000 },
    { key: 'collab_omar', type: ContractType.CDI, start: new Date('2025-02-10'), salary: 23000 },
    { key: 'collab_fatima', type: ContractType.CDD, start: new Date('2025-06-01'), end: new Date('2026-05-31'), salary: 18000 },
    { key: 'collab_karim', type: ContractType.CDI, start: new Date('2024-09-01'), salary: 19500 },
    { key: 'collab_amina', type: ContractType.CDI, start: new Date('2025-03-01'), salary: 17000 },
    { key: 'collab_mehdi', type: ContractType.CDI, start: new Date('2024-11-15'), salary: 24000 },
  ];

  for (const c of contractsData) {
    const exists = await prisma.contract.findFirst({ where: { userId: userIds[c.key], startDate: c.start } });
    if (!exists) {
      await prisma.contract.create({
        data: {
          userId: userIds[c.key],
          contractType: c.type,
          startDate: c.start,
          endDate: c.end ?? null,
          weeklyHours: new Decimal(40),
          baseSalary: new Decimal(c.salary),
          netSalary: new Decimal(Math.round(c.salary * 0.8)),
        },
      });
    }
  }

  // ── 8. SALARY HISTORY ──────────────────────────────────────────────────────
  console.log('7/12  Salary history...');

  const salaryChanges = [
    { userKey: 'collab_salma', managerKey: 'manager_eng', oldSalary: 20000, newSalary: 22000, changeDate: new Date('2026-01-01'), comment: 'Annual review' },
    { userKey: 'collab_omar', managerKey: 'manager_eng', oldSalary: 21000, newSalary: 23000, changeDate: new Date('2026-01-01'), comment: 'Annual review' },
    { userKey: 'collab_karim', managerKey: 'manager_ops', oldSalary: 18000, newSalary: 19500, changeDate: new Date('2025-07-01'), comment: 'Mid-year performance bonus' },
    { userKey: 'collab_mehdi', managerKey: 'manager_eng', oldSalary: 22000, newSalary: 24000, changeDate: new Date('2026-01-01'), comment: 'Promotion to senior' },
  ];

  for (const s of salaryChanges) {
    const exists = await prisma.salaryHistory.findFirst({ where: { userId: userIds[s.userKey], changeDate: s.changeDate } });
    if (!exists) {
      await prisma.salaryHistory.create({
        data: {
          userId: userIds[s.userKey],
          validatedBy: userIds[s.managerKey],
          oldSalary: new Decimal(s.oldSalary),
          newSalary: new Decimal(s.newSalary),
          changeDate: s.changeDate,
          status: ApprovalStatus.VALIDATED,
          decisionComment: s.comment,
        },
      });
    }
  }

  // ── 9. LEAVE BALANCES ───────────────────────────────────────────────────────
  console.log('8/12  Leave balances...');

  const balanceData = [
    { key: 'manager_eng', allocated: 26, used: 3, pending: 0, remaining: 23 },
    { key: 'manager_ops', allocated: 26, used: 5, pending: 0, remaining: 21 },
    { key: 'collab_salma', allocated: 22, used: 5, pending: 3, remaining: 14 },
    { key: 'collab_omar', allocated: 22, used: 8, pending: 0, remaining: 14 },
    { key: 'collab_fatima', allocated: 18, used: 2, pending: 5, remaining: 11 },
    { key: 'collab_karim', allocated: 22, used: 10, pending: 0, remaining: 12 },
    { key: 'collab_amina', allocated: 22, used: 4, pending: 3, remaining: 15 },
    { key: 'collab_mehdi', allocated: 22, used: 6, pending: 0, remaining: 16 },
  ];

  for (const b of balanceData) {
    const existingBalance = await prisma.leaveBalance.findFirst({
      where: { userId: userIds[b.key], year: 2026 },
    });
    if (existingBalance) {
      await prisma.leaveBalance.update({
        where: { id: existingBalance.id },
        data: {
          allocatedDays: new Decimal(b.allocated),
          usedDays: new Decimal(b.used),
          pendingDays: new Decimal(b.pending),
          remainingDays: new Decimal(b.remaining),
        },
      });
    } else {
      await prisma.leaveBalance.create({
        data: {
          userId: userIds[b.key],
          year: 2026,
          allocatedDays: new Decimal(b.allocated),
          usedDays: new Decimal(b.used),
          pendingDays: new Decimal(b.pending),
          remainingDays: new Decimal(b.remaining),
        },
      });
    }
  }

  // ── 10. PROJECTS ────────────────────────────────────────────────────────────
  console.log('9/12  Projects, assignments, timesheets & entries...');

  const projectsRaw = [
    {
      code: 'PRJ-001',
      name: 'Attendance Workflow MVP',
      description: 'Build and deploy the core HR platform including timesheets, leave management and employee dossiers.',
      client: 'RHpro Internal',
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2026-01-10'),
      endDate: null,
      budgetHours: 2400,
      budgetAmount: 480000,
      leadKey: 'manager_eng',
    },
    {
      code: 'PRJ-002',
      name: 'HR Analytics Enablement',
      description: 'Build dashboards and KPI reports across all HR dimensions.',
      client: 'RHpro Internal',
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2026-02-01'),
      endDate: null,
      budgetHours: 800,
      budgetAmount: 160000,
      leadKey: 'manager_ops',
    },
    {
      code: 'PRJ-003',
      name: 'Mobile Application',
      description: 'React Native mobile app for employees on-the-go.',
      client: 'Casablanca Finance City',
      status: ProjectStatus.SUSPENDED,
      startDate: new Date('2025-10-01'),
      endDate: null,
      budgetHours: 1200,
      budgetAmount: 220000,
      leadKey: 'manager_eng',
    },
    {
      code: 'PRJ-004',
      name: 'Legacy System Migration',
      description: 'Migrate data from the old Excel-based HR system to the new platform.',
      client: 'RHpro Internal',
      status: ProjectStatus.FINISHED,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-12-31'),
      budgetHours: 500,
      budgetAmount: 85000,
      leadKey: 'manager_ops',
    },
    {
      code: 'PRJ-005',
      name: 'ERP Integration',
      description: 'Connect the HR platform with the ERP system via REST APIs.',
      client: 'Maroc Telecom',
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-30'),
      budgetHours: 1600,
      budgetAmount: 320000,
      leadKey: 'manager_eng',
    },
  ];

  const projectIds: Record<string, string> = {};

  for (const p of projectsRaw) {
    const proj = await prisma.project.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        description: p.description,
        client: p.client,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate ?? null,
        budgetHours: p.budgetHours ? new Decimal(p.budgetHours) : null,
        budgetAmount: p.budgetAmount ? new Decimal(p.budgetAmount) : null,
        leadId: userIds[p.leadKey],
      },
      update: {
        name: p.name,
        description: p.description,
        client: p.client,
        status: p.status,
        budgetHours: p.budgetHours ? new Decimal(p.budgetHours) : null,
        budgetAmount: p.budgetAmount ? new Decimal(p.budgetAmount) : null,
        leadId: userIds[p.leadKey],
      },
    });
    projectIds[p.code] = proj.id;
  }

  // Project assignments
  const assignments = [
    { collabKey: 'collab_salma', projectCode: 'PRJ-001', role: 'Frontend Lead' },
    { collabKey: 'collab_omar', projectCode: 'PRJ-001', role: 'Backend Lead' },
    { collabKey: 'collab_mehdi', projectCode: 'PRJ-001', role: 'Fullstack Developer' },
    { collabKey: 'collab_salma', projectCode: 'PRJ-002', role: 'UI Developer' },
    { collabKey: 'collab_fatima', projectCode: 'PRJ-002', role: 'Data Analyst' },
    { collabKey: 'collab_mehdi', projectCode: 'PRJ-003', role: 'Mobile Developer' },
    { collabKey: 'collab_omar', projectCode: 'PRJ-003', role: 'API Developer' },
    { collabKey: 'collab_karim', projectCode: 'PRJ-004', role: 'Data Migration Lead' },
    { collabKey: 'collab_amina', projectCode: 'PRJ-004', role: 'QA & Validation' },
    { collabKey: 'collab_omar', projectCode: 'PRJ-005', role: 'Integration Developer' },
    { collabKey: 'collab_mehdi', projectCode: 'PRJ-005', role: 'Lead Developer' },
    { collabKey: 'collab_salma', projectCode: 'PRJ-005', role: 'Frontend Developer' },
  ];

  for (const a of assignments) {
    const existing = await prisma.projectAssignment.findFirst({
      where: {
        projectId: projectIds[a.projectCode],
        collaboratorId: userIds[a.collabKey],
        unassignedAt: null,
      },
    });
    if (!existing) {
      await prisma.projectAssignment.create({
        data: {
          projectId: projectIds[a.projectCode],
          collaboratorId: userIds[a.collabKey],
          roleOnProject: a.role,
          assignedAt: daysAgo(60),
        },
      });
    }
  }

  // ── 11. TIMESHEETS & ENTRIES ─────────────────────────────────────────────────

  // Helper to create a timesheet with entries for a collaborator
  async function createTimesheet(
    userKey: string,
    managerKey: string,
    weekStart: Date,
    status: TimesheetStatus,
    projectEntries: { projectCode: string; hours: number; task: string; description: string }[],
  ) {
    const existing = await prisma.timesheet.findFirst({
      where: { userId: userIds[userKey], weekStartDate: weekStart },
    });
    if (existing) return existing;

    let totalHours = projectEntries.reduce((sum, e) => sum + e.hours * 5, 0);
    const regular = Math.min(totalHours, 40);
    const overtime = Math.max(totalHours - 40, 0);

    const ts = await prisma.timesheet.create({
      data: {
        userId: userIds[userKey],
        decidedBy: status === TimesheetStatus.APPROVED || status === TimesheetStatus.REJECTED ? userIds[managerKey] : null,
        weekStartDate: weekStart,
        totalHours: new Decimal(totalHours),
        regularHours: new Decimal(regular),
        overtimeHours: new Decimal(overtime),
        status,
        submittedAt: status !== TimesheetStatus.DRAFT ? new Date(weekStart.getTime() + 5 * 86400000) : null,
        approvedAt: status === TimesheetStatus.APPROVED ? new Date(weekStart.getTime() + 6 * 86400000) : null,
        rejectedAt: status === TimesheetStatus.REJECTED ? new Date(weekStart.getTime() + 6 * 86400000) : null,
        decisionComment:
          status === TimesheetStatus.APPROVED
            ? 'Validated — good work this week.'
            : status === TimesheetStatus.REJECTED
              ? 'Missing project description on Wednesday entries.'
              : null,
      },
    });

    // Create entries for Mon–Fri
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const entryDate = new Date(weekStart);
      entryDate.setDate(entryDate.getDate() + dayOffset);

      for (const pe of projectEntries) {
        if (projectIds[pe.projectCode]) {
          await prisma.timesheetEntry.create({
            data: {
              timesheetId: ts.id,
              projectId: projectIds[pe.projectCode],
              entryDate,
              taskName: pe.task,
              hours: new Decimal(pe.hours),
              activityDescription: pe.description,
            },
          });
        }
      }
    }
    return ts;
  }

  // Salma – 8 weeks of timesheets
  const salmaWeeks = [
    { offset: 49, status: TimesheetStatus.APPROVED },
    { offset: 42, status: TimesheetStatus.APPROVED },
    { offset: 35, status: TimesheetStatus.APPROVED },
    { offset: 28, status: TimesheetStatus.APPROVED },
    { offset: 21, status: TimesheetStatus.APPROVED },
    { offset: 14, status: TimesheetStatus.SUBMITTED },
    { offset: 7, status: TimesheetStatus.SUBMITTED },
    { offset: 0, status: TimesheetStatus.DRAFT },
  ];
  for (const w of salmaWeeks) {
    await createTimesheet('collab_salma', 'manager_eng', monday(daysAgo(w.offset)), w.status, [
      { projectCode: 'PRJ-001', hours: 5, task: 'Feature Development', description: 'Implementing UI components for the dashboard module' },
      { projectCode: 'PRJ-002', hours: 2, task: 'Dashboard design', description: 'Building analytics charts with Recharts' },
      { projectCode: 'PRJ-005', hours: 1, task: 'Integration testing', description: 'Frontend integration tests for ERP API endpoints' },
    ]);
  }

  // Omar – 6 weeks
  const omarWeeks = [
    { offset: 42, status: TimesheetStatus.APPROVED },
    { offset: 35, status: TimesheetStatus.APPROVED },
    { offset: 28, status: TimesheetStatus.APPROVED },
    { offset: 21, status: TimesheetStatus.REJECTED },
    { offset: 14, status: TimesheetStatus.APPROVED },
    { offset: 7, status: TimesheetStatus.SUBMITTED },
    { offset: 0, status: TimesheetStatus.DRAFT },
  ];
  for (const w of omarWeeks) {
    await createTimesheet('collab_omar', 'manager_eng', monday(daysAgo(w.offset)), w.status, [
      { projectCode: 'PRJ-001', hours: 4, task: 'API Development', description: 'Building NestJS endpoints for timesheets module' },
      { projectCode: 'PRJ-005', hours: 3, task: 'ERP Connector', description: 'Developing REST connector for ERP integration layer' },
      { projectCode: 'PRJ-003', hours: 1, task: 'Mobile API', description: 'API endpoints for the mobile application' },
    ]);
  }

  // Mehdi – 5 weeks
  const mehdiWeeks = [
    { offset: 35, status: TimesheetStatus.APPROVED },
    { offset: 28, status: TimesheetStatus.APPROVED },
    { offset: 21, status: TimesheetStatus.APPROVED },
    { offset: 14, status: TimesheetStatus.SUBMITTED },
    { offset: 7, status: TimesheetStatus.DRAFT },
  ];
  for (const w of mehdiWeeks) {
    await createTimesheet('collab_mehdi', 'manager_eng', monday(daysAgo(w.offset)), w.status, [
      { projectCode: 'PRJ-001', hours: 4, task: 'Fullstack features', description: 'End-to-end implementation of leave management module' },
      { projectCode: 'PRJ-005', hours: 3, task: 'ERP Integration', description: 'Lead development on ERP API integration' },
    ]);
  }

  // Karim – 4 weeks
  for (const offset of [28, 21, 14, 7]) {
    await createTimesheet('collab_karim', 'manager_ops', monday(daysAgo(offset)), TimesheetStatus.APPROVED, [
      { projectCode: 'PRJ-004', hours: 6, task: 'Data Migration', description: 'Migrating employee records from Excel to new platform' },
      { projectCode: 'PRJ-002', hours: 2, task: 'Operations reporting', description: 'Configuring operational KPI dashboards' },
    ]);
  }

  // Fatima – 3 weeks
  for (const offset of [21, 14, 7]) {
    await createTimesheet('collab_fatima', 'manager_ops', monday(daysAgo(offset)), TimesheetStatus.APPROVED, [
      { projectCode: 'PRJ-002', hours: 5, task: 'Financial Analytics', description: 'Budget variance analysis and reporting dashboards' },
      { projectCode: 'PRJ-004', hours: 3, task: 'Data validation', description: 'Validating financial data migrated from legacy system' },
    ]);
  }

  // Amina – 3 weeks
  for (const offset of [21, 14, 7]) {
    await createTimesheet('collab_amina', 'manager_ops', monday(daysAgo(offset)), offset === 21 ? TimesheetStatus.APPROVED : TimesheetStatus.SUBMITTED, [
      { projectCode: 'PRJ-004', hours: 4, task: 'QA Testing', description: 'User acceptance testing for migrated HR records' },
      { projectCode: 'PRJ-001', hours: 4, task: 'HR Process support', description: 'Supporting HR workflow configuration and testing' },
    ]);
  }

  // ── 12. REQUESTS (LEAVE) ────────────────────────────────────────────────────
  console.log('10/12  Leave requests...');

  const leaveRequests = [
    // Salma – approved PTO
    {
      key: 'collab_salma', managerKey: 'manager_eng',
      leaveType: LeaveType.PTO, status: RequestStatus.APPROVED,
      start: daysAgo(20), end: daysAgo(18), workingDays: 3,
      comment: 'Family vacation', decisionComment: 'Approved — no conflicts this week.',
    },
    // Salma – pending PTO
    {
      key: 'collab_salma', managerKey: 'manager_eng',
      leaveType: LeaveType.PTO, status: RequestStatus.PENDING,
      start: daysFromNow(14), end: daysFromNow(18), workingDays: 5,
      comment: 'Annual leave',
    },
    // Salma – draft sick leave
    {
      key: 'collab_salma', managerKey: 'manager_eng',
      leaveType: LeaveType.SICK, status: RequestStatus.DRAFT,
      start: daysFromNow(30), end: daysFromNow(31), workingDays: 2,
      comment: 'Medical appointment',
    },
    // Omar – approved sick leave
    {
      key: 'collab_omar', managerKey: 'manager_eng',
      leaveType: LeaveType.SICK, status: RequestStatus.APPROVED,
      start: daysAgo(30), end: daysAgo(28), workingDays: 3,
      comment: 'Flu', decisionComment: 'Approved with medical certificate required.',
    },
    // Omar – rejected PTO
    {
      key: 'collab_omar', managerKey: 'manager_eng',
      leaveType: LeaveType.PTO, status: RequestStatus.REJECTED,
      start: daysAgo(10), end: daysAgo(8), workingDays: 3,
      comment: 'Weekend trip', decisionComment: 'Critical sprint week — cannot approve.',
    },
    // Fatima – pending PTO
    {
      key: 'collab_fatima', managerKey: 'manager_ops',
      leaveType: LeaveType.PTO, status: RequestStatus.PENDING,
      start: daysFromNow(7), end: daysFromNow(9), workingDays: 3,
      comment: 'Personal leave',
    },
    // Fatima – pending maternity
    {
      key: 'collab_fatima', managerKey: 'manager_ops',
      leaveType: LeaveType.MATERNITY, status: RequestStatus.PENDING,
      start: daysFromNow(45), end: daysFromNow(143), workingDays: 98,
      comment: 'Maternity leave as per Moroccan labor code.',
    },
    // Karim – approved training
    {
      key: 'collab_karim', managerKey: 'manager_ops',
      leaveType: LeaveType.TRAINING, status: RequestStatus.APPROVED,
      start: daysAgo(15), end: daysAgo(13), workingDays: 3,
      comment: 'Agile Project Management certification', decisionComment: 'Approved — relevant to project delivery.',
    },
    // Amina – approved PTO
    {
      key: 'collab_amina', managerKey: 'manager_ops',
      leaveType: LeaveType.PTO, status: RequestStatus.APPROVED,
      start: daysAgo(40), end: daysAgo(37), workingDays: 4,
      comment: 'Personal leave',
    },
    // Amina – pending PTO
    {
      key: 'collab_amina', managerKey: 'manager_ops',
      leaveType: LeaveType.PTO, status: RequestStatus.PENDING,
      start: daysFromNow(20), end: daysFromNow(22), workingDays: 3,
      comment: 'Family event',
    },
    // Mehdi – approved unpaid
    {
      key: 'collab_mehdi', managerKey: 'manager_eng',
      leaveType: LeaveType.UNPAID, status: RequestStatus.APPROVED,
      start: daysAgo(60), end: daysAgo(56), workingDays: 5,
      comment: 'Personal project abroad', decisionComment: 'Approved as unpaid — no pay deduction from PTO.',
    },
    // Mehdi – cancelled
    {
      key: 'collab_mehdi', managerKey: 'manager_eng',
      leaveType: LeaveType.PTO, status: RequestStatus.CANCELLED,
      start: daysAgo(5), end: daysAgo(3), workingDays: 3,
      comment: 'Cancelled due to urgent project delivery.',
    },
  ];

  for (const r of leaveRequests) {
    const existingRequest = await prisma.request.findFirst({
      where: {
        submittedBy: userIds[r.key],
        leaveType: r.leaveType,
        leaveStartDate: r.start,
      },
    });
    if (!existingRequest) {
      await prisma.request.create({
        data: {
          submittedBy: userIds[r.key],
          decidedBy:
            r.status === RequestStatus.APPROVED || r.status === RequestStatus.REJECTED
              ? userIds[r.managerKey]
              : null,
          requestType: RequestType.LEAVE,
          status: r.status,
          leaveType: r.leaveType,
          leaveStartDate: r.start,
          leaveEndDate: r.end,
          workingDaysCount: r.workingDays,
          comment: r.comment,
          decisionComment: r.decisionComment ?? null,
          leavePaid: r.leaveType !== LeaveType.UNPAID,
        },
      });
    }
  }

  // ── 13. EVALUATIONS ─────────────────────────────────────────────────────────
  console.log('11/12  Evaluations, documents, notifications...');

  const evaluationsData = [
    { managerKey: 'manager_eng', collabKey: 'collab_salma', score: 88.5, comment: 'Outstanding ownership of the frontend module. Strong delivery velocity and clean code.', date: new Date('2026-01-15') },
    { managerKey: 'manager_eng', collabKey: 'collab_omar', score: 82.0, comment: 'Solid backend work. Needs to improve documentation practices.', date: new Date('2026-01-15') },
    { managerKey: 'manager_eng', collabKey: 'collab_mehdi', score: 91.0, comment: 'Exceptional full-stack capabilities. Promoted to senior developer.', date: new Date('2026-01-20') },
    { managerKey: 'manager_ops', collabKey: 'collab_karim', score: 78.0, comment: 'Reliable and consistent. Needs more initiative on process improvements.', date: new Date('2026-01-18') },
    { managerKey: 'manager_ops', collabKey: 'collab_fatima', score: 85.0, comment: 'Excellent analytical skills. Delivered financial dashboards ahead of schedule.', date: new Date('2026-01-18') },
    { managerKey: 'manager_ops', collabKey: 'collab_amina', score: 80.0, comment: 'Good HR domain knowledge. Improving on technical tool usage.', date: new Date('2026-01-20') },
  ];

  for (const e of evaluationsData) {
    const exists = await prisma.evaluation.findFirst({
      where: { managerId: userIds[e.managerKey], collaboratorId: userIds[e.collabKey], reviewDate: e.date },
    });
    if (!exists) {
      await prisma.evaluation.create({
        data: {
          managerId: userIds[e.managerKey],
          collaboratorId: userIds[e.collabKey],
          reviewDate: e.date,
          globalScore: new Decimal(e.score),
          comments: e.comment,
        },
      });
    }
  }

  // ── 14. DOCUMENTS ───────────────────────────────────────────────────────────
  const documentsData = [
    { userKey: 'collab_salma', uploadedByKey: 'hr_admin', category: DocumentCategory.CONTRACT, title: 'Contrat de travail CDI', originalName: 'contrat_salma_el_idrissi.pdf', fileType: 'application/pdf', fileSize: 248000n },
    { userKey: 'collab_omar', uploadedByKey: 'hr_admin', category: DocumentCategory.CONTRACT, title: 'Contrat de travail CDI', originalName: 'contrat_omar_fassi.pdf', fileType: 'application/pdf', fileSize: 244000n },
    { userKey: 'collab_salma', uploadedByKey: 'collab_salma', category: DocumentCategory.HR, title: 'Pièce d\'identité nationale', originalName: 'cin_salma.pdf', fileType: 'application/pdf', fileSize: 120000n },
    { userKey: 'collab_karim', uploadedByKey: 'hr_admin', category: DocumentCategory.PAYROLL, title: 'Bulletin de paie Décembre 2025', originalName: 'paie_karim_dec2025.pdf', fileType: 'application/pdf', fileSize: 95000n },
    { userKey: 'collab_fatima', uploadedByKey: 'hr_admin', category: DocumentCategory.CONTRACT, title: 'Contrat de travail CDD', originalName: 'contrat_fatima_zaoui.pdf', fileType: 'application/pdf', fileSize: 231000n },
    { userKey: 'collab_mehdi', uploadedByKey: 'hr_admin', category: DocumentCategory.PAYROLL, title: 'Bulletin de paie Janvier 2026', originalName: 'paie_mehdi_jan2026.pdf', fileType: 'application/pdf', fileSize: 98000n },
    { userKey: 'manager_eng', uploadedByKey: 'hr_admin', category: DocumentCategory.CONTRACT, title: 'Contrat de travail CDI', originalName: 'contrat_leila_chraibi.pdf', fileType: 'application/pdf', fileSize: 260000n },
  ];

  for (const d of documentsData) {
    const exists = await prisma.document.findFirst({ where: { userId: userIds[d.userKey], title: d.title } });
    if (!exists) {
      await prisma.document.create({
        data: {
          userId: userIds[d.userKey],
          uploadedBy: userIds[d.uploadedByKey],
          category: d.category,
          title: d.title,
          originalName: d.originalName,
          fileType: d.fileType,
          fileSize: d.fileSize,
          fileUrl: `https://storage.example.com/rhpro/${d.originalName}`,
          tags: [],
        },
      });
    }
  }

  // ── 15. NOTIFICATIONS ───────────────────────────────────────────────────────
  const notificationsData = [
    { recipientKey: 'collab_salma', title: 'Feuille de temps approuvée', message: 'Votre feuille de temps de la semaine du 9 mars a été approuvée.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'collab_salma', title: 'Congé approuvé', message: 'Votre demande de congé du 9 au 11 mars a été approuvée.', status: NotificationStatus.SEEN },
    { recipientKey: 'collab_omar', title: 'Feuille de temps rejetée', message: 'Votre feuille de temps de la semaine du 2 mars a été rejetée. Motif : descriptions manquantes.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'collab_omar', title: 'Congé refusé', message: 'Votre demande de congé a été refusée en raison d\'un sprint critique.', status: NotificationStatus.SEEN },
    { recipientKey: 'collab_fatima', title: 'Demande de congé soumise', message: 'Votre demande de congé est en attente d\'approbation.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'collab_mehdi', title: 'Feuille de temps approuvée', message: 'Votre feuille de temps a été approuvée.', status: NotificationStatus.SEEN },
    { recipientKey: 'manager_eng', title: 'Nouvelle demande de congé', message: 'Salma El Idrissi a soumis une demande de congé en attente d\'approbation.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'manager_eng', title: 'Nouvelle feuille de temps', message: 'Omar Fassi a soumis sa feuille de temps pour révision.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'manager_ops', title: 'Nouvelle demande de congé', message: 'Fatima Zaoui a soumis une demande de congé en attente d\'approbation.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'manager_ops', title: 'Demande de congé maternité', message: 'Fatima Zaoui a soumis une demande de congé maternité (98 jours).', status: NotificationStatus.UNSEEN },
    { recipientKey: 'collab_amina', title: 'Demande de congé soumise', message: 'Votre demande de congé du 18 au 20 avril est en attente.', status: NotificationStatus.UNSEEN },
    { recipientKey: 'hr_admin', title: 'Nouveau collaborateur', message: 'Mehdi Alaoui a été ajouté à la plateforme.', status: NotificationStatus.SEEN },
  ];

  for (const n of notificationsData) {
    const exists = await prisma.notification.findFirst({
      where: { recipientId: userIds[n.recipientKey], title: n.title },
    });
    if (!exists) {
      await prisma.notification.create({
        data: {
          recipientId: userIds[n.recipientKey],
          channel: NotificationChannel.IN_APP,
          title: n.title,
          message: n.message,
          status: n.status,
          sentAt: new Date(),
        },
      });
    }
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  console.log('12/12  ✅ Done!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Seed complete. Login credentials (all users):');
  console.log('  Password: RHpro2026!');
  console.log('');
  console.log('  hr.admin@rhpro.local     → Admin         (Nadia Amrani)');
  console.log('  manager.eng@rhpro.local  → Manager       (Leila Chraibi)');
  console.log('  manager.ops@rhpro.local  → Manager       (Youssef Bennani)');
  console.log('  salma.idrissi@rhpro.local → Collaborator  (Salma El Idrissi)');
  console.log('  omar.fassi@rhpro.local   → Collaborator  (Omar Fassi)');
  console.log('  fatima.zaoui@rhpro.local → Collaborator  (Fatima Zaoui)');
  console.log('  karim.berrada@rhpro.local→ Collaborator  (Karim Berrada)');
  console.log('  amina.tazi@rhpro.local   → Collaborator  (Amina Tazi)');
  console.log('  mehdi.alaoui@rhpro.local → Collaborator  (Mehdi Alaoui)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
