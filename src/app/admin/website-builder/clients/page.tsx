'use client';

import { useMemo, useRef, useState } from 'react';
import {
    Save,
    RotateCcw,
    HelpCircle,
    Plus,
    Pencil,
    Trash2,
    GripVertical,
    Upload,
    Image as ImageIcon,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BuilderCountedInput } from '../_components/builder-field';
import { RowTranslateButton } from '../_components/row-translate-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { useCompanyClients } from '@/hooks/useCompanyWebsiteBuilder';

/**
 * Portfolio > Clients — backed by `company_website_clients`.
 *
 * Rows are persisted one at a time (create / update / remove), never through the
 * bulk `replace` mutation: that endpoint DELETEs and re-INSERTs the whole table,
 * which reassigns auto-increment ids and orphans every translation addressed by
 * `record_id`. See session.md §64.
 */
interface ClientRow {
    id: number;
    name: string;
    logo_url: string;
    sort_order: number;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Display-only placeholder for rows with no uploaded logo. Never persisted. */
function logoDataUrl(name: string, color: string, accent: string) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

    return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">
      <rect width="360" height="240" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
      <circle cx="95" cy="120" r="34" fill="${accent}" opacity=".95"/>
      <text x="182" y="132" text-anchor="middle" font-family="Inter, Arial" font-size="42" font-weight="800" fill="${color}">${name}</text>
      <text x="95" y="132" text-anchor="middle" font-family="Inter, Arial" font-size="24" font-weight="900" fill="#ffffff">${initials}</text>
    </svg>
  `)}`;
}

const displayLogo = (client: ClientRow) =>
    client.logo_url || logoDataUrl(client.name, '#2563eb', '#7c3aed');

const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
    });

export default function PortfolioClientsPage() {
    const {
        data: clientsData,
        isLoading,
        create,
        update,
        remove,
        refetch,
    } = useCompanyClients();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [clientName, setClientName] = useState('');
    // Either an existing logo_url or a freshly-read base64 data URL. The backend
    // converts `data:image/...` payloads into stored media on save.
    const [draftLogo, setDraftLogo] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savingLabel, setSavingLabel] = useState('Saving Clients...');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const clients: ClientRow[] = useMemo(
        () =>
            (clientsData || []).map((row: any, index: number) => ({
                id: Number(row.id),
                name: row.name || '',
                logo_url: row.logo_url || '',
                sort_order: Number(row.sort_order) || index + 1,
            })),
        [clientsData]
    );

    const resetForm = () => {
        setEditingId(null);
        setClientName('');
        setDraftLogo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_LOGO_BYTES) {
            toast.error('Logo must be 2MB or smaller.');
            e.target.value = '';
            return;
        }

        try {
            setDraftLogo(await fileToDataUrl(file));
            toast.success('Client logo ready. Click Add/Update to save it.');
        } catch {
            toast.error('Could not read that image. Try another file.');
        }
    };

    const handleSaveClient = async () => {
        const name = clientName.trim();
        if (!name) {
            toast.error('Client Name is required.');
            return;
        }

        setSavingLabel(editingId ? 'Updating client...' : 'Adding client...');
        setIsSaving(true);
        try {
            if (editingId) {
                const existing = clients.find((c) => c.id === editingId);
                await update({
                    id: editingId,
                    name,
                    // Only send a logo when one is present, so an untouched row
                    // keeps whatever is already stored.
                    ...(draftLogo && draftLogo !== existing?.logo_url ? { logo_url: draftLogo } : {}),
                } as any);
                toast.success(`Client "${name}" updated.`);
            } else {
                await create({
                    name,
                    logo_url: draftLogo || '',
                    sort_order: clients.length + 1,
                    is_active: 1,
                } as any);
                toast.success(`Client "${name}" added.`);
            }
            resetForm();
        } catch {
            toast.error('Could not save the client. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (client: ClientRow) => {
        setEditingId(client.id);
        setClientName(client.name);
        setDraftLogo(client.logo_url || null);
    };

    const handleDelete = async (client: ClientRow) => {
        setSavingLabel('Deleting client...');
        setIsSaving(true);
        try {
            await remove(client.id);
            if (editingId === client.id) resetForm();
            toast.success('Client deleted.');
        } catch {
            toast.error('Could not delete the client. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    /** Discards the in-progress form and re-reads the stored list. */
    const handleReset = async () => {
        resetForm();
        await refetch();
        toast.info('Reloaded clients from the saved list.');
    };

    /** Persists the current display order one row at a time. */
    const handleSaveAll = async () => {
        if (clients.length === 0) {
            toast.info('There are no clients to save yet.');
            return;
        }

        setSavingLabel('Saving Clients...');
        setIsSaving(true);
        try {
            for (let i = 0; i < clients.length; i += 1) {
                if (clients[i].sort_order === i + 1) continue;
                await update({ id: clients[i].id, sort_order: i + 1 } as any);
            }
            toast.success('Clients logo wall saved successfully.');
        } catch {
            toast.error('Could not save the client order. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 p-4 md:p-6 bg-slate-50/50 min-h-screen">
            <PageLoader open={isLoading || isSaving} text={isLoading ? 'Loading Clients...' : savingLabel} />
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-4 rounded-xl shadow-2xs">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Portfolio - Clients</h1>
                    <p className="text-xs text-slate-500">
                        Manage client brand logos and display logo wall for your website portfolio.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Live Preview
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        <Save className="h-3.5 w-3.5 mr-1" /> {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Card 1: Add New Client */}
                <div className="md:col-span-5">
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                {editingId ? 'Edit Client' : 'Add New Client'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <BuilderCountedInput
                                label="Client Name"
                                required
                                value={clientName}
                                onChange={(val) => setClientName(val)}
                                maxLength={100}
                                placeholder="Enter client company name"
                            />

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                                    Client Logo
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleLogoSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-100/60 cursor-pointer transition-all text-center group"
                                >
                                    {draftLogo ? (
                                        <div className="relative h-24 w-full flex items-center justify-center">
                                            <img
                                                src={draftLogo}
                                                alt="Preview"
                                                className="max-h-full max-w-full object-contain rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700">Click to upload logo</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">PNG, SVG, JPG (600x400px Max: 2MB)</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {editingId ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                        className="h-9 flex-1 text-xs font-bold border-slate-200 text-slate-700"
                                    >
                                        Cancel
                                    </Button>
                                ) : null}
                                <Button
                                    onClick={handleSaveClient}
                                    disabled={isSaving}
                                    className="h-9 flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                >
                                    <Plus className="h-4 w-4 mr-1" /> {editingId ? 'Update Client' : 'Add Client'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Card 2: Added Clients List */}
                <div className="md:col-span-7">
                    <Card className="shadow-xs border-slate-200">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                Added Clients ({clients.length})
                            </CardTitle>
                            <span className="text-[11px] text-slate-400">Drag handle to reorder</span>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {clients.map((client, index) => (
                                <div
                                    key={client.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs group"
                                >
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-500 cursor-grab" />
                                        <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                                        <div className="h-10 w-16 border rounded bg-slate-50 flex items-center justify-center overflow-hidden p-1">
                                            <img src={displayLogo(client)} alt={client.name} className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-800">{client.name}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <RowTranslateButton
                                            section="clients"
                                            recordId={client.id}
                                            rowLabel={client.name}
                                            fields={[{ key: 'name', label: 'Client Name', value: client.name, required: true }]}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(client)}
                                            className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(client)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {!isLoading && clients.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-600">No Clients Added</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Add your first client using the form.</p>
                                </div>
                            ) : null}

                            <p className="text-[10px] text-slate-400 font-medium pt-2">
                                You can upload up to 30 clients.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <DialogTitle className="text-sm font-bold text-slate-900">Clients — Live Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            This is how the client logo wall will appear on the live website.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {clients.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {clients.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex h-32 items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:shadow-md hover:border-blue-300 group"
                                    >
                                        <img
                                            src={displayLogo(c)}
                                            alt={c.name}
                                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <ImageIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                <p className="text-xs font-bold text-slate-600">No Clients Added</p>
                                <p className="text-[11px] text-slate-400 mt-1">Add clients to build your client logo wall.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
