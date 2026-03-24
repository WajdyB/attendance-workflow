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

