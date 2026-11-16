import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { Payment, PaymentStats, PaymentStatus } from '@/types';

// ─── API ──────────────────────────────────────────────────────────────────────

export interface PaymentsFilter {
    page?: number;
    limit?: number;
    status?: PaymentStatus | '';
    gateway?: string;
    search?: string;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface PaymentsResponse {
    data: Payment[];
    pagination: PaginationMeta;
}

const paymentsApi = {
    getAll: async (params: PaymentsFilter = {}): Promise<PaymentsResponse> => {
        const response = await apiClient.get('/payments', { params });
        return response.data;
    },

    getStats: async (): Promise<PaymentStats> => {
        const response = await apiClient.get('/payments/stats');
        return response.data.data;
    },

    getById: async (id: number): Promise<Payment> => {
        const response = await apiClient.get(`/payments/${id}`);
        return response.data.data.payment;
    },

    updateStatus: async ({ id, status }: { id: number; status: PaymentStatus }): Promise<Payment> => {
        const response = await apiClient.patch(`/payments/${id}/status`, { status });
        return response.data.data.payment;
    },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePayments(filters: PaymentsFilter = {}) {
    return useQuery({
        queryKey: [...queryKeys.payments.list(), filters],
        queryFn: () => paymentsApi.getAll(filters),
        staleTime: 60 * 1000,
    });
}

export function usePaymentStats() {
    return useQuery({
        queryKey: queryKeys.payments.stats(),
        queryFn: paymentsApi.getStats,
        staleTime: 2 * 60 * 1000,
    });
}

export function usePayment(id: number) {
    return useQuery({
        queryKey: queryKeys.payments.detail(id),
        queryFn: () => paymentsApi.getById(id),
        enabled: !!id,
    });
}

export function useUpdatePaymentStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: paymentsApi.updateStatus,
        onSuccess: (updated) => {
            toast.success(`Payment marked as ${updated.status}`);
            queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            toast.error(error.response?.data?.message || 'Failed to update payment');
        },
    });
}
