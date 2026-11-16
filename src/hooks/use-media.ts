import { useMutation } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface MediaUploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
  driver: string;
}

// API functions
export const mediaApi = {
  upload: async (file: File, folder?: string): Promise<MediaUploadResult> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds the 10MB limit.');
    }
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }
    const response = await apiClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.file;
  },

  uploadMultiple: async (files: File[], folder?: string): Promise<MediaUploadResult[]> => {
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      throw new Error(`File "${oversized.name}" exceeds the 10MB limit.`);
    }
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (folder) {
      formData.append('folder', folder);
    }
    const response = await apiClient.post('/media/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.files;
  },

  deleteFile: async (path: string): Promise<void> => {
    await apiClient.delete('/media', { data: { path } });
  },
};

// Upload single file mutation
export function useUploadMedia() {
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder?: string }) =>
      mediaApi.upload(file, folder),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.message || error.response?.data?.message || 'Failed to upload file');
    },
  });
}

// Upload multiple files mutation
export function useUploadMultipleMedia() {
  return useMutation({
    mutationFn: ({ files, folder }: { files: File[]; folder?: string }) =>
      mediaApi.uploadMultiple(files, folder),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.message || error.response?.data?.message || 'Failed to upload files');
    },
  });
}

// Delete file mutation
export function useDeleteMedia() {
  return useMutation({
    mutationFn: (path: string) => mediaApi.deleteFile(path),
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      if (isApprovalRequired(error)) return;
      toast.error(error.response?.data?.message || 'Failed to delete file');
    },
  });
}
