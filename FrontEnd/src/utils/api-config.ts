// app/utils/api-config.ts

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export const apiConfig = {
  baseUrl: API_URL,
  endpoints: {
    auth: {
      login: `${API_URL}/auth/login`,
      logout: `${API_URL}/auth/logout`,
      refresh: `${API_URL}/auth/refresh`,
      forgotPassword: `${API_URL}/auth/forgot-password`,
      resetPassword: `${API_URL}/auth/reset-password`,
    },
    users: {
      all: `${API_URL}/users`,
      create: `${API_URL}/users/add`,
      byId: (id: string) => `${API_URL}/users/${id}`,
      updatePassword: (id: string) => `${API_URL}/users/${id}/password`,
      delete: (id: string) => `${API_URL}/users/${id}`,
      uploadPicture: (id: string) => `${API_URL}/users/${id}/picture`,
      removePicture: (id: string) => `${API_URL}/users/${id}/picture`,
      dossier: (id: string) => `${API_URL}/users/${id}/dossier`,
      setManager: (collaboratorId: string, managerId: string) =>
        `${API_URL}/users/${collaboratorId}/manager/${managerId}`,
      getManager: (userId: string) => `${API_URL}/users/${userId}/manager`,
      getSupervisedCollaborators: (managerId: string) =>
        `${API_URL}/users/${managerId}/supervised-collaborators`,
    },
    roles: {
      all: `${API_URL}/roles`,
      byId: (id: string) => `${API_URL}/roles/${id}`,
      create: `${API_URL}/roles`,
      update: (id: string) => `${API_URL}/roles/${id}`,
      delete: (id: string) => `${API_URL}/roles/${id}`,
    },
    departments: {
      all: `${API_URL}/departments`,
      byId: (id: string) => `${API_URL}/departments/${id}`,
      create: `${API_URL}/departments/add`,
      update: (id: string) => `${API_URL}/departments/${id}`,
      delete: (id: string) => `${API_URL}/departments/${id}`,
    },
    contracts: {
      all: `${API_URL}/contracts`,
      create: `${API_URL}/contracts`,
      byId: (id: string) => `${API_URL}/contracts/${id}`,
      byUserId: (userId: string) => `${API_URL}/contracts/user/${userId}`,
      update: (id: string) => `${API_URL}/contracts/${id}`,
      delete: (id: string) => `${API_URL}/contracts/${id}`,
    },
    documents: {
      upload: (userId: string) => `${API_URL}/documents/upload/${userId}`,
      byUser: (userId: string) => `${API_URL}/documents/getdocuments/${userId}`,
      versions: (userId: string) => `${API_URL}/documents/getdocuments/${userId}/versions`,
      byId: (id: string, userId: string) => `${API_URL}/documents/getdocumentbyid/${id}/${userId}`,
      delete: (id: string, userId: string) => `${API_URL}/documents/deletedocument/${id}/${userId}`,
    },
    evaluations: {
      all: (params?: { collaboratorId?: string; managerId?: string; type?: string; year?: number }) => {
        const url = new URL(`${API_URL}/evaluations`);
        if (params?.collaboratorId) url.searchParams.set('collaboratorId', params.collaboratorId);
        if (params?.managerId) url.searchParams.set('managerId', params.managerId);
        if (params?.type) url.searchParams.set('type', params.type);
        if (params?.year) url.searchParams.set('year', String(params.year));
        return url.toString();
      },
      byId: (id: string) => `${API_URL}/evaluations/${id}`,
      byCollaborator: (id: string) => `${API_URL}/evaluations/collaborator/${id}`,
      trend: (id: string) => `${API_URL}/evaluations/collaborator/${id}/trend`,
      create: `${API_URL}/evaluations`,
      update: (id: string) => `${API_URL}/evaluations/${id}`,
      delete: (id: string) => `${API_URL}/evaluations/${id}`,
      departmentStats: (year?: number) => year ? `${API_URL}/evaluations/reports/departments?year=${year}` : `${API_URL}/evaluations/reports/departments`,
      performanceVsSalary: (departmentId?: string) => departmentId ? `${API_URL}/evaluations/reports/performance-vs-salary?departmentId=${departmentId}` : `${API_URL}/evaluations/reports/performance-vs-salary`,
      salaryAll: (departmentId?: string) => departmentId ? `${API_URL}/evaluations/salary/all?departmentId=${departmentId}` : `${API_URL}/evaluations/salary/all`,
      salaryByUser: (userId: string) => `${API_URL}/evaluations/salary/user/${userId}`,
    },
    projects: {
      all: (status?: string) => status ? `${API_URL}/projects?status=${status}` : `${API_URL}/projects`,
      byId: (id: string) => `${API_URL}/projects/${id}`,
      byUser: (userId: string) => `${API_URL}/projects/user/${userId}`,
      create: `${API_URL}/projects`,
      update: (id: string) => `${API_URL}/projects/${id}`,
      delete: (id: string) => `${API_URL}/projects/${id}`,
      team: (id: string) => `${API_URL}/projects/${id}/team`,
      assignMember: (id: string) => `${API_URL}/projects/${id}/team`,
      removeMember: (id: string, collaboratorId: string) => `${API_URL}/projects/${id}/team/${collaboratorId}`,
      hours: (id: string, year?: number, month?: number) => {
        let url = `${API_URL}/projects/${id}/hours`;
        const params = [];
        if (year) params.push(`year=${year}`);
        if (month) params.push(`month=${month}`);
        return params.length ? `${url}?${params.join('&')}` : url;
      },
      overviewReport: (year: number, month?: number) =>
        month ? `${API_URL}/projects/reports/overview?year=${year}&month=${month}` : `${API_URL}/projects/reports/overview?year=${year}`,
      resourceAllocation: (year: number, month: number) =>
        `${API_URL}/projects/reports/resources?year=${year}&month=${month}`,
    },
    requests: {
      create: `${API_URL}/requests`,
      update: (id: string) => `${API_URL}/requests/${id}`,
      submit: (id: string) => `${API_URL}/requests/${id}/submit`,
      approve: (id: string) => `${API_URL}/requests/${id}/approve`,
      reject: (id: string) => `${API_URL}/requests/${id}/reject`,
      cancel: (id: string, userId: string) => `${API_URL}/requests/${id}/cancel?userId=${userId}`,
      byUser: (userId: string) => `${API_URL}/requests/user/${userId}`,
      pendingForManager: (managerId: string) => `${API_URL}/requests/manager/${managerId}/pending`,
      allForAdmin: `${API_URL}/requests/admin/all`,
      calendar: (month: number, year: number) => `${API_URL}/requests/calendar?month=${month}&year=${year}`,
      balance: (userId: string, year: number) => `${API_URL}/requests/balance/${userId}?year=${year}`,
      updateBalance: (userId: string) => `${API_URL}/requests/balance/${userId}`,
      allBalances: (year: number) => `${API_URL}/requests/balance?year=${year}`,
      stats: (year: number) => `${API_URL}/requests/stats?year=${year}`,
      notifications: (userId: string) => `${API_URL}/requests/notifications/${userId}`,
      markSeen: (id: string) => `${API_URL}/requests/notifications/${id}/seen`,
    },
    holidays: {
      all: (year?: number) => year ? `${API_URL}/holidays?year=${year}` : `${API_URL}/holidays`,
      create: `${API_URL}/holidays`,
      update: (id: string) => `${API_URL}/holidays/${id}`,
      delete: (id: string) => `${API_URL}/holidays/${id}`,
    },
    timesheets: {
      projects: `${API_URL}/timesheets/projects`,
      saveDraft: `${API_URL}/timesheets/draft`,
      submit: (id: string) => `${API_URL}/timesheets/${id}/submit`,
      approve: (id: string) => `${API_URL}/timesheets/${id}/approve`,
      reject: (id: string) => `${API_URL}/timesheets/${id}/reject`,
      byId: (id: string) => `${API_URL}/timesheets/${id}`,
      byUser: (userId: string) => `${API_URL}/timesheets/user/${userId}`,
      submittedForManager: (managerId: string) =>
        `${API_URL}/timesheets/manager/${managerId}/submitted`,
      weeklyReport: (userId: string, weekStartDate: string) =>
        `${API_URL}/timesheets/reports/user/${userId}/weekly?weekStartDate=${encodeURIComponent(weekStartDate)}`,
      monthlyReport: (userId: string, year: number, month: number) =>
        `${API_URL}/timesheets/reports/user/${userId}/monthly?year=${year}&month=${month}`,
      projectTotals: (year: number, month: number) =>
        `${API_URL}/timesheets/reports/projects/totals?year=${year}&month=${month}`,
      exportExcel: (year: number, month: number) =>
        `${API_URL}/timesheets/export/excel?year=${year}&month=${month}`,
      exportPdf: (year: number, month: number) =>
        `${API_URL}/timesheets/export/pdf?year=${year}&month=${month}`,
    },
  },
};

export default apiConfig;

