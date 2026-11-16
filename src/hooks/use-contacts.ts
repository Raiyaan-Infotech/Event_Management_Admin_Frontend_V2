import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';

export interface ContactReply {
    id: number;
    contact_id: number;
    message: string;
    created_by: number;
    created_at: string;
    author?: {
        id: number;
        full_name: string;
        email: string;
        avatar?: string;
    };
}

export interface Contact {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    subject: string | null;
    content: string;
    status: 'unread' | 'read';
    created_at: string;
    replies?: ContactReply[];
}

export const useUnreadContactsCount = () => {
    return useQuery({
        queryKey: [...queryKeys.contacts.all, 'unread-count'],
        queryFn: async () => {
            const res = await apiClient.get('/contacts/unread-count');
            return (res.data.data?.count ?? 0) as number;
        },
        refetchInterval: 60_000,
        staleTime: 50_000,
    });
};

export const useContacts = (params?: any) => {
    return useQuery({
        queryKey: queryKeys.contacts.list(params ?? {}),
        queryFn: async () => {
            const res = await apiClient.get('/contacts', { params });
            return res.data.data;
        },
    });
};

export const useContact = (id: number) => {
    return useQuery({
        queryKey: queryKeys.contacts.detail(id),
        queryFn: async () => {
            const res = await apiClient.get(`/contacts/${id}`);
            return res.data.data;
        },
        enabled: !!id,
    });
};

export const useUpdateContactStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: 'unread' | 'read' }) => {
            const res = await apiClient.put(`/contacts/${id}/status`, { status });
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: [...queryKeys.contacts.all, 'unread-count'] });
            toast.success('Contact status updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
        },
    });
};

export const useDeleteContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiClient.delete(`/contacts/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            toast.success('Contact deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete contact');
        },
    });
};

export const useReplyContent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, message, email_config_id }: { id: number; message: string; email_config_id?: number }) => {
            const res = await apiClient.post(`/contacts/${id}/reply`, { message, email_config_id });
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: [...queryKeys.contacts.all, 'unread-count'] });
            toast.success('Reply sent successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to send reply');
        },
    });
};