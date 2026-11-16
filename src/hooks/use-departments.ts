import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

export interface Department {
  id: number;
  name: string;
  description?: string | null;
  company_id?: number | null;
  is_active: number;
  created_at?: string;
}

const departmentsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Department>> => {
    const response = await apiClient.get('/departments', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Department> => {
    const response = await apiClient.get(`/departments/${id}`);
    return response.data.data.department;
  },

  create: async (data: { name: string; description?: string }): Promise<Department> => {
    const response = await apiClient.post('/departments', data);
    return response.data.data.department;
  },

  update: async ({ id, data }: { id: number; data: Partial<Department> }): Promise<Department> => {
    const response = await apiClient.put(`/departments/${id}`, data);
    return response.data.data.department;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/departments/${id}`);
  },
};

export function useDepartments(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.departments.list((params || {}) as Record<string, unknown>),
    queryFn: () => departmentsApi.getAll(params),
  });
}

export function useDepartment(id: number) {
  return useQuery({
    queryKey: queryKeys.departments.detail(id),
    queryFn: () => departmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() });
      toast.success('Department created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to create department');
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: departmentsApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(variables.id) });
      toast.success('Department updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to update department');
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() });
      // Invalidate users list so department_ref columns refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      toast.success('Department deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    },
  });
}
