import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Currency, CreateCurrencyDto, UpdateCurrencyDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const currenciesApi = {
  getActive: async (): Promise<Currency[]> => {
    const response = await apiClient.get('/currencies/active');
    return response.data.data.currencies;
  },

  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Currency>> => {
    const response = await apiClient.get('/currencies', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Currency> => {
    const response = await apiClient.get(`/currencies/${id}`);
    return response.data.data.currency;
  },

  create: async (data: CreateCurrencyDto): Promise<Currency> => {
    const response = await apiClient.post('/currencies', data);
    return response.data.data.currency;
  },

  update: async ({ id, data }: { id: number; data: UpdateCurrencyDto }): Promise<Currency> => {
    const response = await apiClient.put(`/currencies/${id}`, data);
    return response.data.data.currency;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/currencies/${id}`);
  },

  setDefault: async (id: number): Promise<Currency> => {
    const response = await apiClient.patch(`/currencies/${id}/default`);
    return response.data.data.currency;
  },
};

// Get active currencies (public)
export function useActiveCurrencies() {
  return useQuery({
    queryKey: queryKeys.currencies.active(),
    queryFn: currenciesApi.getActive,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get all currencies with pagination
export function useCurrencies(params?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.currencies.list((params || {}) as Record<string, unknown>),
    queryFn: () => currenciesApi.getAll(params),
  });
}

// Get single currency
export function useCurrency(id: number) {
  return useQuery({
    queryKey: queryKeys.currencies.detail(id),
    queryFn: () => currenciesApi.getById(id),
    enabled: !!id,
  });
}

// Create currency mutation
export function useCreateCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: currenciesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currencies.all });
      toast.success('Currency created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create currency');
    },
  });
}

// Update currency mutation
export function useUpdateCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: currenciesApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currencies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.currencies.detail(variables.id) });
      toast.success('Currency updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update currency');
    },
  });
}

// Delete currency mutation
export function useDeleteCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: currenciesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currencies.all });
      toast.success('Currency deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete currency');
    },
  });
}

// Toggle currency active status
export function useToggleCurrencyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      currenciesApi.update({ id, data: { is_active } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currencies.all });
      toast.success('Currency status updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });
}

// Set default currency mutation
export function useSetDefaultCurrency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: currenciesApi.setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currencies.all });
      toast.success('Default currency updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to set default currency');
    },
  });
}
