'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus,
    Check,
    X,
    Pencil,
    Trash2,
    Save,
    ExternalLink,
    GripVertical,
    Info,
    Sparkles,
    Video,
    Layout,
    Globe,
    QrCode,
    Users,
    Headphones,
    Shield,
    BarChart,
    Calendar,
    Zap,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoader } from '@/components/common/page-loader';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { IconPickerDialog } from '@/components/common/icon-picker-dialog';
import {
    usePricingMatrixFeaturesData,
    useSavePricingMatrixFeatures,
    useCreatePricingMatrixFeature,
    useUpdatePricingMatrixFeature,
    useDeletePricingMatrixFeature,
    type PricingMatrixFeature,
} from '@/hooks/usePricingPlans';
import { RowTranslateButton } from '../_components/row-translate-dialog';

const ICON_OPTIONS = [
    { label: 'Live Streaming', value: 'Video', icon: Video },
    { label: 'Beautiful Templates', value: 'Layout', icon: Layout },
    { label: 'Custom Domain', value: 'Globe', icon: Globe },
    { label: 'QR Code Access', value: 'QrCode', icon: QrCode },
    { label: 'Guest Management', value: 'Users', icon: Users },
    { label: 'Priority Support', value: 'Headphones', icon: Headphones },
    { label: 'Remove Branding', value: 'Shield', icon: Shield },
    { label: 'Analytics & Reports', value: 'BarChart', icon: BarChart },
    { label: 'Multiple Event Organizer', value: 'Calendar', icon: Calendar },
    { label: 'Team Collaboration', value: 'Zap', icon: Zap },
];

const DEFAULT_MATRIX_FEATURES: PricingMatrixFeature[] = [
    {
        id: 1,
        feature_name: 'Beautiful Templates',
        icon: 'Layout',
        description: 'Access to 1000+ customizable design templates for every event occasion.',
        category: 'Design',
        plan_values_json: {
            free: { not_included: false, limit: '' },
            basic: { not_included: false, limit: '' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 1,
        is_active: true,
    },
    {
        id: 2,
        feature_name: 'Custom Domain',
        icon: 'Globe',
        description: 'Connect your own branded domain to your public event website.',
        category: 'Branding',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: false, limit: '' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 2,
        is_active: true,
    },
    {
        id: 3,
        feature_name: 'Live Streaming',
        icon: 'Video',
        description: 'Broadcast your live events directly to online attendees.',
        category: 'Features',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: false, limit: 'Limited' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 3,
        is_active: true,
    },
    {
        id: 4,
        feature_name: 'QR Code Access',
        icon: 'QrCode',
        description: 'Generate dynamic QR codes for instant guest check-in and sharing.',
        category: 'Features',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: false, limit: '' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 4,
        is_active: true,
    },
    {
        id: 5,
        feature_name: 'Guest Management',
        icon: 'Users',
        description: 'Manage guest lists, RSVPs, invitations, and seating charts.',
        category: 'Features',
        plan_values_json: {
            free: { not_included: false, limit: 'Up to 50' },
            basic: { not_included: false, limit: 'Up to 500' },
            pro: { not_included: false, limit: 'Up to 2000' },
            premium: { not_included: false, limit: 'Unlimited' },
            companies: { not_included: false, limit: 'Unlimited' },
        },
        sort_order: 5,
        is_active: true,
    },
    {
        id: 6,
        feature_name: 'Priority Support',
        icon: 'Headphones',
        description: '24/7 dedicated customer support with under 15 minute response time.',
        category: 'Support',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: true, limit: '' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 6,
        is_active: true,
    },
    {
        id: 7,
        feature_name: 'Remove Branding',
        icon: 'Shield',
        description: 'Remove website builder powered-by logo from footers and forms.',
        category: 'Branding',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: true, limit: '' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 7,
        is_active: true,
    },
    {
        id: 8,
        feature_name: 'Analytics & Reports',
        icon: 'BarChart',
        description: 'Real-time visitor tracking, registration analytics, and exportable reports.',
        category: 'Analytics',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: false, limit: 'Basic' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 8,
        is_active: true,
    },
    {
        id: 9,
        feature_name: 'Multiple Event Organizer',
        icon: 'Calendar',
        description: 'Create and manage multiple concurrent event projects under one account.',
        category: 'Management',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: true, limit: '' },
            pro: { not_included: false, limit: 'Partial' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 9,
        is_active: true,
    },
    {
        id: 10,
        feature_name: 'Team Collaboration',
        icon: 'Zap',
        description: 'Invite co-hosts and event managers with granular permissions.',
        category: 'Management',
        plan_values_json: {
            free: { not_included: true, limit: '' },
            basic: { not_included: true, limit: '' },
            pro: { not_included: false, limit: 'Partial' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        },
        sort_order: 10,
        is_active: true,
    },
];

const PLAN_TIERS = [
    { key: 'free', label: 'Free', color: 'text-slate-700 bg-slate-100 border-slate-200' },
    { key: 'basic', label: 'Basic', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { key: 'pro', label: 'Pro', color: 'text-pink-600 bg-pink-50 border-pink-200' },
    { key: 'premium', label: 'Premium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { key: 'companies', label: 'Companies', color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

export default function PlanFeaturesPage() {
    const { data: dbFeatures, isLoading } = usePricingMatrixFeaturesData();
    // Per-item create/update/delete, NOT the bulk save-all hook: that endpoint
    // deletes every feature and reinserts the whole table with fresh
    // auto-increment ids on every save, which silently orphaned every
    // feature's translations (their record_id no longer matched any row) the
    // moment ANY feature was added, edited, or removed. Kept only for the
    // drag-reorder path below, which just persists sort_order.
    const saveMutation = useSavePricingMatrixFeatures();
    const createFeatureMutation = useCreatePricingMatrixFeature();
    const updateFeatureMutation = useUpdatePricingMatrixFeature();
    const deleteFeatureMutation = useDeletePricingMatrixFeature();

    const [features, setFeatures] = useState<PricingMatrixFeature[]>(DEFAULT_MATRIX_FEATURES);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<PricingMatrixFeature | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [featureToDelete, setFeatureToDelete] = useState<PricingMatrixFeature | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState('Sparkles');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [tierLimits, setTierLimits] = useState<Record<string, { not_included: boolean; limit: string }>>({
        free: { not_included: false, limit: '' },
        basic: { not_included: false, limit: '' },
        pro: { not_included: false, limit: '' },
        premium: { not_included: false, limit: '' },
        companies: { not_included: false, limit: '' },
    });

    useEffect(() => {
        if (dbFeatures && dbFeatures.length > 0) {
            setFeatures(dbFeatures);
        }
    }, [dbFeatures]);

    const handleOpenAddModal = () => {
        setEditingFeature(null);
        setTitle('');
        setIcon('Live Streaming');
        setDescription('');
        setIsActive(true);
        setTierLimits({
            free: { not_included: true, limit: '' },
            basic: { not_included: false, limit: '' },
            pro: { not_included: false, limit: '' },
            premium: { not_included: false, limit: '' },
            companies: { not_included: false, limit: '' },
        });
        setModalOpen(true);
    };

    const handleOpenEditModal = (feat: PricingMatrixFeature) => {
        setEditingFeature(feat);
        setTitle(feat.feature_name);
        setIcon(feat.icon || 'Sparkles');
        setDescription(feat.description || '');
        setIsActive(feat.is_active !== undefined ? Boolean(feat.is_active) : true);

        const currentMap = (feat.plan_values_json || {}) as Record<string, any>;
        const parsed: Record<string, { not_included: boolean; limit: string }> = {};

        PLAN_TIERS.forEach((tier) => {
            const val = currentMap[tier.key];
            if (typeof val === 'object' && val !== null) {
                parsed[tier.key] = {
                    not_included: Boolean(val.not_included),
                    limit: String(val.limit || ''),
                };
            } else if (typeof val === 'boolean') {
                parsed[tier.key] = {
                    not_included: !val,
                    limit: '',
                };
            } else if (typeof val === 'string') {
                parsed[tier.key] = {
                    not_included: false,
                    limit: val,
                };
            } else {
                parsed[tier.key] = { not_included: false, limit: '' };
            }
        });

        setTierLimits(parsed);
        setModalOpen(true);
    };

    const handleSaveFeature = async () => {
        if (!title.trim()) {
            toast.error('Feature title is required');
            return;
        }

        const payload: Partial<PricingMatrixFeature> = {
            feature_name: title.trim(),
            icon,
            description: description.trim(),
            category: 'Features',
            plan_values_json: tierLimits,
            is_active: isActive,
        };

        try {
            if (editingFeature?.id) {
                await updateFeatureMutation.mutateAsync({ id: Number(editingFeature.id), payload });
            } else {
                await createFeatureMutation.mutateAsync({ ...payload, sort_order: features.length + 1 });
            }
            setModalOpen(false);
        } catch {
            // error toast handled by the mutation
        }
    };

    const handleDeleteFeature = (feat: PricingMatrixFeature) => {
        setFeatureToDelete(feat);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!featureToDelete?.id) return;
        try {
            await deleteFeatureMutation.mutateAsync(Number(featureToDelete.id));
            setDeleteDialogOpen(false);
            setFeatureToDelete(null);
        } catch {
            // error toast handled by the mutation
        }
    };

    const handleSaveAll = async () => {
        try {
            await saveMutation.mutateAsync(features);
        } catch (err) {
            console.error(err);
        }
    };

    // Drag and drop sorting handlers
    const handleDragStart = (idx: number) => {
        setDraggedIndex(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === idx) return;

        const updated = [...features];
        const [moved] = updated.splice(draggedIndex, 1);
        updated.splice(idx, 0, moved);

        const reordered = updated.map((item, index) => ({
            ...item,
            sort_order: index + 1,
        }));

        setFeatures(reordered);
        setDraggedIndex(idx);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    if (isLoading) {
        return <PageLoader open={true} text="Loading plan features..." />;
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                        <Link href="/admin" className="hover:underline">Dashboard</Link>
                        <span>&gt;</span>
                        <Link href="/admin/website-builder" className="hover:underline">Website Builder</Link>
                        <span>&gt;</span>
                        <Link href="/admin/website-builder/pricing-plans" className="hover:underline">Pricing Plans</Link>
                        <span>&gt;</span>
                        <span className="font-semibold text-foreground">All Plans Include Features</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">All Plans Include Features</h1>
                    <p className="text-xs font-medium text-muted-foreground">
                        Manage the list of powerful features that are included in every pricing plan category.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild className="gap-2 font-bold">
                        <Link href="/pricing-plans" target="_blank">
                            <ExternalLink className="h-4 w-4" /> View Public Page
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={saveMutation.isPending}
                        className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                        <Save className="h-4 w-4" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Main Table Card (Matching Screenshot Image 3) */}
            <Card className="shadow-xs border-slate-200/80">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-extrabold text-foreground">
                                All Plans Include Powerful Features
                            </CardTitle>
                            <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100">
                                Visible on Pricing Page
                            </span>
                        </div>
                        <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                            Add and manage the features that will be included in every plan category.
                        </CardDescription>
                    </div>

                    <Button onClick={handleOpenAddModal} size="sm" className="gap-2 font-bold bg-primary text-primary-foreground shadow-2xs">
                        <Plus className="h-4 w-4" /> Add New Feature
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Matrix Comparison Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-700">
                                    <th className="py-3.5 pl-6 pr-4 font-bold uppercase tracking-wider text-[11px] w-[320px]">Features</th>
                                    {PLAN_TIERS.map((tier) => (
                                        <th key={tier.key} className="py-3.5 px-4 font-bold text-center text-[12px] min-w-[110px]">
                                            <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 font-extrabold border ${tier.color}`}>
                                                {tier.label}
                                            </span>
                                        </th>
                                    ))}
                                    <th className="py-3.5 pr-6 pl-4 font-bold text-right text-[11px] uppercase tracking-wider min-w-[100px]">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {features.map((feat, idx) => {
                                    const planMap = (feat.plan_values_json || {}) as Record<string, any>;

                                    return (
                                        <tr
                                            key={feat.id || idx}
                                            draggable
                                            onDragStart={() => handleDragStart(idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDragEnd={handleDragEnd}
                                            className={`transition-colors hover:bg-slate-50/80 group ${
                                                draggedIndex === idx ? 'opacity-50 bg-purple-50/50' : ''
                                            }`}
                                        >
                                            {/* Feature Title & Info */}
                                            <td className="py-4 pl-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="cursor-grab text-slate-300 transition-colors group-hover:text-slate-600">
                                                        <GripVertical className="h-4 w-4" />
                                                    </span>

                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-extrabold text-slate-900 text-[13px] truncate">
                                                            {feat.feature_name}
                                                        </span>

                                                        {feat.description && (
                                                            <div className="group/info relative flex items-center">
                                                                <Info className="h-3.5 w-3.5 text-slate-400 cursor-help hover:text-slate-600" />
                                                                <div className="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover/info:opacity-100 z-50 w-56 rounded-xl bg-slate-900 p-2.5 text-[11px] font-medium text-white shadow-xl">
                                                                    {feat.description}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tier Columns */}
                                            {PLAN_TIERS.map((tier) => {
                                                const val = planMap[tier.key];
                                                let isNotIncluded = false;
                                                let limitText = '';
                                                let isPartial = false;

                                                if (typeof val === 'object' && val !== null) {
                                                    isNotIncluded = Boolean(val.not_included);
                                                    limitText = String(val.limit || '').trim();
                                                } else if (typeof val === 'boolean') {
                                                    isNotIncluded = !val;
                                                } else if (typeof val === 'string') {
                                                    limitText = val.trim();
                                                }

                                                if (limitText.toLowerCase().includes('partial')) {
                                                    isPartial = true;
                                                }

                                                return (
                                                    <td key={tier.key} className="py-4 px-4 text-center align-middle font-semibold text-[12px]">
                                                        {isNotIncluded ? (
                                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-rose-500 bg-rose-50">
                                                                <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                                            </span>
                                                        ) : isPartial ? (
                                                            <span className="inline-flex items-center justify-center text-amber-600 bg-amber-50 rounded-md px-2 py-0.5 text-[11px] font-bold">
                                                                ⚡ Partial
                                                            </span>
                                                        ) : limitText && limitText.toLowerCase() !== 'unlimited' ? (
                                                            <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-extrabold text-slate-700">
                                                                {limitText}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 bg-emerald-50">
                                                                <Check className="h-4 w-4 stroke-[3]" />
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Action Buttons */}
                                            <td className="py-4 pr-6 pl-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(feat)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                                        title="Edit feature"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <RowTranslateButton
                                                        section="pricing-features"
                                                        recordId={Number(feat.id) || undefined}
                                                        rowLabel={feat.feature_name}
                                                        fields={[
                                                            { key: 'feature_name', label: 'Feature Name', value: feat.feature_name || '', required: true },
                                                            { key: 'description', label: 'Description', value: feat.description || '', type: 'textarea' },
                                                            // The table's CELL values ("Up to 50", "Limited") live per
                                                            // tier inside plan_values_json. The backend registers them
                                                            // as `limit_<tier>`, sorted by tier name — this must build
                                                            // the identical keys or the dialog edits nothing. A tier
                                                            // showing only a tick/cross has no text and is skipped.
                                                            ...Object.entries(feat.plan_values_json || {})
                                                                .map(([tier, cell]) => {
                                                                    const limit =
                                                                        typeof cell === 'string'
                                                                            ? cell
                                                                            : cell && typeof cell === 'object'
                                                                                ? String((cell as { limit?: string }).limit ?? '')
                                                                                : '';
                                                                    return { tier, limit: limit.trim() };
                                                                })
                                                                .filter((x) => x.limit)
                                                                .sort((a, b) => a.tier.localeCompare(b.tier))
                                                                .map((x) => ({
                                                                    key: `limit_${x.tier}`,
                                                                    label: `Limit — ${x.tier}`,
                                                                    value: x.limit,
                                                                })),
                                                        ]}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFeature(feat)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                                                        title="Delete feature"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Legend Bar (Matching Screenshot Image 3) */}
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 px-6">
                        <div className="flex flex-wrap items-center gap-6 text-[11.5px] font-semibold text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                </span>
                                Included
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="text-amber-500 font-extrabold">⚡</span>
                                Partially Included
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                                    <X className="h-3 w-3 stroke-[2.5]" />
                                </span>
                                Not Included
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">Text/Number</span>
                                = Limit
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400">
                                — Not Applicable
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add / Edit Feature Modal Dialog (Matching Screenshot Image 2) */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                        <DialogTitle className="text-lg font-black text-slate-900">
                            {editingFeature ? 'Edit Feature' : 'Add New Feature'}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium text-slate-500 mt-1">
                            Add a powerful feature that will be included in all pricing plan categories.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Section 1: Feature Information */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]">1</span>
                                Feature Information
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                        <label>Feature Title <span className="text-rose-500">*</span></label>
                                        <span className="text-[10px] text-slate-400">{title.length}/80</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Live Streaming"
                                        maxLength={80}
                                        className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    <p className="text-[10px] text-slate-400">Enter a clear and short title for this feature.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">Feature Icon</label>
                                    <button
                                        type="button"
                                        onClick={() => setIconPickerOpen(true)}
                                        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 transition bg-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                {icon ? (
                                                    <Icon icon={icon.includes(':') ? icon : `lucide:${icon.toLowerCase()}`} className="h-4 w-4" />
                                                ) : (
                                                    <Sparkles className="h-4 w-4" />
                                                )}
                                            </span>
                                            <span className="font-bold text-slate-800">{icon || 'Choose Icon'}</span>
                                        </div>
                                        <span className="text-[11px] font-extrabold text-primary hover:underline">Change Icon</span>
                                    </button>
                                    <p className="text-[10px] text-slate-400">Choose an icon that represents this feature.</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                    <label>Feature Description <span className="text-rose-500">*</span></label>
                                    <span className="text-[10px] text-slate-400">{description.length}/200</span>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe this feature and how it helps users..."
                                    maxLength={200}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                                <p className="text-[10px] text-slate-400">Briefly explain the feature and its benefits.</p>
                            </div>
                        </div>

                        {/* Section 2: Plan Availability & Limits */}
                        <div className="space-y-4 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]">2</span>
                                Plan Availability & Limits
                            </div>
                            <p className="text-[11px] text-slate-500">Set availability and limits for this feature across all plan categories.</p>

                            <div className="grid gap-3 sm:grid-cols-5">
                                {PLAN_TIERS.map((tier) => {
                                    const current = tierLimits[tier.key] || { not_included: false, limit: '' };

                                    return (
                                        <div key={tier.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-left">
                                            <span className={`block text-center font-extrabold text-xs py-1 rounded-md border ${tier.color}`}>
                                                {tier.label}
                                            </span>

                                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer pt-1">
                                                <Checkbox
                                                    checked={current.not_included}
                                                    onCheckedChange={(checked) =>
                                                        setTierLimits((prev) => ({
                                                            ...prev,
                                                            [tier.key]: { ...prev[tier.key], not_included: Boolean(checked) },
                                                        }))
                                                    }
                                                />
                                                Not Included
                                            </label>

                                            {!current.not_included && (
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-medium text-slate-500">Limit (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={current.limit}
                                                        onChange={(e) =>
                                                            setTierLimits((prev) => ({
                                                                ...prev,
                                                                [tier.key]: { ...prev[tier.key], limit: e.target.value },
                                                            }))
                                                        }
                                                        placeholder="e.g., 10, 50"
                                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium outline-none focus:border-primary"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                                ℹ️ Leave limit field empty if the feature is unlimited for the selected plan.
                            </p>
                        </div>

                        {/* Section 3: Status */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]">3</span>
                                Status
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-white">
                                <div>
                                    <h4 className="font-bold text-xs text-slate-900">Active</h4>
                                    <p className="text-[10px] text-slate-500">This feature will be visible on the pricing page and applied to all plans.</p>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 p-4 px-6 border-t border-slate-100 bg-slate-50/50">
                        <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveFeature}
                            disabled={createFeatureMutation.isPending || updateFeatureMutation.isPending}
                            className="bg-primary text-primary-foreground font-bold"
                        >
                            {createFeatureMutation.isPending || updateFeatureMutation.isPending ? 'Saving...' : 'Save Feature'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Icon Picker Dialog */}
            <IconPickerDialog
                open={iconPickerOpen}
                onOpenChange={setIconPickerOpen}
                onSelect={(val) => {
                    setIcon(val);
                    setIconPickerOpen(false);
                }}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmResetDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title="Delete Feature"
                description={`Are you sure you want to delete "${featureToDelete?.feature_name}"?`}
                confirmText="Delete"
            />
        </div>
    );
}
