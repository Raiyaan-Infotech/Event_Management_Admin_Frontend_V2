import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

const VENDOR_KEYS = {
    all: ['vendors'] as const,
    lists: () => [...VENDOR_KEYS.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...VENDOR_KEYS.lists(), params] as const,
    details: () => [...VENDOR_KEYS.all, 'detail'] as const,
    detail: (id: number | string) => [...VENDOR_KEYS.details(), id] as const,
};

export interface Vendor {
    id: number;
    // Company Info
    company_name: string;
    company_logo: string | null;
    country_id: number | null;
    state_id: number | null;
    city_id: number | null;
    pincode_id: number | null;
    reg_no: string | null;
    gst_no: string | null;
    company_address: string | null;
    company_contact: string | null;
    landline: string | null;
    company_email: string | null;
    website: string | null;
    youtube: string | null;
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    whatsapp: string | null;
    tiktok: string | null;
    telegram: string | null;
    pinterest: string | null;
    about_us: string | null;
    company_information: string | null;
    short_description: string | null;
    // Vendor Info
    name: string;
    profile: string | null;
    address: string | null;
    alt_address: string | null;
    contact: string | null;
    alt_contact: string | null;
    alt_email: string | null;
    email: string;
    membership: 'basic' | 'silver' | 'gold' | 'platinum';
    website_enabled: number | boolean;
    // Bank Info
    bank_name: string | null;
    acc_no: string | null;
    ifsc_code: string | null;
    acc_type: 'savings' | 'current' | 'overdraft' | null;
    branch: string | null;
    bank_logo: string | null;
    // Location
    latitude: number | null;
    longitude: number | null;
    // Meta
    status: 'active' | 'inactive';
    company_id: number | null;
    created_at: string;
}

export const useVendors = (params?: any) => {
    return useQuery({
        queryKey: VENDOR_KEYS.list(params ?? {}),
        queryFn: async () => {
            const res = await apiClient.get('/vendors', { params });
            // MySQL DECIMAL returns as string — parse to number
            const raw = res.data.data;
            if (raw?.data) {
                raw.data = raw.data.map((v: any) => ({
                    ...v,
                    latitude:  v.latitude  != null ? parseFloat(v.latitude)  : null,
                    longitude: v.longitude != null ? parseFloat(v.longitude) : null,
                }));
            }
            return raw;
        },
    });
};

export const useVendor = (id: number) => {
    return useQuery({
        queryKey: VENDOR_KEYS.detail(id),
        queryFn: async () => {
            const res = await apiClient.get(`/vendors/${id}`);
            const raw = res.data.data as Vendor;
            // MySQL DECIMAL returns as string — parse to number so MapPicker receives numbers
            return {
                ...raw,
                latitude:  raw.latitude  != null ? parseFloat(raw.latitude as any)  : null,
                longitude: raw.longitude != null ? parseFloat(raw.longitude as any) : null,
            } as Vendor;
        },
        enabled: !!id,
    });
};

export const useCreateVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Vendor> & { password: string }) => {
            const res = await apiClient.post('/vendors', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
            toast.success('Vendor created successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to create vendor');
        },
    });
};

export const useUpdateVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Vendor> & { password?: string } }) => {
            const res = await apiClient.put(`/vendors/${id}`, data);
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
            queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.detail(variables.id) });
            toast.success('Vendor updated successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to update vendor');
        },
    });
};

export const useUpdateVendorStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'active' | 'inactive' }) => {
            const res = await apiClient.patch(`/vendors/${id}/status`, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
            toast.success('Vendor status updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
};

export const useImpersonateVendor = () => {
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.post(`/vendors/${id}/impersonate`);
            return res.data;
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to open vendor portal');
        },
    });
};

export const useDeleteVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/vendors/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
            toast.success('Vendor deleted successfully');
        },
        onError: (error: any) => {
            if (isApprovalRequired(error)) {
                queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.all });
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to delete vendor');
        },
    });
};
