import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Company, CreateCompanyDto, UpdateCompanyDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// Dashboard stats type
interface CompanyStats {
  total_users: number;
  active_users: number;
  super_admins: number;
  admins: number;
}

interface CompanyWithStats extends Company {
  stats?: CompanyStats;
  user_count?: number;
  active_user_count?: number;
}

interface DeveloperDashboard {
  stats: {
    total_companies: number;
    active_companies: number;
    suspended_companies: number;
    total_users: number;
    active_users: number;
  };
  companies: CompanyWithStats[];
}

// API functions
const companiesApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Company>> => {
    const response = await apiClient.get('/companies', { params });
    return response.data;
  },

  getById: async (id: number): Promise<CompanyWithStats> => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data.data.company;
  },

  getDashboard: async (): Promise<DeveloperDashboard> => {
    const response = await apiClient.get('/companies/dashboard');
    return response.data.data;
  },

  create: async (data: CreateCompanyDto): Promise<CompanyWithStats> => {
    const response = await apiClient.post('/companies', data);
    return response.data.data.company;
  },

  update: async ({ id, data }: { id: number; data: UpdateCompanyDto }): Promise<CompanyWithStats> => {
    const response = await apiClient.put(`/companies/${id}`, data);
    return response.data.data.company;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/companies/${id}`);
  },

  updateStatus: async ({ id, is_active }: { id: number; is_active: number }): Promise<Company> => {
    const response = await apiClient.patch(`/companies/${id}/status`, { is_active });
    return response.data.data.company;
  },
};

// Get all companies with pagination
export function useCompanies(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.companies.list((params || {}) as Record<string, unknown>),
    queryFn: () => companiesApi.getAll(params),
  });
}

// Get single company
export function useCompany(id: number) {
  return useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
  });
}

// Get developer dashboard
export function useDeveloperDashboard() {
  return useQuery({
    queryKey: queryKeys.companies.dashboard(),
    queryFn: () => companiesApi.getDashboard(),
  });
}

// Create company mutation
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.dashboard() });
      toast.success('Company created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to create company');
    },
  });
}

// Update company mutation
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.dashboard() });
      toast.success('Company updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to update company');
    },
  });
}

// Update company status
export function useUpdateCompanyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.dashboard() });
      toast.success('Company status updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to update company status');
    },
  });
}

// Delete company mutation
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: companiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.dashboard() });
      toast.success('Company deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to delete company');
    },
  });
}