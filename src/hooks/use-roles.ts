import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const rolesApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Role>> => {
    const response = await apiClient.get('/roles', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Role> => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data.data.role;
  },

  create: async (data: CreateRoleDto): Promise<Role> => {
    const response = await apiClient.post('/roles', data);
    return response.data.data.role;
  },

  update: async ({ id, data }: { id: number; data: UpdateRoleDto }): Promise<Role> => {
    const response = await apiClient.put(`/roles/${id}`, data);
    return response.data.data.role;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },

  assignPermissions: async ({ id, permissions }: { id: number; permissions: { permissionId: number; requiresApproval: boolean }[] }): Promise<Role> => {
    const response = await apiClient.post(`/roles/${id}/permissions`, { permissions });
    return response.data.data.role;
  },

  toggleStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<Role> => {
    const response = await apiClient.put(`/roles/${id}`, { is_active });
    return response.data.data.role;
  },
};

// Get all roles with pagination
export function useRoles(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.roles.list((params || {}) as Record<string, unknown>),
    queryFn: () => rolesApi.getAll(params),
  });
}

// Get single role with permissions
export function useRole(id: number) {
  return useQuery({
    queryKey: queryKeys.roles.detail(id),
    queryFn: () => rolesApi.getById(id),
    enabled: !!id,
  });
}

// Create role mutation
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.lists() });
      toast.success('Role created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create role');
    },
  });
}

// Update role mutation
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.lists() });
      toast.success('Role updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update role');
    },
  });
}

// Delete role mutation
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.lists() });
      toast.success('Role deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete role');
    },
  });
}

// Toggle role status
export function useToggleRoleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.toggleStatus,
    onSuccess: (updatedRole, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.lists() });
      const name = updatedRole?.name || 'Role';
      const status = variables.is_active === 1 ? 'activated' : 'deactivated';
      toast.success(`${name} ${status} successfully`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update role status');
    },
  });
}

// Assign permissions mutation
export function useAssignPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.assignPermissions,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.detail(variables.id) });
      toast.success('Permissions assigned successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // Don't show error toast if it's an approval request (interceptor already showed info toast)
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to assign permissions');
    },
  });
}
