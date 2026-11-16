import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { toast } from '@/lib/toast';
import type { EmailTemplate, CreateEmailTemplateDto, UpdateEmailTemplateDto } from '@/types';
import type { PaginatedResponse, PaginationParams } from '@/lib/api-client';

// API functions
const emailTemplatesApi = {
  getAll: async (params?: PaginationParams & { type?: string }): Promise<PaginatedResponse<EmailTemplate>> => {
    const response = await apiClient.get('/email-templates', { params });
    return response.data;
  },

  getById: async (id: number): Promise<EmailTemplate> => {
    const response = await apiClient.get(`/email-templates/${id}`);
    return response.data.data.template;
  },

  getParts: async (): Promise<{ headers: { id: number; name: string }[]; footers: { id: number; name: string }[] }> => {
    const response = await apiClient.get('/email-templates/parts');
    return response.data.data;
  },

  create: async (data: CreateEmailTemplateDto): Promise<EmailTemplate> => {
    const response = await apiClient.post('/email-templates', data);
    return response.data.data.template;
  },

  update: async ({ id, data }: { id: number; data: UpdateEmailTemplateDto }): Promise<EmailTemplate> => {
    const response = await apiClient.put(`/email-templates/${id}`, data);
    return response.data.data.template;
  },

  toggleActive: async (id: number): Promise<EmailTemplate> => {
    const response = await apiClient.patch(`/email-templates/${id}/toggle-active`);
    return response.data.data.template;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/email-templates/${id}`);
  },

  preview: async ({ id, variables }: { id: number; variables: Record<string, string> }): Promise<{ subject: string; body: string }> => {
    const response = await apiClient.post(`/email-templates/${id}/preview`, { variables });
    return response.data.data;
  },

  send: async ({ id, to, variables }: { id: number; to: string; variables?: Record<string, string> }): Promise<{ success: boolean; messageId: string }> => {
    const response = await apiClient.post(`/email-templates/${id}/send`, { to, variables });
    return response.data.data;
  },

  getVariables: async (): Promise<{ key: string; description: string; category: string }[]> => {
    const response = await apiClient.get('/email-templates/variables');
    return response.data.data.variables;
  },
};

// Get all email templates with pagination and optional type filter
export function useEmailTemplates(params?: PaginationParams & { type?: string }) {
  return useQuery({
    queryKey: queryKeys.emailTemplates.list((params || {}) as Record<string, unknown>),
    queryFn: () => emailTemplatesApi.getAll(params),
  });
}

// Get single email template
export function useEmailTemplate(id: number) {
  return useQuery({
    queryKey: queryKeys.emailTemplates.detail(id),
    queryFn: () => emailTemplatesApi.getById(id),
    enabled: !!id,
  });
}

// Get available headers and footers for dropdowns
export function useTemplateParts() {
  return useQuery({
    queryKey: [...queryKeys.emailTemplates.all, 'parts'],
    queryFn: () => emailTemplatesApi.getParts(),
  });
}

// Create email template mutation
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailTemplatesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() });
      toast.success('Email template created successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to create email template');
    },
  });
}

// Update email template mutation
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailTemplatesApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.detail(variables.id) });
      toast.success('Email template updated successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update email template');
    },
  });
}

// Toggle active status
export function useToggleEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailTemplatesApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() });
      toast.success('Template status updated');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });
}

// Delete email template mutation
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailTemplatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emailTemplates.lists() });
      toast.success('Email template deleted successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete email template');
    },
  });
}

// Preview email template mutation
export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: emailTemplatesApi.preview,
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to preview email template');
    },
  });
}

// Send email using template
export function useSendEmailTemplate() {
  return useMutation({
    mutationFn: emailTemplatesApi.send,
    onSuccess: () => {
      toast.success('Email sent successfully');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to send email');
    },
  });
}

// Get available template variables
export function useTemplateVariables() {
  return useQuery({
    queryKey: [...queryKeys.emailTemplates.all, 'variables'],
    queryFn: () => emailTemplatesApi.getVariables(),
    staleTime: 1000 * 60 * 10, // 10 minutes - variables don't change often
  });
}
