-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."account_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."contract_type" AS ENUM ('CDI', 'CDD', 'STAGE', 'FREELANCE');

-- CreateEnum
CREATE TYPE "public"."timesheet_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."request_status" AS ENUM ('DRAFT', 'SENT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."request_type" AS ENUM ('LEAVE', 'AUGMENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."project_status" AS ENUM ('IN_PROGRESS', 'FINISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."approval_status" AS ENUM ('VALIDATED', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "public"."notification_status" AS ENUM ('SEEN', 'UNSEEN');

-- CreateEnum
CREATE TYPE "public"."notification_channel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "public"."document_category" AS ENUM ('HR', 'CONTRACT', 'PAYROLL', 'REQUEST_ATTACHMENT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "role_id" UUID,
    "department_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" DATE,
    "phone" TEXT,
    "phone_fixed" TEXT,
    "address" TEXT,
    "personal_email" TEXT,
    "work_email" TEXT,
    "job_title" TEXT,
    "bank_name" TEXT,
    "bank_bic_swift" TEXT,
    "rib" TEXT,
    "cnss_number" TEXT,
    "picture_url" TEXT,
    "account_status" "public"."account_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."managers" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collaborators" (
    "id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contracts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "contract_type" "public"."contract_type" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "weekly_hours" DECIMAL(5,2),
    "base_salary" DECIMAL(12,2),
    "net_salary" DECIMAL(12,2),
    "bonuses" DECIMAL(12,2),
    "benefits_in_kind" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."salary_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "validated_by" UUID,
    "old_salary" DECIMAL(12,2) NOT NULL,
    "new_salary" DECIMAL(12,2) NOT NULL,
    "change_date" DATE NOT NULL,
    "status" "public"."approval_status" NOT NULL DEFAULT 'VALIDATED',
    "decision_comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_balances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "allocated_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "used_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "pending_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "remaining_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timesheets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "decided_by" UUID,
    "week_start_date" DATE NOT NULL,
    "total_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "regular_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "status" "public"."timesheet_status" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "decision_comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timesheet_entries" (
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

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" UUID NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "status" "public"."project_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_assignments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "role_on_project" TEXT,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."requests" (
    "id" UUID NOT NULL,
    "submitted_by" UUID NOT NULL,
    "decided_by" UUID,
    "request_type" "public"."request_type" NOT NULL,
    "status" "public"."request_status" NOT NULL DEFAULT 'DRAFT',
    "comment" TEXT,
    "decision_comment" TEXT,
    "leave_paid" BOOLEAN,
    "leave_start_date" DATE,
    "leave_end_date" DATE,
    "proposed_salary" DECIMAL(12,2),
    "effective_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evaluations" (
    "id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "collaborator_id" UUID NOT NULL,
    "review_date" DATE,
    "global_score" DECIMAL(5,2),
    "comments" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "uploaded_by" UUID,
    "category" "public"."document_category" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "original_name" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "file_url" TEXT,
    "file_type" TEXT,
    "file_size" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "channel" "public"."notification_channel" NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "status" "public"."notification_status" NOT NULL DEFAULT 'UNSEEN',
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_description_key" ON "public"."roles"("description");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "public"."departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_personal_email_key" ON "public"."users"("personal_email");

-- CreateIndex
CREATE UNIQUE INDEX "users_work_email_key" ON "public"."users"("work_email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cnss_number_key" ON "public"."users"("cnss_number");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_unique_user_year" ON "public"."leave_balances"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "timesheets_unique_user_week" ON "public"."timesheets"("user_id", "week_start_date");

-- CreateIndex
CREATE INDEX "timesheet_entries_idx_timesheet" ON "public"."timesheet_entries"("timesheet_id");

-- CreateIndex
CREATE INDEX "timesheet_entries_idx_project" ON "public"."timesheet_entries"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "public"."projects"("code");

-- CreateIndex
CREATE INDEX "documents_user_id_idx" ON "public"."documents"("user_id");

-- CreateIndex
CREATE INDEX "documents_user_id_title_category_version_number_idx" ON "public"."documents"("user_id", "title", "category", "version_number");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."managers" ADD CONSTRAINT "managers_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collaborators" ADD CONSTRAINT "collaborators_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collaborators" ADD CONSTRAINT "collaborators_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_history" ADD CONSTRAINT "salary_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_history" ADD CONSTRAINT "salary_history_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timesheets" ADD CONSTRAINT "timesheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timesheets" ADD CONSTRAINT "timesheets_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "public"."timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timesheet_entries" ADD CONSTRAINT "timesheet_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_assignments" ADD CONSTRAINT "project_assignments_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."managers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

