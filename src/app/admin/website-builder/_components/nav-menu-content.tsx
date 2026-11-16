'use client';

import { useEffect, useState } from 'react';
import {
    Save,
    Loader2,
    Home,
    Users,
    FileText,
    MessageSquareQuote,
    X,
    HelpCircle,
    RotateCcw,
    Sparkles,
    LayoutGrid,
    HelpCircle as FaqIcon,
    Video,
    DollarSign,
    Layers,
    PhoneCall,
    Crop,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BuilderCountedInput } from './builder-field';
import { MultiSelectPages } from './multi-select-pages';
import { DraggableItemList, AddCustomLinkRow, type DraggableItemListItem, type ChildMenuItem } from './draggable-item-list';
import { RowTranslateButton } from './row-translate-dialog';
import { useCompanyBasicInformation, useCompanyMenuItems, useCompanyFooterSettings } from '@/hooks/useCompanyWebsiteBuilder';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { MediaCropDialog } from '@/components/common/media-crop-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';

const pageOptions = [
    { label: 'Home', value: 'home', icon: Home },
    { label: 'Features', value: 'features', icon: Sparkles },
    { label: 'Templates', value: 'templates', icon: Layers },
    { label: 'How It Works', value: 'how-it-works', icon: PhoneCall },
    { label: 'Pricing', value: 'pricing-plans', icon: DollarSign },
    { label: 'Testimonials', value: 'testimonials', icon: MessageSquareQuote },
    { label: 'Videos', value: 'video-tutorials', icon: Video },
    { label: 'FAQs', value: 'faqs', icon: FaqIcon },
    { label: 'Gallery', value: 'gallery', icon: LayoutGrid },
    { label: 'Contact Us', value: 'contact', icon: PhoneCall },
    { label: 'About Us', value: 'about-us', icon: Users },
    { label: 'Services', value: 'services', icon: FileText },
];

/** The public href for a menu row, defaulting from its page slug. */
function resolveMenuUrl(item: DraggableItemListItem) {
    const targetUrl = item.description;
    if (targetUrl && targetUrl !== `/${item.id}`) return targetUrl;
    if (item.id === 'home' || item.label.toLowerCase() === 'home') return '/';
    if (item.id === 'contact-us' || item.id === 'contact') return '/contact';
    if (item.id === 'pricing' || item.id === 'pricing-plans') return '/pricing-plans';
    if (item.id === 'videos' || item.id === 'video-tutorials') return '/video-tutorials';
    return `/${String(item.id).replace(/^\/+/, '')}`;
}

const initialSelectedPages = [
    'home',
    'features',
    'templates',
    'how-it-works',
    'pricing-plans',
    'gallery',
    'contact',
];

export function NavMenuContent() {
    const { data: basicInfo, save: saveBasic, isSaving: isSavingBasic } = useCompanyBasicInformation();
    const { data: footerData, save: saveFooter } = useCompanyFooterSettings();
    const {
        data: savedMenuItems = [],
        create: createMenuItem,
        update: updateMenuItem,
        remove: removeMenuItem,
        isSaving: isSavingItems,
    } = useCompanyMenuItems();

    const [logoUrl, setLogoUrl] = useState<string>('');
    const [companyName, setCompanyName] = useState('RA EVENTS');
    const [city, setCity] = useState('Melapalayam (Tirunelveli)');
    const [showLogin, setShowLogin] = useState(true);
    const [showSignIn, setShowSignIn] = useState(true);
    const [menuHeading, setMenuHeading] = useState('Nav Menu');
    const [selectedPages, setSelectedPages] = useState<string[]>(initialSelectedPages);

    // Cropper state for Company Logo
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('logo.png');
    const [selectedMimeType, setSelectedMimeType] = useState('image/png');
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const [menuItems, setMenuItems] = useState<DraggableItemListItem[]>([
        { id: 'home', label: 'Home', icon: Home, children: [] },
        { id: 'features', label: 'Features', icon: Sparkles, children: [] },
        { id: 'templates', label: 'Templates', icon: Layers, children: [] },
        { id: 'how-it-works', label: 'How It Works', icon: PhoneCall, children: [] },
        { id: 'pricing-plans', label: 'Pricing', icon: DollarSign, children: [] },
        { id: 'gallery', label: 'Gallery', icon: LayoutGrid, children: [] },
        { id: 'contact', label: 'Contact Us', icon: PhoneCall, children: [] },
    ]);

    useEffect(() => {
        if ((basicInfo && Object.keys(basicInfo).length > 0) || (footerData && Object.keys(footerData).length > 0)) {
            const logo = basicInfo?.logo_url || footerData?.logo_url || '';
            const name = basicInfo?.company_name || footerData?.company_name || 'RA EVENTS';
            setLogoUrl(logo);
            setCompanyName(name);
            if (basicInfo?.city) setCity(basicInfo.city);
            if (basicInfo?.show_login !== undefined) setShowLogin(Boolean(basicInfo.show_login));
            if (basicInfo?.show_signin !== undefined) setShowSignIn(Boolean(basicInfo.show_signin));
        }
    }, [basicInfo, footerData]);

    useEffect(() => {
        if (savedMenuItems && savedMenuItems.length > 0) {
            const items = savedMenuItems.map((item: any) => {
                const opt = pageOptions.find((p) => p.value === item.url?.replace(/^\/+/, '')) ||
                    pageOptions.find((p) => p.label.toLowerCase() === item.label.toLowerCase());
                return {
                    id: opt ? opt.value : String(item.id || item.label.toLowerCase().replace(/\s+/g, '-')),
                    // `id` above is overwritten with the page slug so the list can
                    // be matched against pageOptions, so the row id is carried
                    // separately — it is the slot every nav-menu translation is
                    // addressed by.
                    dbId: typeof item.id === 'number' ? item.id : Number(item.id) || undefined,
                    label: item.label,
                    icon: opt?.icon || FileText,
                    children: [],
                    description: item.url,
                };
            });
            setMenuItems(items);
            setSelectedPages(items.map((i) => i.id));
        }
    }, [savedMenuItems]);

    const isSaving = isSavingBasic || isSavingItems || isUploadingLogo;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size exceeds 10MB limit. Please choose a smaller image.');
            e.target.value = '';
            return;
        }

        setSelectedFileName(file.name);
        setSelectedMimeType(file.type || 'image/png');

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImageSrc(reader.result as string);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCroppedImage = async (croppedFile: File) => {
        setIsUploadingLogo(true);
        const tid = toast.loading('Uploading cropped company logo...');
        try {
            const res = await mediaApi.upload(croppedFile, 'website-builder');
            if (res?.url) {
                setLogoUrl(res.url);
                toast.success('Company logo cropped & uploaded successfully', { id: tid });
                setCropModalOpen(false);
            } else {
                toast.error('Failed to retrieve uploaded logo URL', { id: tid });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload logo', { id: tid });
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleRecropExisting = async (url: string) => {
        try {
            const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            setSelectedImageSrc(dataUrl);
            setSelectedFileName('logo.png');
            setSelectedMimeType(blob.type || 'image/png');
            setCropModalOpen(true);
        } catch {
            toast.error('Failed to load image for cropping');
        }
    };

    const handleReset = () => {
        setLogoUrl('');
        setCompanyName('RA EVENTS');
        setCity('Melapalayam (Tirunelveli)');
        setShowLogin(true);
        setShowSignIn(true);
        setMenuHeading('Nav Menu');
        setSelectedPages(initialSelectedPages);
        toast.info('Nav menu settings reset to defaults.');
    };

    const handleSelectedPagesChange = (newSelected: string[]) => {
        setSelectedPages(newSelected);

        const updatedMenuItems: DraggableItemListItem[] = [];

        newSelected.forEach((pageVal) => {
            const opt = pageOptions.find((p) => p.value === pageVal);
            const label = opt ? opt.label : pageVal;
            const existing = menuItems.find((m) => m.id === pageVal || m.label.toLowerCase() === label.toLowerCase());

            if (existing) {
                updatedMenuItems.push(existing);
            } else {
                let targetUrl = `/${pageVal}`;
                if (pageVal === 'home') targetUrl = '/';
                else if (pageVal === 'contact') targetUrl = '/contact';
                else if (pageVal === 'pricing-plans') targetUrl = '/pricing-plans';

                updatedMenuItems.push({
                    id: pageVal,
                    label,
                    icon: opt?.icon || FileText,
                    children: [],
                    description: targetUrl,
                });
            }
        });

        // Retain custom links
        menuItems.forEach((item) => {
            if (String(item.id).startsWith('custom-') && !updatedMenuItems.some((m) => m.id === item.id)) {
                updatedMenuItems.push(item);
            }
        });

        setMenuItems(updatedMenuItems);
    };

    const handleAddChild = (parentId: string | number, child: ChildMenuItem) => {
        setMenuItems((prev) =>
            prev.map((item) =>
                item.id === parentId
                    ? { ...item, children: [...(item.children ?? []), child] }
                    : item
            )
        );
        toast.success(`Child page added.`);
    };

    const handleDeleteChild = (parentId: string | number, childId: string) => {
        setMenuItems((prev) =>
            prev.map((item) =>
                item.id === parentId
                    ? { ...item, children: (item.children ?? []).filter((child) => child.id !== childId) }
                    : item
            )
        );
        toast.info(`Child page removed.`);
    };

    const handleAddCustomLink = (name: string, link: string) => {
        const newItem: DraggableItemListItem = {
            id: `custom-${Date.now()}`,
            label: name,
            icon: FileText,
            children: [],
            description: link || undefined,
        };

        setMenuItems((prev) => [...prev, newItem]);
        toast.success(`Custom menu link "${name}" added.`);
    };

    const handleDeleteMenuItem = (item: DraggableItemListItem) => {
        const nextItems = menuItems.filter((i) => i.id !== item.id);
        setMenuItems(nextItems);
        setSelectedPages(nextItems.map((i) => String(i.id)));
        toast.success(`Menu item "${item.label}" removed.`);
    };

    const handleSave = async () => {
        try {
            await saveBasic({
                logo_url: logoUrl,
                company_name: companyName,
                city,
                show_login: showLogin ? 1 : 0,
                show_signin: showSignIn ? 1 : 0,
            });

            await saveFooter({
                ...(footerData || {}),
                logo_url: logoUrl,
                company_name: companyName,
            });

            // Written per item, never through the bulk replace endpoint. That
            // endpoint DELETEs every row and re-INSERTs it, so ids change on
            // every save — and nav-menu translations are addressed by row id,
            // so a single Save Changes orphaned every translated menu label.
            const payloads = menuItems.map((item, idx) => ({
                dbId: item.dbId,
                label: item.label,
                url: resolveMenuUrl(item),
                sort_order: idx + 1,
                is_visible: 1,
                is_active: 1,
            }));

            const keptIds = new Set(payloads.map((p) => p.dbId).filter(Boolean));
            const removedRows = (savedMenuItems as any[]).filter((row) => row?.id && !keptIds.has(row.id));

            for (const row of removedRows) {
                await removeMenuItem(row.id);
            }
            for (const { dbId, ...payload } of payloads) {
                if (dbId) await updateMenuItem({ id: dbId, ...payload });
                else await createMenuItem(payload);
            }

            toast.success('Nav menu brand and ordering saved successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save nav menu settings');
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader open={isSaving} text="Saving Nav Menu Settings..." />
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Nav Menu Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage navigation brand logo, company name, city, buttons, and menu ordering.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure your site navigation links, logo, brand name, and page links.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Card 1: Nav Menu Brand */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold">Nav Menu Brand</CardTitle>
                    <CardDescription className="text-xs">
                        This logo, company name, and city will be used in the website navigation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[140px_minmax(0,1fr)]">
                        {/* Company Logo Box */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">COMPANY LOGO</label>
                            {logoUrl ? (
                                <div className="relative flex h-24 w-full items-center justify-center rounded-lg border bg-card overflow-hidden p-2 group">
                                    <img src={logoUrl} alt="Company Logo" className="h-full w-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => handleRecropExisting(logoUrl)}
                                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white text-slate-800 rounded shadow-xs hover:bg-slate-100 cursor-pointer"
                                            title="Crop image"
                                        >
                                            <Crop className="h-3 w-3" /> Crop
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLogoUrl('')}
                                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-rose-600 text-white rounded shadow-xs hover:bg-rose-700 cursor-pointer"
                                            title="Remove logo"
                                        >
                                            <X className="h-3 w-3" /> Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative flex flex-col items-center justify-center h-24 w-full rounded-lg border border-dashed bg-muted/20 hover:bg-muted/30 cursor-pointer p-2 text-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <span className="text-[11px] font-bold text-primary tracking-wide">Upload Logo</span>
                                    <span className="text-[9px] text-muted-foreground">Click or drag image to crop</span>
                                </div>
                            )}
                        </div>

                        {/* Grid: Company Name, Login, City, Get Started */}
                        <div className="grid content-start gap-3 sm:grid-cols-2">
                            <BuilderCountedInput
                                label="Company Name"
                                value={companyName}
                                onChange={setCompanyName}
                                maxLength={100}
                            />

                            <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
                                <div>
                                    <h4 className="font-semibold text-xs text-foreground">Login</h4>
                                    <p className="text-[10px] text-muted-foreground">
                                        Show or hide the Login button in the website navigation.
                                    </p>
                                </div>
                                <Switch checked={showLogin} onCheckedChange={setShowLogin} />
                            </div>

                            <BuilderCountedInput
                                label="City"
                                value={city}
                                onChange={setCity}
                                maxLength={100}
                                lockInput
                            />

                            <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
                                <div>
                                    <h4 className="font-semibold text-xs text-foreground">Get Started</h4>
                                    <p className="text-[10px] text-muted-foreground">
                                        Show or hide the Get Started button in the website navigation.
                                    </p>
                                </div>
                                <Switch checked={showSignIn} onCheckedChange={setShowSignIn} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Nav Menu Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold">Nav Menu Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <BuilderCountedInput
                        label="Nav Menu Heading"
                        value={menuHeading}
                        onChange={setMenuHeading}
                        maxLength={60}
                        lockInput
                    />

                    <p className="text-[10px] font-medium text-muted-foreground">
                        Select pages and UI blocks to display in the website navigation menu.
                    </p>

                    <MultiSelectPages
                        label="Select Pages"
                        value={selectedPages}
                        options={pageOptions}
                        onChange={handleSelectedPagesChange}
                        placeholder="Add page"
                    />
                </CardContent>
            </Card>

            {/* Card 3: Nav Menu Order */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold">Nav Menu Order</CardTitle>
                    <CardDescription className="text-xs">
                        Drag and drop to reorder • Click + on any item to add a child menu
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <DraggableItemList
                        items={menuItems}
                        pageOptions={pageOptions}
                        onReorder={setMenuItems}
                        onDelete={handleDeleteMenuItem}
                        onAddChild={handleAddChild}
                        onDeleteChild={handleDeleteChild}
                        // Row dialog rather than the `?lang=` form mode used by
                        // the singleton sections: every menu row is its own
                        // translation slot, and a URL round-trip would also
                        // discard any unsaved reordering.
                        renderActions={(item) =>
                            item.dbId ? (
                                <RowTranslateButton
                                    section="nav-menu"
                                    recordId={item.dbId}
                                    rowLabel={item.label}
                                    fields={[{ key: 'label', label: 'Menu Label', value: item.label, required: true }]}
                                />
                            ) : null
                        }
                    />

                    <AddCustomLinkRow onAdd={handleAddCustomLink} />
                </CardContent>
            </Card>

            <MediaCropDialog
                open={cropModalOpen}
                imageUrl={selectedImageSrc}
                fileName={selectedFileName}
                mimeType={selectedMimeType}
                onClose={() => setCropModalOpen(false)}
                onCropped={handleCroppedImage}
                isSaving={isUploadingLogo}
            />

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
