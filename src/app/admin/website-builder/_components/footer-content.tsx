'use client';

import { useEffect, useState, useRef } from 'react';
import { Save, Sparkles, Trash2, Phone, Mail, MapPin, Monitor, Smartphone, Lock, HelpCircle, RotateCcw, Loader2, Eye, Crop } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BuilderCountedInput, BuilderCountedTextarea } from './builder-field';
import { MultiSelectPages } from './multi-select-pages';
import { useCompanyFooterSettings, useCompanyBasicInformation } from '@/hooks/useCompanyWebsiteBuilder';
import { mediaApi } from '@/hooks/use-media';
import { PageLoader } from '@/components/common/page-loader';
import { MediaCropDialog } from '@/components/common/media-crop-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';
import { useSectionTranslation } from '@/hooks/useSectionTranslation';
import { useSaveContentTranslations } from '@/hooks/useWebsiteBuilderTranslations';
import { TranslationSideCard } from './translation-side-card';
import { TranslationModeBanner } from './translation-mode-banner';
import { cn } from '@/lib/utils';

type ContactType = 'default' | 'alternative';
type PreviewDevice = 'desktop' | 'mobile';

interface ContactBlock {
    mobile: string;
    email: string;
    address: string;
}

const initialDefaultContact: ContactBlock = {
    mobile: '9884699435',
    email: 'eventcraftf@gmail.com',
    address: '100 Celebration Way, Suite 400, New York, NY 10001',
};

const initialSelectedPages = [
    'about-us',
    'services',
    'events',
    'terms-conditions',
    'privacy-policy',
];

export function FooterContent() {
    const { data: footerData, isLoading, save, isSaving: isSavingFooter } = useCompanyFooterSettings();
    const { data: basicInfo, save: saveBasic } = useCompanyBasicInformation();
    const [previewOpen, setPreviewOpen] = useState(false);

    const [companyLogo, setCompanyLogo] = useState('');
    const [companyName, setCompanyName] = useState('RA EVENTS');
    const [shortDescription, setShortDescription] = useState('Full-service event management, wedding planning, corporate galas, and customized decor packages tailored to your special occasions.');
    const [contactType, setContactType] = useState<ContactType>('default');
    
    const [defaultContact, setDefaultContact] = useState<ContactBlock>(initialDefaultContact);

    const [alternativeContact, setAlternativeContact] = useState<ContactBlock>({
        mobile: '9876543210',
        email: 'alt.eventcraft@gmail.com',
        address: '200 Platinum Tower, Tirunelveli',
    });

    const [topListHeading, setTopListHeading] = useState('Quick Links');
    const [selectedPages, setSelectedPages] = useState<string[]>(initialSelectedPages);
    const [showQuickLinks1, setShowQuickLinks1] = useState(true);
    const [topListHeading2, setTopListHeading2] = useState('Company');
    const [selectedPages2, setSelectedPages2] = useState<string[]>(['about-us', 'services', 'terms-conditions', 'privacy-policy']);
    const [showQuickLinks2, setShowQuickLinks2] = useState(true);
    const [newsletterEnabled, setNewsletterEnabled] = useState(true);
    const [showSocialLinks, setShowSocialLinks] = useState(true);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Cropper state for Footer Logo
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('footer-logo.png');
    const [selectedMimeType, setSelectedMimeType] = useState('image/png');
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const isSaving = isSavingFooter || isUploadingLogo;

    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        if ((footerData && Object.keys(footerData).length > 0) || (basicInfo && Object.keys(basicInfo).length > 0)) {
            const logo = footerData?.logo_url || basicInfo?.logo_url || '';
            const name = footerData?.company_name || basicInfo?.company_name || 'RA EVENTS';
            setCompanyLogo(logo);
            setCompanyName(name);
            if (footerData?.description) setShortDescription(footerData.description);
            if (footerData?.contact_type) setContactType(footerData.contact_type as ContactType);
            if (footerData?.mobile || basicInfo?.mobile) setDefaultContact((prev) => ({ ...prev, mobile: footerData?.mobile || basicInfo?.mobile || '' }));
            if (footerData?.email || basicInfo?.email) setDefaultContact((prev) => ({ ...prev, email: footerData?.email || basicInfo?.email || '' }));
            if (footerData?.address) setDefaultContact((prev) => ({ ...prev, address: footerData.address || '' }));
            if (footerData?.top_list_heading) setTopListHeading(footerData.top_list_heading);
            if (footerData?.top_list_heading_2) setTopListHeading2(footerData.top_list_heading_2);
            if (footerData?.show_quick_links_1 !== undefined) setShowQuickLinks1(Boolean(footerData.show_quick_links_1));
            if (footerData?.show_quick_links_2 !== undefined) setShowQuickLinks2(Boolean(footerData.show_quick_links_2));
            if (footerData?.show_newsletter !== undefined) setNewsletterEnabled(Boolean(footerData.show_newsletter));
            if (footerData?.show_social_links !== undefined) setShowSocialLinks(Boolean(footerData.show_social_links));
            if (footerData?.quick_links_json) {
                if (Array.isArray(footerData.quick_links_json)) {
                    setSelectedPages(footerData.quick_links_json);
                } else if (typeof footerData.quick_links_json === 'string') {
                    try { setSelectedPages(JSON.parse(footerData.quick_links_json)); } catch {}
                }
            }
            if (footerData?.quick_links_2_json) {
                if (Array.isArray(footerData.quick_links_2_json)) {
                    setSelectedPages2(footerData.quick_links_2_json);
                } else if (typeof footerData.quick_links_2_json === 'string') {
                    try { setSelectedPages2(JSON.parse(footerData.quick_links_2_json)); } catch {}
                }
            }
            if (footerData || basicInfo) {
                loadedRef.current = true;
            }
        }
    }, [footerData, basicInfo]);

    const activeContact = contactType === 'alternative' ? alternativeContact : defaultContact;

    const pageOptions = [
        { label: 'About Us', value: 'about-us' },
        { label: 'Services', value: 'services' },
        { label: 'Events & Packages', value: 'events' },
        { label: 'Terms & Conditions', value: 'terms-conditions' },
        { label: 'Privacy Policy', value: 'privacy-policy' },
        { label: 'Contact Us', value: 'contact-us' },
    ];

    const copyright = '© 2026 RA Events. All rights reserved.';
    const poweredBy = 'Powered by EventCraft Website Builder';

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
        const tid = toast.loading('Uploading cropped footer logo...');
        try {
            const res = await mediaApi.upload(croppedFile, 'website-builder');
            if (res?.url) {
                setCompanyLogo(res.url);
                toast.success('Footer logo cropped & uploaded successfully', { id: tid });
                setCropModalOpen(false);
            } else {
                toast.error('Failed to retrieve uploaded image URL', { id: tid });
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
            setSelectedFileName('footer-logo.png');
            setSelectedMimeType(blob.type || 'image/png');
            setCropModalOpen(true);
        } catch {
            toast.error('Failed to load image for cropping');
        }
    };

    const quickLinkLabels = selectedPages
        .map((val) => pageOptions.find((opt) => opt.value === val)?.label)
        .filter((lbl): lbl is string => Boolean(lbl));

    const updateActiveContact = (patch: Partial<ContactBlock>) => {
        if (contactType === 'alternative') {
            setAlternativeContact((prev) => ({ ...prev, ...patch }));
        } else {
            setDefaultContact((prev) => ({ ...prev, ...patch }));
        }
    };

    const handleReset = () => {
        const logo = footerData?.logo_url || basicInfo?.logo_url || '';
        const name = footerData?.company_name || basicInfo?.company_name || 'RA EVENTS';
        setCompanyLogo(logo);
        setCompanyName(name);
        setShortDescription(footerData?.description || 'Full-service event management, wedding planning, corporate galas, and customized decor packages tailored to your special occasions.');
        setContactType((footerData?.contact_type as ContactType) || 'default');
        setDefaultContact({
            mobile: footerData?.mobile || basicInfo?.mobile || initialDefaultContact.mobile,
            email: footerData?.email || basicInfo?.email || initialDefaultContact.email,
            address: footerData?.address || initialDefaultContact.address,
        });
        setAlternativeContact({
            mobile: '9876543210',
            email: 'alt.eventcraft@gmail.com',
            address: '200 Platinum Tower, Tirunelveli',
        });
        setTopListHeading(footerData?.top_list_heading || 'Quick Links');
        setNewsletterEnabled(footerData?.show_newsletter !== undefined ? Boolean(footerData.show_newsletter) : true);
        setShowSocialLinks(footerData?.show_social_links !== undefined ? Boolean(footerData.show_social_links) : true);
        if (footerData?.quick_links_json && Array.isArray(footerData.quick_links_json)) {
            setSelectedPages(footerData.quick_links_json);
        } else {
            setSelectedPages(initialSelectedPages);
        }
        toast.info('Footer settings reset to default values.');
    };

    // Translation mode. Field keys mirror the `footer` entry in the backend's
    // FIELD_CATALOG, which registers this section at page_slug='' keyed by the
    // footer settings row id.
    // Built once so the field list and the inputs below cannot drift apart.
    const linkTranslationFields = (() => {
        const list1 = selectedPages.length > 0
            ? selectedPages
            : ['home', 'features', 'templates', 'gallery', 'contact'];
        const seen = new Set<string>();
        const out: { key: string; label: string; type: 'input'; value: string }[] = [];
        [...list1, ...selectedPages2].forEach((entry) => {
            const slug = String(entry ?? '').trim();
            if (!slug || seen.has(slug)) return;
            seen.add(slug);
            const derived = slug
                .replace(/^\/+/, '')
                .split(/[-_/]/)
                .filter(Boolean)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            out.push({
                key: `quick_link.${slug}`,
                label: `Footer Link — ${derived}`,
                type: 'input',
                value: derived,
            });
        });
        return out;
    })();

    const translationFields = [
        { key: 'company_name', label: 'Company Name', type: 'input' as const, value: companyName },
        { key: 'description', label: 'Description', type: 'textarea' as const, value: shortDescription },
        { key: 'top_list_heading', label: 'Links Heading 1', type: 'input' as const, value: topListHeading },
        { key: 'top_list_heading_2', label: 'Links Heading 2', type: 'input' as const, value: topListHeading2 },
        { key: 'address', label: 'Address', type: 'textarea' as const, value: activeContact.address },
        // Quick-link lists store bare slugs. A slug matching a real page renders
        // that page's own (translatable) title, but the rest fall back to a
        // label derived from the slug — text in no table, which is why the
        // headings translated while the links under them stayed English (§68).
        // This mirrors the backend footer extractor exactly; the derived label
        // and the `quick_link.<slug>` key must match or the form edits nothing.
        ...linkTranslationFields,
    ];
    const translation = useSectionTranslation({
        section: 'footer',
        recordId: (footerData as any)?.id,
        fields: translationFields,
    });
    const { isTranslationMode, bind } = translation;
    // Logos, links, toggles and contact details are shared across languages.
    const sharedOnly = cn(isTranslationMode && 'opacity-50 pointer-events-none');

    // The English save below writes company_name to BOTH the footer row and
    // basic_information. The translation has to mirror that: the rendered
    // header and page title read basic-information, so translating only the
    // footer slot would leave the site header in English.
    const saveBasicTranslation = useSaveContentTranslations('basic-information', undefined, (basicInfo as any)?.id);

    const handleSave = async () => {
        if (isTranslationMode && translation.activeLanguage) {
            const saved = await translation.save();
            if (saved) {
                if ((basicInfo as any)?.id) {
                    await saveBasicTranslation.mutateAsync({
                        language_id: translation.activeLanguage.id,
                        values: { company_name: translation.values.company_name ?? '' },
                    });
                }
                toast.success(`${translation.activeLanguage.name} translation for Footer saved successfully`);
            }
            return;
        }
        try {
            await save({
                logo_url: companyLogo,
                company_name: companyName,
                description: shortDescription,
                contact_type: contactType,
                mobile: activeContact.mobile,
                email: activeContact.email,
                address: activeContact.address,
                top_list_heading: topListHeading,
                top_list_heading_2: topListHeading2,
                show_quick_links_1: showQuickLinks1 ? 1 : 0,
                show_quick_links_2: showQuickLinks2 ? 1 : 0,
                quick_links_json: showQuickLinks1 ? selectedPages : [],
                quick_links_2_json: showQuickLinks2 ? selectedPages2 : [],
                show_newsletter: newsletterEnabled ? 1 : 0,
                show_social_links: showSocialLinks ? 1 : 0,
            });

            await saveBasic({
                ...(basicInfo || {}),
                logo_url: companyLogo,
                company_name: companyName,
            });

            translation.registerKeys();
            toast.success('Footer settings saved successfully');
            // Fill every language straight off the save — no second button.
            await translation.translateAfterSave();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save footer settings');
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader open={isSaving} text="Saving Footer Settings..." />
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                        Footer Settings
                        {isTranslationMode && translation.activeLanguage && (
                            <span className="ml-2 text-primary">({translation.activeLanguage.name})</span>
                        )}
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage footer company description, quick links, newsletter block, and contact info.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    >
                        <Eye className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Live Preview
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResetDialogOpen(true)}
                        className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || translation.isSaving} className="gap-2 h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        <Save className="h-3.5 w-3.5" /> {isSaving || translation.isSaving ? 'Saving...' : isTranslationMode ? 'Save Translation' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Languages + translation mode */}
            <div className="flex flex-col gap-3">
                <div className="w-full self-end lg:w-72">
                    <TranslationSideCard
                        section="footer"
                        recordId={(footerData as any)?.id}
                        activeLanguageId={translation.activeLanguage?.id ?? null}
                        buildHref={translation.buildHref}
                        canTranslate={translation.canTranslate}
                        fields={translationFields}
                    />
                </div>
                <div className="order-first min-w-0">
                    <TranslationModeBanner translation={translation} label="Footer" />
                </div>
            </div>

            {/* Main Section Layout: Form Settings (Full Width) */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Company Info & Contact Info */}
                    <div className="space-y-4">
                        {/* Card 1: Company Information */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Company Information</CardTitle>
                                <CardDescription className="text-xs">Footer brand logo, name, and description.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Logo Upload — shared across languages */}
                                <div className={cn("space-y-1.5 w-full", sharedOnly)}>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Logo</label>
                                    {companyLogo ? (
                                        <div className="relative flex h-16 w-full items-center justify-center rounded-lg border bg-card p-2 overflow-hidden group">
                                            <img src={companyLogo} alt="Footer Logo" className="h-full w-full object-contain" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRecropExisting(companyLogo)}
                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white text-slate-800 rounded shadow-xs hover:bg-slate-100 cursor-pointer"
                                                    title="Crop logo"
                                                >
                                                    <Crop className="h-3 w-3" /> Crop
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCompanyLogo('')}
                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-rose-600 text-white rounded shadow-xs hover:bg-rose-700 cursor-pointer"
                                                    title="Remove logo"
                                                >
                                                    <Trash2 className="h-3 w-3" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative flex flex-col items-center justify-center h-16 w-full rounded-lg border border-dashed bg-muted/20 hover:bg-muted/30 cursor-pointer p-2 text-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleFileChange}
                                            />
                                            <p className="text-xs font-semibold text-foreground">Click or drag image to crop</p>
                                            <p className="text-[10px] text-muted-foreground">PNG, SVG or WEBP (Max 10MB)</p>
                                        </div>
                                    )}
                                </div>

                                <BuilderCountedInput
                                    label="Company Name"
                                    maxLength={60}
                                    {...bind('company_name', companyName, setCompanyName)}
                                />

                                <BuilderCountedTextarea
                                    label="Short Description"
                                    maxLength={240}
                                    rows={3}
                                    {...bind('description', shortDescription, setShortDescription)}
                                />
                            </CardContent>
                        </Card>

                        {/* Card 2: Contact Information. Phone/email and the mode
                            toggle are shared across languages, but the ADDRESS is
                            prose and must stay editable while translating — so
                            the card cannot be blanket-disabled. */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold">Contact Information</CardTitle>
                                        <CardDescription className="text-xs">Footer contact block mode.</CardDescription>
                                    </div>
                                    <div className={cn('flex gap-1 rounded-lg border p-1 bg-muted/40', sharedOnly)}>
                                        <button
                                            type="button"
                                            onClick={() => setContactType('default')}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                                contactType === 'default' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                            }`}
                                        >
                                            Default
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setContactType('alternative')}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                                contactType === 'alternative' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                            }`}
                                        >
                                            Alternative
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* A phone number and an email address read the
                                    same in every language. */}
                                <div className={cn('space-y-3', sharedOnly)}>
                                    <BuilderCountedInput
                                        label="Mobile"
                                        value={activeContact.mobile}
                                        onChange={(v) => updateActiveContact({ mobile: v })}
                                        maxLength={20}
                                    />
                                    <BuilderCountedInput
                                        label="Email"
                                        value={activeContact.email}
                                        onChange={(v) => updateActiveContact({ email: v })}
                                        maxLength={80}
                                    />
                                </div>
                                {/* The footer keeps its own address, which
                                    buildFooter prefers over basic_information —
                                    so it needs translating in its own right,
                                    not just in the Contact section. */}
                                <BuilderCountedTextarea
                                    label="Address"
                                    maxLength={160}
                                    rows={2}
                                    {...bind('address', activeContact.address, (v) =>
                                        updateActiveContact({ address: v })
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2: Menu Settings & Footer Bottom */}
                    <div className="space-y-4">
                        {/* Card 3: Menu Settings */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold">Menu Settings</CardTitle>
                                <CardDescription className="text-xs">Quick links heading, pages, and toggles.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3 rounded-lg border p-3 bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Link List 1 (Quick Links)</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-slate-600">{showQuickLinks1 ? 'Show' : 'Hide'}</span>
                                            <Switch checked={showQuickLinks1} onCheckedChange={setShowQuickLinks1} disabled={isTranslationMode} />
                                        </div>
                                    </div>
                                    {showQuickLinks1 && (
                                        <>
                                            <BuilderCountedInput
                                                label="List 1 Heading"
                                                maxLength={80}
                                                {...bind('top_list_heading', topListHeading, setTopListHeading)}
                                            />
                                            <MultiSelectPages
                                                disabled={isTranslationMode}
                                                label="Add Pages to Link List 1"
                                                value={selectedPages}
                                                options={pageOptions}
                                                onChange={setSelectedPages}
                                                placeholder="Add page"
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="space-y-3 rounded-lg border p-3 bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Link List 2 (Dynamic Column)</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-slate-600">{showQuickLinks2 ? 'Show' : 'Hide'}</span>
                                            <Switch checked={showQuickLinks2} onCheckedChange={setShowQuickLinks2} disabled={isTranslationMode} />
                                        </div>
                                    </div>
                                    {showQuickLinks2 && (
                                        <>
                                            <BuilderCountedInput
                                                label="List 2 Heading"
                                                maxLength={80}
                                                {...bind('top_list_heading_2', topListHeading2, setTopListHeading2)}
                                            />
                                            <MultiSelectPages
                                                disabled={isTranslationMode}
                                                label="Add Pages to Link List 2"
                                                value={selectedPages2}
                                                options={pageOptions}
                                                onChange={setSelectedPages2}
                                                placeholder="Add page"
                                            />
                                        </>
                                    )}

                                    {/* Link LABELS, editable only while translating.
                                        In English these are derived from the page
                                        slug and there is nothing to type. */}
                                    {isTranslationMode && linkTranslationFields.length > 0 && (
                                        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                                            <p className="text-[11px] font-semibold text-foreground">
                                                Link Labels
                                            </p>
                                            {linkTranslationFields.map((field) => (
                                                <div key={field.key} className="space-y-1">
                                                    <label className="text-[10.5px] font-medium text-muted-foreground">
                                                        {field.value}
                                                    </label>
                                                    <Input
                                                        value={translation.values[field.key] ?? ''}
                                                        onChange={(e) => translation.setValue(field.key, e.target.value)}
                                                        placeholder={field.value}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-2.5 bg-card">
                                    <div>
                                        <h4 className="font-semibold text-xs text-foreground">Enable Newsletter</h4>
                                        <p className="text-[10px] text-muted-foreground">Display subscribe input.</p>
                                    </div>
                                    <Switch checked={newsletterEnabled} onCheckedChange={setNewsletterEnabled} disabled={isTranslationMode} />
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-2.5 bg-card">
                                    <div>
                                        <h4 className="font-semibold text-xs text-foreground">Show Social Links</h4>
                                        <p className="text-[10px] text-muted-foreground">Display social icon links.</p>
                                    </div>
                                    <Switch checked={showSocialLinks} onCheckedChange={setShowSocialLinks} disabled={isTranslationMode} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Footer Bottom */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    Footer Bottom <Lock className="h-3 w-3 text-muted-foreground" />
                                </CardTitle>
                                <CardDescription className="text-xs">Copyright statement & platform attribution.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <BuilderCountedInput
                                    label="Copyright"
                                    value={copyright}
                                    onChange={() => undefined}
                                    maxLength={120}
                                    lockInput
                                    showCount={false}
                                />
                                <BuilderCountedInput
                                    label="Powered By"
                                    value={poweredBy}
                                    onChange={() => undefined}
                                    maxLength={80}
                                    lockInput
                                    showCount={false}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Live Preview Modal Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-6xl w-[92vw] border-slate-200">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <DialogTitle className="text-sm font-bold text-slate-900">Footer — Live Preview</DialogTitle>
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/40">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                                        previewDevice === 'desktop' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                    }`}
                                >
                                    <Monitor className="h-3.5 w-3.5" /> Desktop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                                        previewDevice === 'mobile' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                    }`}
                                >
                                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                                </button>
                            </div>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Real-time footer layout preview.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-2">
                        <div className={`mx-auto rounded-xl border overflow-hidden bg-[#0B0D17] text-white shadow-xl transition-all duration-300 ${
                            previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full'
                        }`}>
                            <div className={`p-5 gap-4 ${previewDevice === 'mobile' ? 'flex flex-col' : 'grid grid-cols-3'}`}>
                                {/* Brand Column */}
                                <div className="space-y-2">
                                    {companyLogo ? (
                                        <img src={companyLogo} alt={companyName} className="h-8 object-contain" />
                                    ) : (
                                        <p className="text-sm font-bold text-white tracking-wide">{companyName}</p>
                                    )}
                                    <p className="text-[10px] leading-relaxed text-white/60">{shortDescription}</p>
                                </div>

                                {/* Links Column */}
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-white">{topListHeading}</p>
                                    {quickLinkLabels.length > 0 ? (
                                        quickLinkLabels.map((lbl) => (
                                            <p key={lbl} className="text-[10px] text-white/60 hover:text-white transition-colors cursor-pointer">{lbl}</p>
                                        ))
                                    ) : (
                                        <p className="text-[10px] italic text-white/30">No pages selected</p>
                                    )}
                                </div>

                                {/* Contact Column */}
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-white">Contact Us</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                                        <Phone className="h-3 w-3 text-primary shrink-0" />
                                        <span>{activeContact.mobile}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                                        <Mail className="h-3 w-3 text-primary shrink-0" />
                                        <span>{activeContact.email}</span>
                                    </div>
                                    <div className="flex items-start gap-1.5 text-[10px] text-white/60">
                                        <MapPin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                        <span>{activeContact.address}</span>
                                    </div>

                                    {newsletterEnabled && (
                                        <div className="mt-2 flex gap-1">
                                            <input
                                                type="email"
                                                placeholder="Your email"
                                                readOnly
                                                className="w-full rounded-l-md bg-white/10 px-2 py-1 text-[9px] text-white outline-none"
                                            />
                                            <div className="rounded-r-md bg-primary px-2 py-1 text-[9px] font-bold text-primary-foreground shrink-0 cursor-pointer">
                                                Subscribe
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Bottom Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-2.5 text-[9px] text-white/40">
                                <span>{copyright}</span>
                                <span>{poweredBy}</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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
