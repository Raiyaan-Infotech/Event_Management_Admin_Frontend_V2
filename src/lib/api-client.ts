import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { toast } from '@/lib/toast';
import { queryClient, queryKeys } from '@/lib/query-client';

// Use the Next.js proxy route for same-domain cookie handling
// Instead of calling backend directly, we proxy through /api/proxy
// This allows Set-Cookie headers from backend to be set on the Vercel domain
const API_URL = '/api/proxy/v1';

// Custom error class for approval-required responses
export class ApprovalRequiredError extends Error {
  approval: unknown;
  constructor(message: string, approval?: unknown) {
    super(message);
    this.name = 'ApprovalRequiredError';
    this.approval = approval;
  }
}

/**
 * Type guard to check if an error is an ApprovalRequiredError
 */
export function isApprovalRequired(error: unknown): error is ApprovalRequiredError {
  return error instanceof ApprovalRequiredError;
}

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add X-Company-Id header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read currentCompanyId from localStorage
    if (typeof window !== 'undefined') {
      const currentCompanyId = localStorage.getItem('currentCompanyId');

      // If present and valid, add X-Company-Id header (default to 1)
      if (currentCompanyId && currentCompanyId !== 'undefined' && currentCompanyId !== 'null') {
        config.headers['X-Company-Id'] = currentCompanyId;
      } else {
        config.headers['X-Company-Id'] = '1';
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag and queue for silent token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor for error handling, silent token refresh, and approval detection
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (response.status === 202 || data?.approval_required === true) {
      const approvalMsg = data?.message || 'Your request has been sent for approval.';
      toast.info(approvalMsg);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.lists() });
      throw new ApprovalRequiredError(
        data?.message || 'Approval required',
        data?.data
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';
      // Don't attempt refresh for auth endpoints themselves
      if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent refresh using 7-day refresh_token cookie
        try {
          await apiClient.post('/auth/refresh');
        } catch (firstErr: any) {
          if (firstErr?.response?.status === 404) {
            await apiClient.post('/auth/refresh-token');
          } else {
            throw firstErr;
          }
        }
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        // Only if refresh fails (refresh token expired after 7 days), clear cookies and redirect
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.includes('/auth') &&
          !window.location.pathname.startsWith('/vendor') &&
          !window.location.pathname.startsWith('/website-preview')
        ) {
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
          document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
          document.cookie = 'auth_pending=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';

          fetch('/api/auth/clear-session', { method: 'POST' }).finally(() => {
            window.location.href = '/auth/login';
          });
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  approval_required?: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// Generic API functions
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data.data as T;
  },

  getPaginated: async <T>(url: string, params?: PaginationParams): Promise<PaginatedResponse<T>> => {
    const response = await apiClient.get<PaginatedResponse<T>>(url, { params });
    return response.data;
  },

  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },

  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },

  patch: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    return response.data.data as T;
  },
};

export default api;
