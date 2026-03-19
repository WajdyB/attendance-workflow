// app/utils/api-config.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
      create: `${API_URL}/users`,
    },
  },
};

export default apiConfig;
