import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { apiClient } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContactType = 'admin' | 'vendor' | 'client';

export interface MailContact {
  id: number;
  name: string;
  email: string;
  type: ContactType;
}

export interface MailContacts {
  admins: MailContact[];
  vendors: MailContact[];
  clients: MailContact[];
}

export interface MailRecipientRow {
  id: number;
  mail_id: number;
  recipient_type: ContactType;
  recipient_id: number;
  role: 'to' | 'cc' | 'bcc';
  is_read: number;
  is_active: number;
  label: string | null;
  custom_folder_id: number | null;
}

// New API mail shape
// Sequelize underscored+timestamps returns createdAt/updatedAt (camelCase)
interface MailApiData {
  id: number;
  sender_type: ContactType;
  sender_id: number;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
  sender_is_active?: number;
  sender_label?: string | null;
  sender_custom_folder_id?: number | null;
  createdAt: string;
  updatedAt: string;
  recipients?: MailRecipientRow[];
}

// Legacy flat shape — keeps admin/mail/page.tsx working unchanged
export interface AdminMail {
  id: number;
  to_email: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  body: string;
  folder: 'drafts' | 'sent' | 'inbox';
  status: 'draft' | 'sent' | 'failed';
  custom_folder_id: number | null;
  is_active: number;
  is_read: number;
  label: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  recipients?: MailRecipientRow[];
}

// New payload format (contact-picker based)
export interface MailPayload {
  subject: string;
  body: string;
  recipients: { id: number; type: ContactType; role: 'to' | 'cc' | 'bcc' }[];
}

// Legacy payload format (free-text compose, admin only)
export interface AdminMailPayload {
  to_email: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

export interface MailFolder {
  id: number;
  name: string;
  is_active: number;
}

export interface MailNotification {
  id: number;
  mail_id: number;
  is_read: number;
  created_at: string;
  mail?: { id: number; subject: string; sender_type: string; sent_at: string | null };
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const MAIL_KEY   = ['mails'] as const;
const FOLDER_KEY = ['mail-folders'] as const;
const NOTIF_KEY  = ['mail-notifications'] as const;

const inv = (qc: ReturnType<typeof useQueryClient>, key: readonly string[] = MAIL_KEY) =>
  qc.invalidateQueries({ queryKey: key });

const SENDER_LABEL: Record<string, string> = { admin: 'Admin', vendor: 'Vendor', client: 'Client' };

// ─── Internal raw hooks ───────────────────────────────────────────────────────

const useRawInbox = () =>
  useQuery({
    queryKey: [...MAIL_KEY, 'inbox'],
    queryFn: async () =>
      (await apiClient.get('/mail')).data.data as {
        total: number;
        rows: (MailRecipientRow & { mail: MailApiData; recipientRow?: MailRecipientRow })[];
      },
    staleTime: 30_000,
  });

const useRawSent = () =>
  useQuery({
    queryKey: [...MAIL_KEY, 'sent'],
    queryFn: async () =>
      (await apiClient.get('/mail/sent')).data.data as { count: number; rows: MailApiData[] },
    staleTime: 30_000,
  });

const useRawDrafts = () =>
  useQuery({
    queryKey: [...MAIL_KEY, 'drafts'],
    queryFn: async () =>
      (await apiClient.get('/mail/drafts')).data.data as { count: number; rows: MailApiData[] },
    staleTime: 30_000,
  });

const useRawTrash = () =>
  useQuery({
    queryKey: [...MAIL_KEY, 'trash'],
    queryFn: async () =>
      (await apiClient.get('/mail/trash')).data.data as (MailRecipientRow & { mail?: MailApiData })[],
    staleTime: 30_000,
  });

// ─── Flat helpers ─────────────────────────────────────────────────────────────

const flattenSent = (m: MailApiData): AdminMail => ({
  id: m.id,
  to_email: m.recipients?.filter(r => r.role === 'to').length
    ? `${m.recipients!.filter(r => r.role === 'to').length} recipient(s)`
    : 'Sent',
  cc: null, bcc: null,
  subject: m.subject, body: m.body,
  folder: 'sent', status: m.status,
  custom_folder_id: m.sender_custom_folder_id ?? null, is_active: m.sender_is_active ?? 1, is_read: 1,
  label: m.sender_label ?? null, sent_at: m.sent_at,
  created_at: m.createdAt, updated_at: m.updatedAt,
  recipients: m.recipients ?? [],
});

const flattenDraft = (m: MailApiData): AdminMail => ({
  id: m.id,
  to_email: 'Draft',
  cc: null, bcc: null,
  subject: m.subject, body: m.body,
  folder: 'drafts', status: m.status,
  custom_folder_id: m.sender_custom_folder_id ?? null, is_active: m.sender_is_active ?? 1, is_read: 1,
  label: m.sender_label ?? null, sent_at: m.sent_at,
  created_at: m.createdAt, updated_at: m.updatedAt,
});

const flattenInboxRow = (row: MailRecipientRow & { mail: MailApiData; recipientRow?: MailRecipientRow }): AdminMail => {
  const recipient = row.recipientRow ?? row;
  return {
    id: row.mail.id,
    to_email: `From: ${SENDER_LABEL[row.mail.sender_type] ?? row.mail.sender_type}`,
    cc: null, bcc: null,
    subject: row.mail.subject, body: row.mail.body,
    folder: 'inbox', status: row.mail.status,
    custom_folder_id: recipient.custom_folder_id,
    is_active: recipient.is_active,
    is_read: recipient.is_read,
    label: recipient.label,
    sent_at: row.mail.sent_at,
    created_at: row.mail.createdAt, updated_at: row.mail.updatedAt,
  };
};

const flattenTrashRow = (row: MailRecipientRow & { mail?: MailApiData }): AdminMail => ({
  id: row.mail?.id ?? row.mail_id,
  to_email: row.mail ? `From: ${SENDER_LABEL[row.mail.sender_type] ?? row.mail.sender_type}` : '',
  cc: null, bcc: null,
  subject: row.mail?.subject ?? '', body: row.mail?.body ?? '',
  folder: 'inbox', status: row.mail?.status ?? 'sent',
  custom_folder_id: row.custom_folder_id,
  is_active: row.is_active, is_read: row.is_read,
  label: row.label, sent_at: row.mail?.sent_at ?? null,
  created_at: row.mail?.createdAt ?? '', updated_at: row.mail?.updatedAt ?? '',
});

// ─── Legacy compatibility hooks (used by admin/mail/page.tsx) ─────────────────

/** All sent + draft mails combined in legacy flat format */
export const useAdminMails = () => {
  const sent   = useRawSent();
  const drafts = useRawDrafts();
  const inbox  = useRawInbox();

  const data = useMemo<AdminMail[]>(() => [
    ...(inbox.data?.rows ?? []).map(flattenInboxRow),
    ...(sent.data?.rows ?? []).map(flattenSent),
    ...(drafts.data?.rows ?? []).map(flattenDraft),
  ], [inbox.data, sent.data, drafts.data]);

  return {
    data,
    isLoading: sent.isLoading || drafts.isLoading || inbox.isLoading,
    refetch: () => { sent.refetch(); drafts.refetch(); inbox.refetch(); },
  };
};

export const useAdminMailTrash = () => {
  const trash = useRawTrash();
  const data  = useMemo<AdminMail[]>(() => (trash.data ?? []).map(flattenTrashRow), [trash.data]);
  return { data, isLoading: trash.isLoading, refetch: trash.refetch };
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const useAdminMail = (id?: number) =>
  useQuery({
    queryKey: [...MAIL_KEY, 'single', id],
    queryFn: async () =>
      (await apiClient.get(`/mail/${id}`)).data.data as {
        mail: MailApiData & { recipients?: MailRecipientRow[] };
        recipientRow: MailRecipientRow | null;
      },
    enabled: !!id,
  });

export const useMailContacts = () =>
  useQuery({
    queryKey: ['mail-contacts'],
    queryFn: async () => (await apiClient.get('/mail/contacts')).data.data as MailContacts,
    staleTime: 60_000,
  });

// ─── Compose — new contact-picker format ──────────────────────────────────────

export const useSendMail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: MailPayload) => (await apiClient.post('/mail/send', p)).data.data,
    onSuccess: () => { inv(qc); inv(qc, NOTIF_KEY); toast.success('Mail sent'); },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send mail');
    },
  });
};

export const useSaveMailDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: MailPayload) => (await apiClient.post('/mail/drafts', p)).data.data,
    onSuccess: () => { inv(qc); toast.success('Draft saved'); },
    onError: () => toast.error('Failed to save draft'),
  });
};

export const useUpdateMailDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: MailPayload }) =>
      (await apiClient.put(`/mail/drafts/${id}`, payload)).data.data,
    onSuccess: () => { inv(qc); toast.success('Draft updated'); },
    onError: () => toast.error('Failed to update draft'),
  });
};

export const useSendMailDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: MailPayload }) =>
      (await apiClient.post(`/mail/drafts/${id}/send`, payload)).data.data,
    onSuccess: () => { inv(qc); inv(qc, NOTIF_KEY); toast.success('Draft sent'); },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to send draft');
    },
  });
};

// ─── Legacy compose aliases (admin/mail/page.tsx compose panel) ───────────────
// Admin compose still uses free-text — these wrap to new API using a "send-to-all" recipients approach.
// For now they map to the same new endpoint; the compose panel in admin/mail/page.tsx
// should be updated separately to use useMailContacts + contact picker.

export const useSaveAdminDraft = useSaveMailDraft;
export const useUpdateAdminDraft = useUpdateMailDraft;
export const useSendAdminDraft = useSendMailDraft;
export const useSendAdminMail  = useSendMail;

// ─── Bulk + single ops ────────────────────────────────────────────────────────

export const useDeleteAdminMail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/mail/${id}`),
    onSuccess: () => { inv(qc); toast.success('Moved to trash'); },
    onError:   () => toast.error('Failed to delete'),
  });
};

export const useBulkDeleteAdminMail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => apiClient.post('/mail/bulk-delete', { ids }),
    onSuccess: () => { inv(qc); toast.success('Moved to trash'); },
    onError:   () => toast.error('Failed to delete'),
  });
};

export const useBulkMarkAdminRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, is_read }: { ids: number[]; is_read: boolean }) =>
      apiClient.post('/mail/bulk-read', { ids, is_read }),
    onSuccess: () => inv(qc),
  });
};

export const useRestoreAdminMail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.patch(`/mail/trash/${id}/restore`),
    onSuccess: () => { inv(qc); toast.success('Restored'); },
    onError:   () => toast.error('Failed to restore'),
  });
};

export const usePermanentDeleteAdminMail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/mail/trash/${id}`),
    onSuccess: () => { inv(qc); toast.success('Permanently deleted'); },
    onError:   () => toast.error('Failed to delete'),
  });
};

export const useAssignAdminMailLabel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, label }: { ids: number[]; label: string | null }) =>
      apiClient.post('/mail/bulk-label', { ids, label }),
    onSuccess: () => inv(qc),
    onError: () => toast.error('Failed to assign label'),
  });
};

export const useBulkMoveAdminFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, folder_id }: { ids: number[]; folder_id: number | null }) =>
      apiClient.post('/mail/bulk-folder', { ids, folder_id }),
    onSuccess: () => { inv(qc); toast.success('Mails moved'); },
    onError: () => toast.error('Failed to move mails'),
  });
};

// ─── Folders ──────────────────────────────────────────────────────────────────

export const useAdminMailFolders = () =>
  useQuery({
    queryKey: FOLDER_KEY,
    queryFn: async () => (await apiClient.get('/mail/folders')).data.data as MailFolder[],
    staleTime: 60_000,
  });

export const useCreateAdminMailFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await apiClient.post('/mail/folders', { name })).data.data as MailFolder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: FOLDER_KEY }); toast.success('Folder created'); },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create folder');
    },
  });
};

export const useUpdateAdminMailFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; is_active?: number } }) =>
      (await apiClient.put(`/mail/folders/${id}`, data)).data.data as MailFolder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: FOLDER_KEY }); toast.success('Folder updated'); },
    onError: () => toast.error('Failed to update folder'),
  });
};

export const useDeleteAdminMailFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/mail/folders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: FOLDER_KEY }); toast.success('Folder deleted'); },
    onError: () => toast.error('Failed to delete folder'),
  });
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const useMailNotifications = () =>
  useQuery({
    queryKey: NOTIF_KEY,
    queryFn: async () =>
      (await apiClient.get('/mail/notifications')).data.data as {
        unread_count: number;
        notifications: MailNotification[];
      },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => apiClient.patch('/mail/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });
};
