import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export interface MediaFile {
    name: string;
    path: string;
    url: string;
    size: number;
    mimetype: string;
    type: 'file';
    created_at?: string;
    updated_at?: string;
    driver?: string;
}

export interface MediaFolder {
    name: string;
    path: string;
    type: 'folder';
}

export interface MediaListResult {
    folders: MediaFolder[];
    files: MediaFile[];
    path: string;
    driver: string;
}

// ─── List files ───────────────────────────────────────────────────────────────
export const useMediaFiles = (folder: string = '', options?: { enabled?: boolean }) => {
    return useQuery<MediaListResult>({
        queryKey: ['media-files', folder],
        queryFn: async () => {
            const res = await apiClient.get('/media/files', { params: { folder } });
            return res.data.data;
        },
        enabled: options?.enabled !== false,
    });
};

// ─── Upload file ──────────────────────────────────────────────────────────────
export const useUploadMediaFile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ file, folder, path }: { file: File; folder: string; path?: string }) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', folder);
            if (path) fd.append('path', path);
            const res = await apiClient.post('/media/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data.data.file;
        },
        onSuccess: (_, vars) => {
            // Always invalidate so the list refreshes with the new file.
            // For crop uploads (vars.path set) the component shows its own toast.
            qc.invalidateQueries({ queryKey: ['media-files', vars.folder] });
            if (!vars.path) toast.success('File uploaded');
        },
        onError: (e: any) => {
            if (isApprovalRequired(e)) return;
            toast.error(e?.response?.data?.message || 'Upload failed');
        },
    });
};

// ─── Delete file ──────────────────────────────────────────────────────────────
export const useDeleteMediaFile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ path, folder }: { path: string; folder: string }) => {
            await apiClient.delete('/media', { data: { path } });
            return folder;
        },
        onSuccess: (folder) => {
            qc.invalidateQueries({ queryKey: ['media-files', folder] });
            toast.success('File deleted');
        },
        onError: (e: any) => {
            if (isApprovalRequired(e)) return;
            toast.error(e?.response?.data?.message || 'Delete failed');
        },
    });
};

// ─── Create folder ────────────────────────────────────────────────────────────
export const useCreateMediaFolder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, parent }: { name: string; parent: string }) => {
            const folder = parent ? `${parent}/${name}` : name;
            const res = await apiClient.post('/media/folder', { folder });
            return { result: res.data.data, parent };
        },
        onSuccess: ({ parent }) => {
            qc.invalidateQueries({ queryKey: ['media-files', parent] });
            toast.success('Folder created');
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create folder'),
    });
};

// ─── Rename file/folder ────────────────────────────────────────────────────────
export const useRenameMediaFile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ path, newName, folder }: { path: string; newName: string; folder: string }) => {
            const res = await apiClient.post('/media/rename', { path, newName });
            return { result: res.data.data, folder };
        },
        onSuccess: ({ folder }) => {
            qc.invalidateQueries({ queryKey: ['media-files', folder] });
            toast.success('Renamed successfully');
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to rename'),
    });
};

// ─── Copy file ────────────────────────────────────────────────────────────────
export const useCopyMediaFile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ path, targetFolder, newName, folder }: { path: string; targetFolder: string; newName: string; folder: string }) => {
            const res = await apiClient.post('/media/copy', { path, targetFolder, newName });
            return { result: res.data.data, folder, targetFolder };
        },
        onSuccess: ({ folder, targetFolder }) => {
            qc.invalidateQueries({ queryKey: ['media-files', folder] });
            if (targetFolder !== folder) {
                qc.invalidateQueries({ queryKey: ['media-files', targetFolder] });
            }
            toast.success('Copied successfully');
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to copy file'),
    });
};

// ─── Move file ────────────────────────────────────────────────────────────────
export const useMoveMediaFile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ path, targetFolder, folder }: { path: string; targetFolder: string; folder: string }) => {
            const res = await apiClient.post('/media/move', { path, targetFolder });
            return { result: res.data.data, folder, targetFolder };
        },
        onSuccess: ({ folder, targetFolder }) => {
            qc.invalidateQueries({ queryKey: ['media-files', folder] });
            if (targetFolder !== folder) {
                qc.invalidateQueries({ queryKey: ['media-files', targetFolder] });
            }
            toast.success('Moved successfully');
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to move file'),
    });
};

