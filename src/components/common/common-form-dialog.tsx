'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { apiClient } from '@/lib/api-client';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { ImageCropper } from '@/components/common/image-cropper';
import type { CommonFormField } from '@/components/common/common-form';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommonFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    schema: any;
    fields: CommonFormField[];
    defaultValues?: Record<string, any>;
    onSubmit: (data: any) => void;
    isPending?: boolean;
    isEdit?: boolean;
    /** Grid columns inside the dialog. Default: 1 */
    columns?: 1 | 2;
    submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommonFormDialog({
    open,
    onOpenChange,
    title,
    description,
    schema,
    fields,
    defaultValues,
    onSubmit,
    isPending = false,
    isEdit = false,
    columns = 1,
    submitLabel,
}: CommonFormDialogProps) {
    const [showPassMap, setShowPassMap]       = useState<Record<string, boolean>>({});
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [imageKeys, setImageKeys]           = useState<Record<string, number>>({});
    const [imageUrls, setImageUrls]           = useState<Record<string, string>>(() => {
        const urls: Record<string, string> = {};
        fields.forEach(f => {
            if (f.type === 'image' && defaultValues?.[f.name]) {
                urls[f.name] = defaultValues[f.name];
            }
        });
        return urls;
    });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<any>({
        resolver: zodResolver(schema),
        defaultValues,
    });

    // Reset form whenever the dialog opens so edit data is always loaded
    useEffect(() => {
        if (open) reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleOpenChange = (val: boolean) => {
        if (!val) reset(defaultValues);
        onOpenChange(val);
    };

    const handleImageUpload = async (file: File, fieldName: string, folder = 'uploads') => {
        setUploadingField(fieldName);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        try {
            const res = await apiClient.post('/media/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = res.data.data?.file?.url || res.data.data?.url || res.data.url;
            if (url) setImageUrls(prev => ({ ...prev, [fieldName]: url }));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploadingField(null);
        }
    };

    const errMsg = (name: string): string | undefined => {
        const e = errors[name];
        if (!e) return undefined;
        return typeof e.message === 'string' ? e.message : undefined;
    };

    const handleFormSubmit = (values: any) => {
        onSubmit({ ...values, ...imageUrls });
    };

    const gridClass = columns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4';

    const colSpanClass = (field: CommonFormField) =>
        columns === 2 && field.colSpan === 2 ? 'md:col-span-2' : '';

    const renderField = (field: CommonFormField) => {
        const err = errMsg(field.name);
        const span = colSpanClass(field);

        if (field.type === 'image') {
            return (
                <div key={field.name} className={span}>
                    <ImageCropper
                        key={imageKeys[field.name] ?? 0}
                        title={field.imageTitle || field.label}
                        description={field.imageDescription || `Upload ${field.label.toLowerCase()}`}
                        targetWidth={field.targetWidth ?? 200}
                        targetHeight={field.targetHeight ?? 200}
                        currentImage={imageUrls[field.name] || ''}
                        onImageCropped={(file) => handleImageUpload(file, field.name, field.imageFolder)}
                        onRemove={() => {
                            setImageUrls(prev => ({ ...prev, [field.name]: '' }));
                            setImageKeys(prev => ({ ...prev, [field.name]: (prev[field.name] ?? 0) + 1 }));
                        }}
                        rounded={field.rounded}
                    />
                    {uploadingField === field.name && (
                        <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
                    )}
                </div>
            );
        }

        if (field.type === 'switch') {
            return (
                <div key={field.name} className={`flex items-center justify-between rounded-lg border p-3 ${span}`}>
                    <Label className="cursor-pointer">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Switch
                        checked={!!watch(field.name)}
                        onCheckedChange={(v) => !field.disabled && setValue(field.name, v)}
                        disabled={field.disabled}
                    />
                </div>
            );
        }

        if (field.type === 'select') {
            return (
                <div key={field.name} className={`space-y-2 ${span}`}>
                    <Label>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select value={watch(field.name) || ''} onValueChange={(v) => setValue(field.name, v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {err && <p className="text-sm text-destructive">{err}</p>}
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <div key={field.name} className={`space-y-2 ${span}`}>
                    <Label>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Textarea placeholder={field.placeholder} rows={field.rows ?? 3} {...register(field.name)} />
                    {err && <p className="text-sm text-destructive">{err}</p>}
                </div>
            );
        }

        if (field.type === 'password') {
            const show = showPassMap[field.name] ?? false;
            return (
                <div key={field.name} className={`space-y-2 ${span}`}>
                    <Label>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className="relative">
                        <Input
                            type={show ? 'text' : 'password'}
                            placeholder={field.placeholder || '••••••••'}
                            className="pr-10"
                            {...register(field.name)}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowPassMap(prev => ({ ...prev, [field.name]: !show }))}
                        >
                            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {err && <p className="text-sm text-destructive">{err}</p>}
                </div>
            );
        }

        // text | email | number
        return (
            <div key={field.name} className={`space-y-2 ${span}`}>
                <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                    {...register(field.name, field.type === 'number' ? { valueAsNumber: true } : {})}
                />
                {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <div className={`${gridClass} py-2`}>
                        {fields.map(f => renderField(f))}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isPending}>
                            {submitLabel || (isEdit ? 'Save Changes' : 'Create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
