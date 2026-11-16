'use client';

import { useState, useEffect } from 'react';
import {
    Save,
    ArrowLeft,
    Plus,
    Trash2,
    Check,
    X,
    GripVertical,
    Upload,
    Monitor,
    Smartphone,
    Loader2,
    Calendar,
    MapPin,
    Users,
    Image as ImageIcon,
    MessageSquare,
    Gift,
    Video,
    Music,
    Heart,
    Bell,
    Scan,
    QrCode,
    Sparkles,
    ArrowRight,
    Pencil,
    Search,
    CheckCircle2,
    Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
    useFeaturesData,
    useSaveFeaturesList,
    useDeleteFeature,
    type FeatureItem,
} from '@/hooks/useFeatures';
import {
    BuilderCountedInput,
    BuilderCountedTextarea,
} from './builder-field';
import { RowTranslateButton } from './row-translate-dialog';
import { PageLoader } from '@/components/common/page-loader';

const ICON_PRESETS = [
    { name: 'calendar', Icon: Calendar, label: 'Calendar' },
    { name: 'map-pin', Icon: MapPin, label: 'Location' },
    { name: 'users', Icon: Users, label: 'Guests' },
    { name: 'image', Icon: ImageIcon, label: 'Gallery' },
    { name: 'message', Icon: MessageSquare, label: 'Message' },
    { name: 'gift', Icon: Gift, label: 'Gift' },
    { name: 'video', Icon: Video, label: 'Video' },
    { name: 'music', Icon: Music, label: 'Music' },
    { name: 'heart', Icon: Heart, label: 'Love' },
    { name: 'bell', Icon: Bell, label: 'Alert' },
    { name: 'scan', Icon: Scan, label: 'Scan' },
    { name: 'qr-code', Icon: QrCode, label: 'QR Code' },
];

function getIconComponent(iconName?: string) {
    const found = ICON_PRESETS.find((i) => i.name === iconName);
    return found ? found.Icon : Calendar;
}

export function FeaturesBuilderContent() {
    const { data: dbFeatures, isLoading: isFeaturesLoading } = useFeaturesData();
    const saveFeaturesMutation = useSaveFeaturesList();
    const deleteFeatureMutation = useDeleteFeature();

    const [viewMode, setViewMode] = useState<'table' | 'form'>('table');
    const [features, setFeatures] = useState<FeatureItem[]>([]);
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    // Dynamic Form State
    const [selectedIcon, setSelectedIcon] = useState('calendar');
    const [title, setTitle] = useState('');
    const [shortDesc, setShortDesc] = useState('');
    const [detailedDesc, setDetailedDesc] = useState('');
    const [bullets, setBullets] = useState<string[]>([]);
    const [newBulletText, setNewBulletText] = useState('');
    const [showInMenu, setShowInMenu] = useState(true);
    const [menuOrder, setMenuOrder] = useState('1');
    const [status, setStatus] = useState<'Active' | 'Inactive' | 'Draft'>('Active');
    const [customIconUrl, setCustomIconUrl] = useState('');
    const [featureImageUrl, setFeatureImageUrl] = useState('');

    const isSaving = saveFeaturesMutation.isPending;
    const [previewOpen, setPreviewOpen] = useState(false);

    // Load database features dynamically when query succeeds
    useEffect(() => {
        if (dbFeatures) {
            setFeatures(dbFeatures);
        }
    }, [dbFeatures]);

    const handleCreateNew = () => {
        setEditingId(null);
        setTitle('');
        setShortDesc('');
        setDetailedDesc('');
        setSelectedIcon('calendar');
        setBullets([]);
        setShowInMenu(true);
        setMenuOrder(String((features.length || 0) + 1));
        setStatus('Active');
        setCustomIconUrl('');
        setFeatureImageUrl('');
        setViewMode('form');
    };

    const handleEditFeature = (item: FeatureItem) => {
        setEditingId(item.id || null);
        setTitle(item.title);
        setShortDesc(item.short_description);
        setDetailedDesc(item.detailed_description || '');
        setSelectedIcon(item.icon || 'calendar');
        setBullets(item.bullet_points_json || []);
        setShowInMenu(item.show_in_menu !== false);
        setMenuOrder(String(item.menu_order || 1));
        setStatus(item.status || 'Active');
        setCustomIconUrl(item.custom_icon_url || '');
        setFeatureImageUrl(item.feature_image_url || '');
        setViewMode('form');
    };

    const handleDeleteFeature = (id?: string | number) => {
        if (!id) return;
        deleteFeatureMutation.mutate(id, {
            onSuccess: () => {
                setFeatures((prev) => prev.filter((f) => f.id !== id));
            },
        });
    };

    const handleAddBullet = () => {
        if (!newBulletText.trim()) return;
        setBullets((prev) => [...prev, newBulletText.trim()]);
        setNewBulletText('');
    };

    const handleRemoveBullet = (idx: number) => {
        setBullets((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSaveCurrentFeature = () => {
        if (!title.trim()) {
            toast.error('Feature title is required.');
            return;
        }

        const updatedItem: FeatureItem = {
            id: editingId || undefined,
            title,
            short_description: shortDesc,
            detailed_description: detailedDesc,
            icon: selectedIcon,
            custom_icon_url: customIconUrl,
            feature_image_url: featureImageUrl,
            bullet_points_json: bullets,
            show_in_menu: showInMenu,
            menu_order: parseInt(menuOrder, 10) || 1,
            status,
        };

        let updatedList: FeatureItem[];
        if (editingId) {
            updatedList = features.map((f) => (f.id === editingId ? { ...f, ...updatedItem } : f));
        } else {
            updatedList = [...features, updatedItem];
        }

        setFeatures(updatedList);
        saveFeaturesMutation.mutate(updatedList, {
            onSuccess: () => {
                setViewMode('table');
            },
        });
    };

    const filteredFeatures = features.filter(
        (f) =>
            f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.short_description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const CurrentIconComponent = getIconComponent(selectedIcon);

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-12">
            <PageLoader open={isSaving} text="Saving Features..." />
            {/* Top Header Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                        {viewMode === 'form' ? (editingId ? 'Edit Feature' : 'Add New Feature') : 'Features Builder'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {viewMode === 'form'
                            ? 'Configure feature options, detailed descriptions, and live card preview.'
                            : 'Manage interactive feature highlights and key benefits shown on your website.'}
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
                    {viewMode === 'form' ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="h-8 px-3 text-xs font-semibold border-border gap-1"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to Table List
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveCurrentFeature}
                                disabled={isSaving}
                                className="h-8 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save Feature
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                onClick={handleCreateNew}
                                className="h-8 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Feature
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => saveFeaturesMutation.mutate(features)}
                                disabled={isSaving}
                                className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save All Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* PAGE 1: FEATURES MANAGEMENT DATA TABLE VIEW */}
            {viewMode === 'table' ? (
                <Card className="shadow-xs border-border bg-card">
                    <CardHeader className="py-3 px-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40">
                        <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wide">
                            Features List ({filteredFeatures.length})
                        </CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search features..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 text-xs border-border bg-card text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                                    <tr>
                                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                                        <th className="py-2.5 px-3 w-16 text-center">Icon</th>
                                        <th className="py-2.5 px-3">Feature Title</th>
                                        <th className="py-2.5 px-3">Short Description</th>
                                        <th className="py-2.5 px-3 text-center">Show in Menu</th>
                                        <th className="py-2.5 px-3 text-center">Menu Order</th>
                                        <th className="py-2.5 px-3 text-center">Status</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {isFeaturesLoading ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                                                Loading features from database...
                                            </td>
                                        </tr>
                                    ) : filteredFeatures.length > 0 ? (
                                        filteredFeatures.map((item, idx) => {
                                            const IconComp = getIconComponent(item.icon);
                                            return (
                                                <tr key={item.id || idx} className="hover:bg-muted/40 transition-colors">
                                                    <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                            <span>{idx + 1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                                                            <IconComp className="h-4 w-4" />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 font-semibold text-foreground">
                                                        {item.title}
                                                    </td>
                                                    <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                                                        {item.short_description}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <div className="flex items-center justify-center">
                                                            <Switch
                                                                checked={item.show_in_menu !== false}
                                                                onCheckedChange={(val) => {
                                                                    setFeatures(
                                                                        features.map((f) =>
                                                                            f.id === item.id ? { ...f, show_in_menu: val } : f
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-semibold text-foreground">
                                                        {item.menu_order || idx + 1}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span
                                                            className={cn(
                                                                'px-2 py-0.5 text-[10px] font-bold rounded-full border inline-block',
                                                                item.status === 'Active'
                                                                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                                                    : 'bg-muted text-muted-foreground border-border'
                                                            )}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleEditFeature(item)}
                                                                className="h-8 w-8 rounded-lg p-0 border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <RowTranslateButton
                                                                section="features"
                                                                recordId={Number(item.id) || undefined}
                                                                rowLabel={item.title}
                                                                fields={[
                                                                    { key: 'title', label: 'Title', value: item.title },
                                                                    { key: 'short_description', label: 'Short Description', value: item.short_description, type: 'textarea' },
                                                                    { key: 'detailed_description', label: 'Detailed Description', value: item.detailed_description || '', type: 'textarea' },
                                                                ]}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleDeleteFeature(item.id)}
                                                                className="h-8 w-8 rounded-lg p-0 text-rose-500 border-rose-200 hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                                                No features found. Click "Add Feature" to create one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/40 text-xs text-muted-foreground">
                            <span>Showing {filteredFeatures.length} of {features.length} features</span>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs bg-primary text-primary-foreground border-primary">
                                    1
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* PAGE 2: ADD / EDIT FEATURE FORM PAGE */
                <div className="space-y-6">
                    {/* Form Section Cards (12 cols) */}
                    <div className="space-y-6">
                        {/* Section 1: Basic Information */}
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                                <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                    1
                                </div>
                                <div className="text-left">
                                    <CardTitle className="text-sm font-bold text-foreground">Basic Information</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Select icon, title, and short summary</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">
                                        Feature Icon <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {ICON_PRESETS.map(({ name, Icon }) => (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => setSelectedIcon(name)}
                                                className={cn(
                                                    'flex h-12 items-center justify-center rounded-xl border p-2 transition-all cursor-pointer',
                                                    selectedIcon === name
                                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 text-primary'
                                                        : 'border-border bg-card hover:bg-accent text-muted-foreground'
                                                )}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">
                                        Feature Title <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g. Real-Time Agenda Builder"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="h-9 text-xs border-border bg-card text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">
                                        Short Description <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        placeholder="Briefly explain what this feature does..."
                                        rows={3}
                                        value={shortDesc}
                                        onChange={(e) => setShortDesc(e.target.value)}
                                        className="text-xs border-border bg-card text-foreground"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: Detailed Content */}
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                                <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                    2
                                </div>
                                <div className="text-left">
                                    <CardTitle className="text-sm font-bold text-foreground">Detailed Content</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Comprehensive overview and feature bullet points</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">Detailed Overview</Label>
                                    <Textarea
                                        placeholder="Add in-depth details about this feature..."
                                        rows={4}
                                        value={detailedDesc}
                                        onChange={(e) => setDetailedDesc(e.target.value)}
                                        className="text-xs border-border bg-card text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">Key Highlights (Bullet Points)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add a key highlight point..."
                                            value={newBulletText}
                                            onChange={(e) => setNewBulletText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddBullet();
                                                }
                                            }}
                                            className="h-9 text-xs border-border bg-card text-foreground"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleAddBullet}
                                            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground"
                                        >
                                            <Plus className="h-4 w-4" /> Add
                                        </Button>
                                    </div>

                                    {bullets.length > 0 ? (
                                        <div className="space-y-2 pt-2">
                                            {bullets.map((bullet, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-foreground"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                        {bullet}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBullet(idx)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 3 & 4: Display & Navigation */}
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="py-3.5 px-4 border-b border-border flex flex-row items-center gap-3">
                                <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                                    3
                                </div>
                                <div className="text-left">
                                    <CardTitle className="text-sm font-bold text-foreground">Display & Navigation Settings</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground font-medium">Controls visibility and menu order</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center justify-between rounded-xl border border-border p-3 bg-muted/20">
                                        <div>
                                            <span className="text-xs font-bold text-foreground">Show in Submenu</span>
                                            <p className="text-[10px] text-muted-foreground">List under Features dropdown</p>
                                        </div>
                                        <Switch checked={showInMenu} onCheckedChange={setShowInMenu} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-foreground">
                                            Menu Order <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            value={menuOrder}
                                            onChange={(e) => setMenuOrder(e.target.value)}
                                            className="h-9 text-xs border-border bg-card text-foreground"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-foreground">
                                            Status <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            {(['Active', 'Inactive'] as const).map((st) => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setStatus(st)}
                                                    className={cn(
                                                        'flex-1 rounded-lg border p-2 text-xs font-semibold transition-all cursor-pointer',
                                                        status === st
                                                            ? 'border-primary bg-primary/10 text-primary font-bold'
                                                            : 'border-border bg-card text-muted-foreground hover:bg-accent'
                                                    )}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Live Feature Card Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-xl border-border bg-card">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <DialogTitle className="text-sm font-bold text-foreground">Live Feature Card Preview</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                            This is how the feature card will look to visitors on your site.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 flex flex-col items-center justify-center bg-muted/10 rounded-xl">
                        <div className="flex items-center border border-border rounded-lg p-0.5 bg-card mb-4 self-end">
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('desktop')}
                                className={cn(
                                    'p-1 rounded-md text-xs transition-colors cursor-pointer',
                                    previewDevice === 'desktop'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Monitor className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('mobile')}
                                className={cn(
                                    'p-1 rounded-md text-xs transition-colors cursor-pointer',
                                    previewDevice === 'mobile'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Smartphone className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div
                            className={cn(
                                'transition-all duration-300 w-full',
                                previewDevice === 'mobile' ? 'max-w-[320px]' : 'max-w-full'
                            )}
                        >
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shadow-md">
                                        <CurrentIconComponent className="h-6 w-6 text-white" />
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                                        {status}
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-base font-extrabold text-foreground tracking-tight">
                                        {title || 'Feature Title'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {shortDesc || 'Feature short description explaining key benefits for event organizers.'}
                                    </p>
                                </div>

                                {detailedDesc ? (
                                    <p className="text-[11px] text-muted-foreground/90 bg-muted/40 p-2.5 rounded-xl border border-border">
                                        {detailedDesc}
                                    </p>
                                ) : null}

                                {bullets.length > 0 ? (
                                    <ul className="space-y-1.5 pt-1">
                                        {bullets.map((bullet, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                <span>{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}