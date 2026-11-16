'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    GripVertical,
    Loader2,
    Save,
    ExternalLink,
    Upload,
    Check,
    X,
    Sparkles,
    Gift,
    Share2,
    QrCode,
    Sliders,
    Image as ImageIcon,
    Zap,
    Heart,
    Pencil,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react';
import {
    useHowItWorksData,
    useHowItWorksStepDetail,
    useCreateHowItWorksStep,
    useUpdateHowItWorksStep,
    useDeleteHowItWorksStep,
    useSaveHowItWorksSteps,
    useToggleHowItWorksStatus,
    type HowItWorksStep,
} from '@/hooks/useHowItWorks';
import { BuilderCountedInput, BuilderCountedTextarea } from '../_components/builder-field';
import { mediaApi } from '@/hooks/use-media';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { RowTranslateButton } from '../_components/row-translate-dialog';
import { PageLoader } from '@/components/common/page-loader';

const ICON_PRESETS = [
    { name: 'gift', Icon: Gift, label: 'Gift / Template' },
    { name: 'sparkles', Icon: Sparkles, label: 'Sparkles / Custom' },
    { name: 'share-2', Icon: Share2, label: 'Share' },
    { name: 'qr-code', Icon: QrCode, label: 'QR Code' },
    { name: 'sliders', Icon: Sliders, label: 'Sliders / App' },
    { name: 'image', Icon: ImageIcon, label: 'Image' },
    { name: 'zap', Icon: Zap, label: 'Fast / Instant' },
    { name: 'heart', Icon: Heart, label: 'Love' },
];

const PRESET_ILLUSTRATION = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80';

function getIconComponent(iconName?: string) {
    const found = ICON_PRESETS.find((i) => i.name === iconName);
    return found ? found.Icon : Gift;
}

export default function HowItWorksPage() {
    const { data: dbSteps, isLoading } = useHowItWorksData();
    const createMutation = useCreateHowItWorksStep();
    const updateMutation = useUpdateHowItWorksStep();
    const deleteMutation = useDeleteHowItWorksStep();
    const saveAllMutation = useSaveHowItWorksSteps();
    const toggleStatusMutation = useToggleHowItWorksStatus();

    const [steps, setSteps] = useState<HowItWorksStep[]>([]);
    const [selectedStepId, setSelectedStepId] = useState<string | number | null>(null);
    const { data: stepDetailData, isLoading: isDetailLoading } = useHowItWorksStepDetail(selectedStepId);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id?: string | number; idx?: number } | null>(null);
    const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
    const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);

    // Modal Form State (Single Image & Form inputs)
    const [modalIcon, setModalIcon] = useState('gift');
    const [modalIllustration, setModalIllustration] = useState(PRESET_ILLUSTRATION);
    const [modalTitle, setModalTitle] = useState('');
    const [modalDesc, setModalDesc] = useState('');
    const [modalHighlightTitle, setModalHighlightTitle] = useState('');
    const [modalHighlightSubtext, setModalHighlightSubtext] = useState('');
    const [modalStepOrder, setModalStepOrder] = useState('1');
    const [modalIsActive, setModalIsActive] = useState(true);

    const isSaving =
        saveAllMutation.isPending ||
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending ||
        toggleStatusMutation.isPending;

    // Load database steps into state
    useEffect(() => {
        if (dbSteps) {
            setSteps(dbSteps);
        }
    }, [dbSteps]);

    // Populate modal when step detail is fetched by ID
    useEffect(() => {
        if (stepDetailData && editModalOpen) {
            if (stepDetailData.title !== undefined) setModalTitle(stepDetailData.title);
            if (stepDetailData.description !== undefined) setModalDesc(stepDetailData.description);
            if (stepDetailData.highlight_title !== undefined) setModalHighlightTitle(stepDetailData.highlight_title || '');
            if (stepDetailData.highlight_subtext !== undefined) setModalHighlightSubtext(stepDetailData.highlight_subtext || '');
            if (stepDetailData.icon !== undefined) setModalIcon(stepDetailData.icon || 'gift');
            if (stepDetailData.illustration_url !== undefined) setModalIllustration(stepDetailData.illustration_url || PRESET_ILLUSTRATION);
            if (stepDetailData.step_number !== undefined) setModalStepOrder(String(stepDetailData.step_number));
            if (stepDetailData.is_active !== undefined) setModalIsActive(stepDetailData.is_active !== false);
        }
    }, [stepDetailData, editModalOpen]);
    const handleUpdateStepField = (idx: number, field: keyof HowItWorksStep, value: any) => {
        const target = steps[idx];
        setSteps((prev) =>
            prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
        );
        if (field === 'is_active' && target?.id) {
            toggleStatusMutation.mutate({ id: target.id, is_active: Boolean(value) });
        }
    };

    const [modalErrors, setModalErrors] = useState<{ title?: boolean; desc?: boolean; highlightTitle?: boolean; highlightSubtext?: boolean }>({});

    const validateModalFields = () => {
        const errs: typeof modalErrors = {};
        if (!modalTitle.trim()) errs.title = true;
        if (!modalDesc.trim()) errs.desc = true;
        if (!modalHighlightTitle.trim()) errs.highlightTitle = true;
        if (!modalHighlightSubtext.trim()) errs.highlightSubtext = true;

        if (Object.keys(errs).length > 0) {
            setModalErrors(errs);
            toast.error('Title, Description, Highlight Title, and Subtext are required.');
            return false;
        }
        setModalErrors({});
        return true;
    };

    const confirmDelete = () => {
        if (!pendingDelete) return;
        const { id, idx } = pendingDelete;
        if (id) {
            deleteMutation.mutate(id, {
                onSuccess: () => setPendingDelete(null),
            });
        } else if (idx !== undefined) {
            setSteps((prev) => prev.filter((_, i) => i !== idx));
            setPendingDelete(null);
        }
    };
    const handleSaveAll = () => {
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (!s.title?.trim() || !s.description?.trim() || !s.highlight_title?.trim() || !s.highlight_subtext?.trim()) {
                toast.error(`Step ${i + 1}: Title, Description, Highlight Title, and Subtext are required.`);
                return;
            }
        }
        saveAllMutation.mutate(steps);
    };

    const handleDeleteStep = (id?: number | string, idx?: number) => {
        if (id) {
            deleteMutation.mutate(id);
        } else if (idx !== undefined) {
            setSteps((prev) => prev.filter((_, i) => i !== idx));
        }
    };

    // Drag & Drop Reordering Handlers
    const handleDragStart = (e: React.DragEvent, idx: number) => {
        setDraggedStepIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIdx: number) => {
        e.preventDefault();
        if (draggedStepIdx === null || draggedStepIdx === targetIdx) return;

        const reordered = [...steps];
        const [moved] = reordered.splice(draggedStepIdx, 1);
        reordered.splice(targetIdx, 0, moved);

        const updated = reordered.map((item, index) => ({
            ...item,
            step_number: index + 1,
            sort_order: index + 1,
        }));

        setSteps(updated);
        setDraggedStepIdx(null);
        saveAllMutation.mutate(updated);
        toast.success('Steps reordered successfully!');
    };

    // Open Add Modal
    const handleOpenAddModal = () => {
        setEditingStepIdx(null);
        setSelectedStepId(null);
        setModalIcon('gift');
        setModalIllustration(PRESET_ILLUSTRATION);
        setModalTitle('');
        setModalDesc('');
        setModalHighlightTitle('');
        setModalHighlightSubtext('');
        setModalStepOrder(String(steps.length + 1));
        setModalIsActive(true);
        setModalErrors({});
        setAddModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEditModal = (idx: number) => {
        const target = steps[idx];
        if (!target) return;
        setEditingStepIdx(idx);
        setSelectedStepId(target.id ?? null);
        setModalIcon(target.icon || 'gift');
        setModalIllustration(target.illustration_url || PRESET_ILLUSTRATION);
        setModalTitle(target.title || '');
        setModalDesc(target.description || '');
        setModalHighlightTitle(target.highlight_title || '');
        setModalHighlightSubtext(target.highlight_subtext || '');
        setModalStepOrder(String(target.step_number || idx + 1));
        setModalIsActive(target.is_active !== false);
        setModalErrors({});
        setEditModalOpen(true);
    };

    // Save Add Modal Submit
    const handleAddStepSubmit = () => {
        if (!validateModalFields()) return;

        const newStep: HowItWorksStep = {
            step_number: parseInt(modalStepOrder, 10) || steps.length + 1,
            title: modalTitle,
            description: modalDesc,
            highlight_title: modalHighlightTitle,
            highlight_subtext: modalHighlightSubtext,
            icon: modalIcon,
            illustration_url: modalIllustration,
            is_active: modalIsActive,
            sort_order: parseInt(modalStepOrder, 10) || steps.length + 1,
        };

        createMutation.mutate(newStep, {
            onSuccess: () => {
                setAddModalOpen(false);
            },
        });
    };

    // Save Edit Modal Submit
    const handleEditStepSubmit = () => {
        if (editingStepIdx === null) return;
        if (!validateModalFields()) return;

        const target = steps[editingStepIdx];
        const updatedStep: HowItWorksStep = {
            ...target,
            step_number: parseInt(modalStepOrder, 10) || editingStepIdx + 1,
            title: modalTitle,
            description: modalDesc,
            highlight_title: modalHighlightTitle,
            highlight_subtext: modalHighlightSubtext,
            icon: modalIcon,
            illustration_url: modalIllustration,
            is_active: modalIsActive,
            sort_order: parseInt(modalStepOrder, 10) || editingStepIdx + 1,
        };

        const targetId = target?.id || selectedStepId;

        if (targetId) {
            updateMutation.mutate(
                { id: targetId, payload: updatedStep },
                {
                    onSuccess: () => {
                        setEditModalOpen(false);
                        setSelectedStepId(null);
                    },
                }
            );
        } else {
            setSteps((prev) => prev.map((s, i) => (i === editingStepIdx ? updatedStep : s)));
            setEditModalOpen(false);
            setSelectedStepId(null);
            toast.success('Step updated successfully!');
        }
    };

    const handleOpenIconPicker = (stepIdx: number | null) => {
        setEditingStepIdx(stepIdx);
        setIconPickerOpen(true);
    };

    const handleSelectIcon = (iconName: string) => {
        if (editingStepIdx !== null && !editModalOpen && !addModalOpen) {
            handleUpdateStepField(editingStepIdx, 'icon', iconName);
        } else {
            setModalIcon(iconName);
        }
        setIconPickerOpen(false);
    };

    // Handle File Upload for Single Image
    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCardRowIdx?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const tid = toast.loading('Uploading illustration...');
        try {
            const res = await mediaApi.upload(file, 'how-it-works');
            if (res?.url) {
                if (isCardRowIdx !== undefined) {
                    handleUpdateStepField(isCardRowIdx, 'illustration_url', res.url);
                } else {
                    setModalIllustration(res.url);
                }
                toast.success('Illustration uploaded successfully', { id: tid });
            } else {
                toast.error('Failed to retrieve uploaded image URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload illustration', { id: tid });
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 text-foreground relative">
            <PageLoader
                open={isSaving || isLoading}
                text={isLoading ? "Loading steps..." : "Saving Steps..."}
            />
            {/* Full Page Loading Overlay */}
            {isSaving && (
                <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm font-extrabold text-foreground">Saving How It Works...</p>
                        <p className="text-xs text-muted-foreground">Please wait while your changes are saved to the server.</p>
                    </div>
                </div>
            )}

            {/* Top Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        How Event Invit Works
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Configure the {steps.length} simple steps that explain how your platform works.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-9 px-3.5 text-xs font-semibold border-border gap-1.5 hover:bg-accent text-foreground"
                    >
                        Preview <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleOpenAddModal}
                        className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" /> Add Next Step
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 cursor-pointer"
                    >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save All Steps
                    </Button>
                </div>
            </div>

            {/* Step Rows List */}
            {isLoading ? (
                <div className="py-16 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading steps from database...
                </div>
            ) : steps.length > 0 ? (
                <div className="space-y-4">
                    {steps.map((item, idx) => {
                        const IconComp = getIconComponent(item.icon);
                        return (
                            <Card
                                key={item.id || idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, idx)}
                                className={cn(
                                    'relative border-border bg-card shadow-xs overflow-hidden transition-all duration-200 cursor-move hover:border-primary/40',
                                    draggedStepIdx === idx && 'opacity-40 border-dashed border-primary bg-primary/10'
                                )}
                            >
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex items-center gap-4">
                                        {/* Step Circle */}
                                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                                            {idx + 1}
                                        </div>

                                        {/* Main Row Content */}
                                        <div className="flex-1 flex flex-col md:flex-row items-center gap-4 lg:gap-6 min-w-0">
                                            {/* Column 1: Icon Box */}
                                            <div className="flex flex-col items-center justify-center text-center space-y-1 border-r border-border/50 pr-4 shrink-0 w-20">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Icon</span>
                                                <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
                                                    <Icon icon={item.icon?.includes(':') ? item.icon : `lucide:${item.icon || 'gift'}`} className="h-5 w-5" />
                                                </div>
                                                <span className="text-[10px] font-semibold text-muted-foreground capitalize truncate max-w-full">
                                                    {item.icon || 'gift'}
                                                </span>
                                            </div>

                                            {/* Column 2: Illustration Image */}
                                            <div className="flex flex-col items-center justify-center text-center space-y-1 border-r border-border/50 pr-4 shrink-0 w-28">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Illustration</span>
                                                <div className="h-14 w-24 rounded-xl border border-border overflow-hidden bg-muted/30 flex items-center justify-center shrink-0 shadow-xs">
                                                    {item.illustration_url ? (
                                                        <img src={item.illustration_url} alt="Illustration" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Column 3: Title & Description */}
                                            <div className="flex-1 space-y-1 min-w-0 pr-4">
                                                <h3 className="text-sm font-extrabold text-foreground truncate">
                                                    {item.title || <span className="italic text-muted-foreground">Untitled Step</span>}
                                                </h3>
                                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                                    {item.description || <span className="italic">No description provided.</span>}
                                                </p>
                                            </div>

                                            {/* Column 4: Highlights */}
                                            <div className="space-y-1 shrink-0 w-full md:w-64 lg:w-72">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Highlights</span>
                                                <div className="p-2.5 rounded-xl border border-border bg-muted/20 space-y-0.5">
                                                    <div className="text-xs font-bold text-foreground truncate">
                                                        {item.highlight_title || <span className="text-muted-foreground text-[11px] italic">No highlight title</span>}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {item.highlight_subtext || <span className="italic text-[10px]">No highlight subtext</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Action Icons Column */}
                                        <div className="flex flex-col items-end justify-between gap-3 border-l border-border/50 pl-3 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={item.is_active !== false ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                                                    {item.is_active !== false ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <Switch
                                                    checked={item.is_active !== false}
                                                    onCheckedChange={(val) => handleUpdateStepField(idx, 'is_active', val)}
                                                />
                                                <span title="Drag to reorder">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground/60 cursor-grab ml-1" />
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleOpenEditModal(idx)}
                                                    className="h-8 w-8 rounded-lg border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/10 cursor-pointer transition-all"
                                                    title="Edit Step Details"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <RowTranslateButton
                                                    section="how-it-works"
                                                    recordId={Number(item.id) || undefined}
                                                    rowLabel={item.title}
                                                    fields={[
                                                        { key: 'title', label: 'Title', value: item.title || '', required: true },
                                                        { key: 'description', label: 'Description', value: item.description || '', type: 'textarea', required: true },
                                                        { key: 'highlight_title', label: 'Highlight Title', value: item.highlight_title || '', required: true },
                                                        { key: 'highlight_subtext', label: 'Highlight Subtext', value: item.highlight_subtext || '', required: true },
                                                    ]}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setPendingDelete({ id: item.id, idx })}
                                                    className="h-8 w-8 rounded-lg text-rose-500 border-rose-200 hover:bg-rose-50 hover:border-rose-300 cursor-pointer transition-all"
                                                    title="Delete Step"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {/* Dynamic Theme Pagination Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-4 border-t border-border">
                        <span className="text-muted-foreground">You can reorder steps by dragging them up or down. Showing {steps.length} steps.</span>
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-border bg-card text-foreground cursor-pointer" disabled>
                                Previous
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 text-xs bg-primary text-primary-foreground border-primary font-bold shadow-xs">
                                1
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-border bg-card text-foreground cursor-pointer" disabled>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-16 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
                    No steps created yet. Click "Add Next Step" to create your first step.
                </div>
            )}

            {/* MODAL 1: ADD NEXT STEP DIALOG */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="max-w-2xl bg-card border-border text-foreground p-6 rounded-2xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold text-foreground">Add Next Step</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Add a new step to explain how Event Invit works.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Icon & Single Illustration Upload Top Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            {/* Icon Picker */}
                            <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                                <Label className="text-xs font-bold text-foreground">Icon</Label>
                                <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                    {(() => {
                                        const IconC = getIconComponent(modalIcon);
                                        return <IconC className="h-7 w-7" />;
                                    })()}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenIconPicker(null)}
                                    className="h-7 px-3 text-xs font-bold border-border bg-card hover:bg-accent cursor-pointer"
                                >
                                    Change Icon
                                </Button>
                                <span className="text-[10px] text-muted-foreground">Choose an icon that represents this step.</span>
                            </div>

                            {/* Single Image Upload Box */}
                            <div className="md:col-span-8 space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                                <Label className="text-xs font-bold text-foreground">Illustration Image</Label>
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-32 rounded-xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-xs">
                                        {modalIllustration ? (
                                            <img src={modalIllustration} alt="Illustration" className="h-full w-full object-cover" />
                                        ) : (
                                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer transition-all w-fit text-xs font-bold shadow-xs">
                                            <Upload className="h-4 w-4" />
                                            Upload Single Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleSingleFileUpload(e)}
                                            />
                                        </label>
                                        <p className="text-[10px] text-muted-foreground">
                                            Recommended size: 600×400px (PNG, JPG, WEBP).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BuilderCountedInput
                                label="Title"
                                required
                                placeholder="Enter step title"
                                value={modalTitle}
                                onChange={(val) => {
                                    setModalTitle(val);
                                    if (modalErrors.title && val.trim()) setModalErrors((e) => ({ ...e, title: false }));
                                }}
                                maxLength={60}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    modalErrors.title && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                            <BuilderCountedTextarea
                                label="Description"
                                required
                                placeholder="Describe this step in detail..."
                                value={modalDesc}
                                onChange={(val) => {
                                    setModalDesc(val);
                                    if (modalErrors.desc && val.trim()) setModalErrors((e) => ({ ...e, desc: false }));
                                }}
                                maxLength={200}
                                textareaClassName={cn(
                                    'min-h-[70px] text-xs border-border bg-card text-foreground',
                                    modalErrors.desc && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                        </div>

                        {/* Highlight Title & Subtext */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BuilderCountedInput
                                label="Highlight Title"
                                required
                                placeholder="Enter highlight title"
                                value={modalHighlightTitle}
                                onChange={(val) => {
                                    setModalHighlightTitle(val);
                                    if (modalErrors.highlightTitle && val.trim()) setModalErrors((e) => ({ ...e, highlightTitle: false }));
                                }}
                                maxLength={30}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    modalErrors.highlightTitle && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                            <BuilderCountedInput
                                label="Highlight Subtext"
                                required
                                placeholder="Enter highlight subtext"
                                value={modalHighlightSubtext}
                                onChange={(val) => {
                                    setModalHighlightSubtext(val);
                                    if (modalErrors.highlightSubtext && val.trim()) setModalErrors((e) => ({ ...e, highlightSubtext: false }));
                                }}
                                maxLength={30}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    modalErrors.highlightSubtext && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                        </div>

                        {/* Step Order & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-foreground">Step Order</Label>
                                <Input
                                    type="number"
                                    value={modalStepOrder}
                                    onChange={(e) => setModalStepOrder(e.target.value)}
                                    className="h-9 text-xs border-border bg-card text-foreground"
                                />
                                <span className="text-[10px] text-muted-foreground">This step will be placed as the last step.</span>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-foreground">Status</Label>
                                <div className="flex items-center gap-3 pt-1">
                                    <Switch checked={modalIsActive} onCheckedChange={setModalIsActive} />
                                    <span className="text-xs font-bold text-foreground">{modalIsActive ? 'Active' : 'Inactive'}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">Inactive steps will not be shown on the public page.</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setAddModalOpen(false)}
                            className="h-9 px-4 text-xs font-bold border-border text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddStepSubmit}
                            disabled={createMutation.isPending}
                            className="h-9 px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-2"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Adding...</span>
                                </>
                            ) : (
                                'Add Step'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: EDIT STEP DIALOG */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-2xl bg-card border-border text-foreground p-6 rounded-2xl shadow-xl">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                                    Edit Step {selectedStepId ? `#${selectedStepId}` : ''}
                                    {isDetailLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Update details and options for this step.
                                </DialogDescription>
                            </div>
                            {/* Same slot as the list row's translate button, so both
                                entry points write identical translations. The row
                                pattern is used here (rather than the ?lang= form
                                mode) because a URL round-trip would close this modal. */}
                            {selectedStepId ? (
                                <RowTranslateButton
                                    section="how-it-works"
                                    recordId={Number(selectedStepId) || undefined}
                                    rowLabel={modalTitle}
                                    fields={[
                                        { key: 'title', label: 'Title', value: modalTitle || '', required: true },
                                        { key: 'description', label: 'Description', value: modalDesc || '', type: 'textarea', required: true },
                                        { key: 'highlight_title', label: 'Highlight Title', value: modalHighlightTitle || '', required: true },
                                        { key: 'highlight_subtext', label: 'Highlight Subtext', value: modalHighlightSubtext || '', required: true },
                                    ]}
                                />
                            ) : null}
                        </div>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Icon & Single Illustration Upload Top Row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            {/* Icon Picker */}
                            <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                                <Label className="text-xs font-bold text-foreground">Icon</Label>
                                <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                    {(() => {
                                        const IconC = getIconComponent(modalIcon);
                                        return <IconC className="h-7 w-7" />;
                                    })()}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIconPickerOpen(true)}
                                    className="h-7 px-3 text-xs font-bold border-border bg-card hover:bg-accent cursor-pointer"
                                >
                                    Change Icon
                                </Button>
                                <span className="text-[10px] text-muted-foreground">Choose an icon for this step.</span>
                            </div>

                            {/* Single Image Upload Box */}
                            <div className="md:col-span-8 space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                                <Label className="text-xs font-bold text-foreground">Illustration Image</Label>
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-32 rounded-xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-xs">
                                        {modalIllustration ? (
                                            <img src={modalIllustration} alt="Illustration" className="h-full w-full object-cover" />
                                        ) : (
                                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary cursor-pointer transition-all w-fit text-xs font-bold shadow-xs">
                                            <Upload className="h-4 w-4" />
                                            Upload Single Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleSingleFileUpload(e)}
                                            />
                                        </label>
                                        <p className="text-[10px] text-muted-foreground">
                                            Recommended size: 600×400px (PNG, JPG, WEBP).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BuilderCountedInput
                                label="Title"
                                required
                                placeholder="Enter step title"
                                value={modalTitle}
                                onChange={(val) => {
                                    setModalTitle(val);
                                    if (modalErrors.title && val.trim()) setModalErrors((e) => ({ ...e, title: false }));
                                }}
                                maxLength={60}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    modalErrors.title && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                            <BuilderCountedTextarea
                                label="Description"
                                required
                                placeholder="Describe this step in detail..."
                                value={modalDesc}
                                onChange={(val) => {
                                    setModalDesc(val);
                                    if (modalErrors.desc && val.trim()) setModalErrors((e) => ({ ...e, desc: false }));
                                }}
                                maxLength={200}
                                textareaClassName={cn(
                                    'min-h-[70px] text-xs border-border bg-card text-foreground',
                                    modalErrors.desc && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                        </div>

                        {/* Highlight Title & Subtext */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BuilderCountedInput
                                label="Highlight Title"
                                required
                                placeholder="Enter highlight title"
                                value={modalHighlightTitle}
                                onChange={(val) => {
                                    setModalHighlightTitle(val);
                                    if (modalErrors.highlightTitle && val.trim()) setModalErrors((e) => ({ ...e, highlightTitle: false }));
                                }}
                                maxLength={30}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    modalErrors.highlightTitle && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                            <BuilderCountedInput
                                label="Highlight Subtext"
                                required
                                placeholder="Enter highlight subtext"
                                value={modalHighlightSubtext}
                                onChange={(val) => {
                                    setModalHighlightSubtext(val);
                                    if (modalErrors.highlightSubtext && val.trim()) setModalErrors((e) => ({ ...e, highlightSubtext: false }));
                                }}
                                maxLength={30}
                                inputClassName={cn(
                                    '!h-9 text-xs border-border bg-card text-foreground',
                                    modalErrors.highlightSubtext && 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                                )}
                            />
                        </div>

                        {/* Step Order & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-foreground">Step Order</Label>
                                <Input
                                    type="number"
                                    value={modalStepOrder}
                                    onChange={(e) => setModalStepOrder(e.target.value)}
                                    className="h-9 text-xs border-border bg-card text-foreground"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-foreground">Status</Label>
                                <div className="flex items-center gap-3 pt-1">
                                    <Switch checked={modalIsActive} onCheckedChange={setModalIsActive} />
                                    <span className="text-xs font-bold text-foreground">{modalIsActive ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditModalOpen(false)}
                            className="h-9 px-4 text-xs font-bold border-border text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditStepSubmit}
                            disabled={updateMutation.isPending}
                            className="h-9 px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-2"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: ICON PICKER DIALOG */}
            <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <DialogContent className="max-w-md bg-card border-border text-foreground p-5 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground">Select Icon</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-3 py-3">
                        {ICON_PRESETS.map(({ name, Icon, label }) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => handleSelectIcon(name)}
                                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary transition-all cursor-pointer space-y-1"
                            >
                                <Icon className="h-6 w-6 text-primary" />
                                <span className="text-[10px] font-semibold text-muted-foreground truncate w-full text-center">{label}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: PUBLIC OUTPUT / PREVIEW MODAL */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl bg-gradient-to-b from-slate-50 to-white text-slate-900 p-8 rounded-3xl shadow-2xl border-none">
                    <div className="text-center space-y-1.5 max-w-xl mx-auto mb-8">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                            WORKING PROCESS
                        </span>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900">
                            How Event Invit Works
                        </h2>
                        <div className="h-1 w-12 bg-primary rounded-full mx-auto my-2" />
                        <p className="text-xs text-slate-500 font-medium">
                            Create your event app in {steps.filter((s) => s.is_active !== false).length} simple steps
                        </p>
                    </div>

                    {/* Step Cards with Connected Flow */}
                    <div className="space-y-4 relative">
                        {steps
                            .filter((s) => s.is_active !== false)
                            .map((item, idx) => {
                                const IconComp = getIconComponent(item.icon);
                                return (
                                    <div key={item.id || idx} className="flex items-center gap-4 relative">
                                        {/* Step Circle */}
                                        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-sm shadow-md shrink-0 z-10">
                                            {idx + 1}
                                        </div>

                                        {/* White Step Card */}
                                        <div className="flex-1 rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-6">
                                            {/* Left: Illustration */}
                                            <div className="h-20 w-36 rounded-xl overflow-hidden bg-slate-100 shrink-0 shadow-xs">
                                                {item.illustration_url ? (
                                                    <img src={item.illustration_url} alt="Step Illustration" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                                                        <ImageIcon className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Middle: Title & Description */}
                                            <div className="flex-1 space-y-1 text-left">
                                                <h3 className="text-base font-extrabold text-slate-900">
                                                    {item.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                                    {item.description}
                                                </p>
                                            </div>

                                            {/* Right: Icon + Highlight Text */}
                                            {item.highlight_title ? (
                                                <div className="flex items-center gap-3 border-l border-slate-100 pl-5 shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                                                        <IconComp className="h-5 w-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-xs font-black text-slate-900">{item.highlight_title}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{item.highlight_subtext}</div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </DialogContent>
            </Dialog>

            <DeleteDialog
    open={pendingDelete !== null}
    onOpenChange={(open) => !open && setPendingDelete(null)}
    onConfirm={confirmDelete}
    isDeleting={deleteMutation.isPending}
    title="Delete How It Works"
    description="Are you sure you want to delete this How it Works? This action cannot be undone."
/>
        </div>
    );
}
