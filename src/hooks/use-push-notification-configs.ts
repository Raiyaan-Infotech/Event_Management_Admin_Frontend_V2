import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

export interface PushNotificationConfig {
  id: number;
  name: string;
  is_active: boolean;
  project_id?: string | null;
  client_email?: string | null;
  web_api_key?: string | null;
  app_id?: string | null;
  messaging_sender_id?: string | null;
  auth_domain?: string | null;
  storage_bucket?: string | null;
  measurement_id?: string | null;
  vapid_key?: string | null;
  connection_status: 'connected' | 'disconnected' | 'pending' | 'error';
  last_verified_at?: string | null;
  validation_error?: string | null;
  has_service_account?: boolean;
  has_private_key?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavePushNotificationConfigDto {
  name: string;
  is_active?: boolean;
  service_account_json?: string;
  file?: File | null;
  project_id?: string;
  web_api_key?: string;
  app_id?: string;
  messaging_sender_id?: string;
  auth_domain?: string;
  storage_bucket?: string;
  measurement_id?: string;
  vapid_key?: string;
}

/**
 * Pull the saved row out of a write response.
 *
 * ── ⚠ THE SERVER'S KEY IS `pushNotificationConfig`, NOT `config` ────────────
 * Every write endpoint answers `{ data: { pushNotificationConfig } }`. Three
 * of the calls here read `data.config`, which is always undefined — the save
 * itself succeeded, so the toast said "saved successfully" and then the
 * `onSuccess` handler crashed on `saved.id`, making a working save look like
 * a broken one.
 *
 * Both keys are accepted rather than just correcting the name, because the
 * read endpoints already tolerate both and a response shape that differs
 * between reads and writes is the kind of thing that gets re-broken later.
 */
const unwrapConfig = (response: any): PushNotificationConfig => {
  const body = response?.data?.data;
  const config = body?.pushNotificationConfig ?? body?.config ?? body;
  if (!config?.id) {
    throw new Error('The server saved the configuration but did not return it.');
  }
  return config as PushNotificationConfig;
};

const pushNotificationConfigsApi = {
  getAll: async (): Promise<PushNotificationConfig[]> => {
    const response = await apiClient.get("/push-notification-configs");
    return Array.isArray(response.data.data) ? response.data.data : (response.data.data?.configs || []);
  },

  getActive: async (): Promise<PushNotificationConfig | null> => {
    const response = await apiClient.get("/push-notification-configs/active");
    return response.data.data?.pushNotificationConfig || response.data.data?.config || null;
  },

  getById: async (id: number): Promise<PushNotificationConfig> => {
    const response = await apiClient.get(`/push-notification-configs/${id}`);
    return response.data.data?.pushNotificationConfig || response.data.data?.config;
  },

  create: async (data: SavePushNotificationConfigDto): Promise<PushNotificationConfig> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value instanceof File) {
        formData.append('file', value);
      } else if (value !== undefined && value !== null && key !== 'file') {
        formData.append(key, String(value));
      }
    });

    const response = await apiClient.post("/push-notification-configs", formData);
    return unwrapConfig(response);
  },

  update: async ({
    id,
    data,
  }: {
    id: number;
    data: SavePushNotificationConfigDto;
  }): Promise<PushNotificationConfig> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value instanceof File) {
        formData.append('file', value);
      } else if (value !== undefined && value !== null && key !== 'file') {
        formData.append(key, String(value));
      }
    });

    const response = await apiClient.put(`/push-notification-configs/${id}`, formData);
    return unwrapConfig(response);
  },

  setActive: async (id: number): Promise<PushNotificationConfig> => {
    const response = await apiClient.patch(`/push-notification-configs/${id}/active`);
    return unwrapConfig(response);
  },

  testConnection: async (id: number): Promise<{ connected: boolean; status: string; message: string }> => {
    const response = await apiClient.post(`/push-notification-configs/${id}/test`);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/push-notification-configs/${id}`);
  },
};

export const PUSH_CONFIG_KEYS = {
  all: ["push-notification-configs"] as const,
  active: ["push-notification-configs", "active"] as const,
  detail: (id: number) => ["push-notification-configs", id] as const,
};

export function usePushNotificationConfigs() {
  return useQuery({
    queryKey: PUSH_CONFIG_KEYS.all,
    queryFn: pushNotificationConfigsApi.getAll,
  });
}

export function useActivePushNotificationConfig() {
  return useQuery({
    queryKey: PUSH_CONFIG_KEYS.active,
    queryFn: pushNotificationConfigsApi.getActive,
  });
}

export function usePushNotificationConfig(id?: number) {
  return useQuery({
    queryKey: PUSH_CONFIG_KEYS.detail(id!),
    queryFn: () => pushNotificationConfigsApi.getById(id!),
    enabled: typeof id === 'number' && !isNaN(id),
  });
}

export function useCreatePushNotificationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pushNotificationConfigsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.active });
      toast.success("Push notification configuration saved successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create configuration");
    },
  });
}

export function useUpdatePushNotificationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pushNotificationConfigsApi.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.active });
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.detail(data.id) });
      toast.success("Configuration updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update configuration");
    },
  });
}

export function useSetActivePushNotificationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pushNotificationConfigsApi.setActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.active });
      toast.success("Active routing project updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to switch active project");
    },
  });
}

export function useTestPushNotificationConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pushNotificationConfigsApi.testConnection,
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.detail(id) });
      if (res.connected) {
        toast.success(res.message || "Connection validated successfully!");
      } else {
        toast.error(res.message || "Connection validation failed");
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Validation request failed");
    },
  });
}

export function useDeletePushNotificationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pushNotificationConfigsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PUSH_CONFIG_KEYS.active });
      toast.success("Configuration deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete configuration");
    },
  });
}
