import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/* Shapes match src/services/msg91Config.service.js on the backend (one JSON block per tab). */

export type Lang = 'en' | 'ta' | 'hi' | 'ml' | 'te' | 'kn';

export interface Msg91General {
    provider_name: string;
    description: string;
    channels: { sms: boolean; otp: boolean; email: boolean; webhook: boolean };
    default_language: Lang;
    time_zone: string;
    default_priority: 'normal' | 'high';
}
export interface Msg91Api {
    timeout_seconds: number;
    retry_attempts: number;
    request_logging: boolean;
    /* read-only, from the server */
    base_url?: string;
    has_auth_key?: boolean;
    auth_key_hint?: string;
    auth_key_unreadable?: boolean;
    /* write-only: sent only when the admin types a new key */
    auth_key?: string;
}
export interface Msg91Sms {
    transactional_enabled: boolean;
    promotional_enabled: boolean;
    default_route: 'transactional' | 'promotional';
    sender_transactional: string;
    sender_promotional: string;
    unicode: boolean;
    length_mode: 'auto_split' | 'truncate' | 'custom';
    custom_limit: number;
    dlr_enabled: boolean;
    dlr_realtime: boolean;
    dlr_notify_failure: boolean;
    working_hours_enabled: boolean;
    working_from: string;
    working_to: string;
    default_language: Lang;
}
export interface Msg91Otp {
    sms_enabled: boolean;
    whatsapp_fallback: boolean;
    sender_id: string;
    length: string;
    validity_minutes: number;
    resend_seconds: number;
    max_attempts: number;
    msg91_template_id: string;
    dlt_template_id: string;
    otp_variable: string;
    app_hash: string;
    rate_limit_enabled: boolean;
    rate_limit_per_hour: number;
    lockout_enabled: boolean;
    lockout_minutes: number;
    wa_number: string;
    wa_template: string;
    wa_language: 'en' | 'en_US' | 'en_GB' | 'ta' | 'hi' | 'ml' | 'te' | 'kn';
    wa_namespace: string;
    wa_copy_button: boolean;
}
export type ChannelUse = 'T' | 'P' | 'S' | 'O';
export interface DltSender {
    sender_id: string;
    channel_use: ChannelUse;
    purpose: string;
    status: 'approved' | 'pending' | 'rejected';
    approval_date: string;
}
export interface Msg91Dlt {
    entity_id: string;
    entity_name: string;
    registration_status: 'registered' | 'pending' | 'not_registered';
    registration_date: string;
    approval_date: string;
    senders: DltSender[];
}
export interface SmsTemplate {
    name: string;
    key: string;
    msg91_template_id: string;
    dlt_template_id: string;
    sender_id: string;
    category: 'transactional' | 'promotional' | 'service' | 'otp';
    language: Lang;
    variables: string;
}
export interface EmailTemplateMap {
    name: string;
    key: string;
    msg91_template_id: string;
}
export interface Msg91Email {
    sender_email: string;
    sender_name: string;
    reply_to: string;
    domain: string;
    domain_status: 'not_added' | 'pending' | 'verified' | 'failed';
    bounce_handling: 'mark_notify' | 'mark_only' | 'ignore';
    unsubscribe_link: boolean;
    global_suppression: boolean;
    default_language: Lang;
    categories: { invitations: boolean; updates: boolean; reminders: boolean; tickets: boolean; marketing: boolean; system: boolean };
    track_opens: boolean;
    track_clicks: boolean;
    utm: boolean;
    templates: EmailTemplateMap[];
}
export type WebhookEvent = 'delivery' | 'status' | 'bounce' | 'otp' | 'email';
export interface Msg91Webhook {
    events: Record<WebhookEvent, boolean>;
    urls?: Record<WebhookEvent, string>;
    receiver_ready?: boolean;
}
export interface AlertLine { on: boolean; threshold: number }
export interface Msg91Alerts {
    sms: AlertLine;
    email: AlertLine;
    otp: AlertLine;
    notify_email: boolean;
    notify_sms: boolean;
    notify_in_app: boolean;
    recipients: string[];
    frequency: 'immediate' | 'daily';
}
export interface Msg91Status {
    connection_status: 'not_tested' | 'connected' | 'error';
    last_tested_at: string | null;
    last_test_message: string | null;
    last_balance: { transactional_sms: number; fetched_at: string } | null;
    updated_at: string;
}

export interface Msg91Config {
    id: number;
    is_active: boolean;
    general: Msg91General;
    api: Msg91Api;
    sms: Msg91Sms;
    otp: Msg91Otp;
    dlt: Msg91Dlt;
    sms_templates: { items: SmsTemplate[] };
    email: Msg91Email;
    webhook: Msg91Webhook;
    alerts: Msg91Alerts;
    status: Msg91Status;
}

export type Msg91Section = 'general' | 'api' | 'sms' | 'otp' | 'dlt' | 'sms_templates' | 'email' | 'webhook' | 'alerts';

const KEY = ['msg91-config'];
const unwrap = (res: any): Msg91Config => res?.data?.data?.config;
const errorText = (err: any) => err?.response?.data?.message || err?.message || 'Something went wrong';

export function useMsg91Config() {
    return useQuery({
        queryKey: KEY,
        queryFn: async () => unwrap(await apiClient.get('/msg91-config')),
    });
}

export function useSaveMsg91Section() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ section, data }: { section: Msg91Section; data: Record<string, unknown> }) =>
            unwrap(await apiClient.put(`/msg91-config/${section}`, data)),
        onSuccess: (config) => {
            qc.setQueryData(KEY, config);
            toast.success('Settings saved');
        },
        onError: (err) => { toast.error(errorText(err)); },
    });
}

export function useTestMsg91Connection() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => unwrap(await apiClient.post('/msg91-config/test')),
        onSuccess: (config) => {
            qc.setQueryData(KEY, config);
            if (config.status.connection_status === 'connected') toast.success('Connection successful');
            else toast.error(config.status.last_test_message || 'Connection failed');
        },
        onError: (err) => { toast.error(errorText(err)); },
    });
}

export function useRegenerateMsg91WebhookToken() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => unwrap(await apiClient.post('/msg91-config/webhook-token')),
        onSuccess: (config) => {
            qc.setQueryData(KEY, config);
            toast.success('New webhook token created. Update the URLs in MSG91.');
        },
        onError: (err) => { toast.error(errorText(err)); },
    });
}

export interface Msg91TestSendResult {
    channel: 'sms' | 'whatsapp';
    to: string;
    ok: boolean;
    code: string | null;
    http_status: number | null;
    reply: string;
    sent_at: string;
}

/** Sends ONE real test OTP with the saved settings (uses 1 MSG91 credit). */
export function useMsg91TestSend() {
    return useMutation({
        mutationFn: async (body: { channel: 'sms' | 'whatsapp'; dial_code: string; mobile: string }) =>
            (await apiClient.post('/msg91-config/test-send', body))?.data?.data?.result as Msg91TestSendResult,
        onSuccess: (r) => {
            if (r.ok) toast.success(`Test ${r.channel === 'sms' ? 'SMS' : 'WhatsApp'} accepted by MSG91`);
            else toast.error(r.reply || 'MSG91 refused the message');
        },
        onError: (err) => { toast.error(errorText(err)); },
    });
}
