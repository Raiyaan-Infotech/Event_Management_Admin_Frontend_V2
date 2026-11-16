import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { User, CreateUserDto, UpdateUserDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const usersApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data.user;
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data.data.user;
  },

  update: async ({ id, data }: { id: number; data: UpdateUserDto }): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.data.user;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  toggleStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<User> => {
    const response = await apiClient.patch(`/users/${id}/status`, {
      is_active,
    });
    return response.data.data.user;
  },
};

// Get all users with pagination
export function useUsers(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.users.list((params || {}) as Record<string, unknown>),
    queryFn: () => usersApi.getAll(params),
  });
}

// Get single user
export function useUser(id: number) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success('Employee created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create employee');
    },
  });
}

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: usersApi.update,
    onSuccess: async (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
      
      // If password was changed, immediately check if current user's session is still valid
      if (variables.data.password) {
        try {
          // Show loading indicator while checking session
          toast.loading('Verifying your session...', { id: 'session-check' });
          
          // Attempt to refetch auth/me with timeout
          const refetchPromise = queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
          
          // If refetch takes more than 5 seconds, assume session invalid and logout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 5000)
          );
          
          await Promise.race([refetchPromise, timeoutPromise]);
          
          // If we got here, session is still valid
          toast.dismiss('session-check');
        } catch (error: any) {
          // Session invalid (401/403 or timeout) - logout immediately
          toast.dismiss('session-check');
          queryClient.clear();
          localStorage.removeItem('auth_pending');
          document.cookie = 'access_token=; Max-Age=-99999999;';
          document.cookie = 'refresh_token=; Max-Age=-99999999;';
          document.cookie = 'auth_pending=; Max-Age=-99999999;';
          router.push('/auth/login');
          toast.error('Your password was changed. Please log in again.');
        }
      }
      
      const name = updatedUser?.full_name || 'Employee';
      if (variables.data.role_id) {
        toast.success(`${name}'s role updated successfully`);
      } else if (variables.data.login_access !== undefined) {
        toast.success(`${name}'s login access ${variables.data.login_access === 1 ? 'enabled' : 'disabled'}`);
      } else {
        toast.success(`${name} updated successfully`);
      }
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update employee');
    },
  });
}

// Toggle user status
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.toggleStatus,
    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      const name = updatedUser?.full_name || 'Employee';
      const status = variables.is_active === 1 ? 'activated' : 'deactivated';
      toast.success(`${name} ${status} successfully`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update employee status');
    },
  });
}

// Delete user mutation
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      // Force-refetch /auth/me immediately. If the current session belongs to the
      // deleted account, the backend returns 401, which the global interceptor
      // catches and redirects to /auth/login straight away.
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      toast.success('Employee deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    },
  });
}
