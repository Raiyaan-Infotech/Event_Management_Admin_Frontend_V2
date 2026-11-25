import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

/* Shapes match src/services/whatsappConfig.service.js on the backend (one JSON block per tab). */

export type WaLang = 'en' | 'en_US' | 'en_GB' | 'ta' | 'hi' | 'ml' | 'te' | 'kn';
export type Quality = 'high' | 'medium' | 'low' | 'unknown';
export type WaCategory = 'marketing' | 'utility' | 'authentication';

export interface WaGeneral {
    provider_name: string;
    description: string;
    default_language: WaLang;
    opt_in_required: boolean;
}
export interface WaApi {
    graph_version: 'v21.0' | 'v22.0' | 'v23.0' | 'v24.0';
    app_id: string;
    waba_id: string;
    timeout_seconds: number;
    retry_attempts: number;
    retry_interval_seconds: number;
    /* read-only, from the server */
    base_url?: string;
    has_app_secret?: boolean;
    app_secret_hint?: string;
    has_access_token?: boolean;
    access_token_hint?: string;
    secrets_unreadable?: boolean;
    /* write-only: sent only when the admin types a new value */
    app_secret?: string;
    access_token?: string;
}
export interface WaBusiness {
    portfolio_id: string;
    portfolio_name: string;
    verification_status: 'verified' | 'pending' | 'not_verified' | 'rejected';
    display_name: string;
    display_name_status: 'approved' | 'pending' | 'rejected';
    quality_rating: Quality;
    vertical: 'EVENT_PLAN' | 'ENTERTAIN' | 'PROF_SERVICES' | 'OTHER';
    timezone: string;
    about: string;
    profile_description: string;
    profile_email: string;
    address: string;
    website: string;
}
export interface WaSender {
    display_name: string;
    phone_number: string;
    phone_number_id: string;
    purpose: string;
    verification: 'verified' | 'pending' | 'not_verified';
    quality: Quality;
    is_default: boolean;
}
export interface WaSenders {
    items: WaSender[];
    fallback_phone_number_id: string;
    incoming_enabled: boolean;
}
export interface WaTemplate {
    name: string;
    key: string;
    category: WaCategory;
    language: WaLang;
    status: 'approved' | 'pending' | 'rejected' | 'paused' | 'disabled';
    variables: number;
}
export type WaWebhookEvent = 'messages' | 'message_status' | 'template_status' | 'quality' | 'account';
export interface WaWebhook {
    events: Record<WaWebhookEvent, boolean>;
    callback_url?: string;
    verify_token?: string;
    receiver_ready?: boolean;
}
export interface WaLimits {
    tier: '250' | '1000' | '10000' | '100000' | 'unlimited';
    throughput: '80' | '1000';
    max_per_second: number;
    max_per_event_day: number;
    cap_applies: 'all' | 'campaign';
    include_system: boolean;
    warn_yellow: boolean;
    warn_red: boolean;
    notify_quality_change: boolean;
    recipients: string[];
    auto_throttle_enabled: boolean;
    auto_throttle_percent: number;
    pause_enabled: boolean;
    pause_percent: number;
    resume_next_day: boolean;
}
export interface WaBudget {
    daily_limit: number;
    monthly_cap: number;
    alert_percent: number;
    hard_limit_action: 'stop' | 'alert_only';
    rates: Record<WaCategory, number>;
}
export interface WaStatus {
    connection_status: 'not_tested' | 'connected' | 'error';
    last_tested_at: string | null;
    last_test_message: string | null;
    last_test_info: { display_phone_number: string | null; verified_name: string | null; quality_rating: string | null; code_verification_status: string | null } | null;
    updated_at: string;
}
export interface WhatsAppConfig {
    id: number;
    is_active: boolean;
    general: WaGeneral;
    api: WaApi;
    business: WaBusiness;
    senders: WaSenders;
    templates: { items: WaTemplate[] };
    webhook: WaWebhook;
    limits: WaLimits;
    budget: WaBudget;
    status: WaStatus;
}

export type WaSection = 'general' | 'api' | 'business' | 'senders' | 'templates' | 'webhook' | 'limits' | 'budget';

const KEY = ['whatsapp-config'];
const unwrap = (res: any): WhatsAppConfig => res?.data?.data?.config;
const errorText = (err: any) => err?.response?.data?.message || err?.message || 'Something went wrong';

export function useWhatsAppConfig() {
    return useQuery({ queryKey: KEY, queryFn: async () => unwrap(await apiClient.get('/whatsapp-config')) });
}

export function useSaveWhatsAppSection() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ section, data }: { section: WaSection; data: Record<string, unknown> }) =>
            unwrap(await apiClient.put(`/whatsapp-config/${section}`, data)),
        onSuccess: (config) => { qc.setQueryData(KEY, config); toast.success('Settings saved'); },
        onError: (err) => { toast.error(errorText(err)); },
    });
}

export function useTestWhatsAppConnection() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => unwrap(await apiClient.post('/whatsapp-config/test')),
        onSuccess: (config) => {
            qc.setQueryData(KEY, config);
            if (config.status.connection_status === 'connected') toast.success('Connection successful');
            else toast.error(config.status.last_test_message || 'Connection failed');
        },
        onError: (err) => { toast.error(errorText(err)); },
    });
}

export function useRegenerateWhatsAppVerifyToken() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => unwrap(await apiClient.post('/whatsapp-config/verify-token')),
        onSuccess: (config) => { qc.setQueryData(KEY, config); toast.success('New verify token created. Update it in Meta.'); },
        onError: (err) => { toast.error(errorText(err)); },
    });
}
