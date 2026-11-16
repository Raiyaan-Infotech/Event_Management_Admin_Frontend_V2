'use client';

import { useEffect, useState, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Save, RotateCcw, HelpCircle, Trash2, Plus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { BuilderCountedInput } from './builder-field';
import { useCompanyBasicInformation } from '@/hooks/useCompanyWebsiteBuilder';
import { PageLoader } from '@/components/common/page-loader';
import { IconPickerDialog } from '@/components/common/icon-picker-dialog';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';

interface SocialLinkItem {
    id: string;
    label: string;
    url: string;
    color: string;
    iconName: string;
}

export function HeaderContent() {
    const { data: basicInfo, isLoading, save, isSaving } = useCompanyBasicInformation();

    const loadedRef = useRef(false);
    const [showSocialIcons, setShowSocialIcons] = useState(true);
    const [mobileNumber, setMobileNumber] = useState('');
    const [email, setEmail] = useState('');
    const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
    const [iconPickerLinkId, setIconPickerLinkId] = useState<string | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const MAX_LINKS = 10;
    const canAddMore = socialLinks.length < MAX_LINKS;

    useEffect(() => {
        if (loadedRef.current || !basicInfo) return;
        if (basicInfo && Object.keys(basicInfo).length > 0) {
            if (basicInfo.show_social_icons !== undefined) setShowSocialIcons(Boolean(basicInfo.show_social_icons));
            setMobileNumber(basicInfo.mobile || '');
            setEmail(basicInfo.email || '');
            if (basicInfo.social_links_json && Array.isArray(basicInfo.social_links_json)) {
                setSocialLinks(
                    basicInfo.social_links_json.map((link: any, idx: number) => ({
                        id: String(link.id || link.iconName || `social-${idx + 1}`),
                        label: String(link.label || ''),
                        url: String(link.url || ''),
                        color: String(link.color || link.icon_color || '#1877F2'),
                        iconName: String(link.iconName || link.icon_name || link.icon || 'simple-icons:linktree'), // added link.icon_name
                    }))
                );
            } else {
                setSocialLinks([]);
            }
            loadedRef.current = true;
        }
    }, [basicInfo]);

    const handleSave = async () => {
        try {
            await save({
                show_social_icons: showSocialIcons ? 1 : 0,
                mobile: mobileNumber.trim(),
                email: email.trim().toLowerCase(),
                social_links_json: socialLinks.map((link, index) => ({
                    id: link.id,
                    iconName: link.iconName,
                    color: link.color,
                    label: link.label,
                    url: link.url,
                    sort_order: index + 1,
                })),
            });
            toast.success('Header settings updated successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save header settings');
        }
    };

    const handleReset = () => {
        setShowSocialIcons(true);
        setMobileNumber('');
        setEmail('');
        setSocialLinks([]);
        setIconPickerLinkId(null);
        toast.info('Header settings cleared.');
    };

    const updateSocialLink = (id: string, patch: Partial<SocialLinkItem>) => {
        setSocialLinks((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
        );
    };

    const handleDeleteSocialLink = (id: string) => {
        setSocialLinks((prev) => prev.filter((item) => item.id !== id));
        toast.success('Social link removed.');
    };

    const handleAddSocialLink = () => {
        if (!canAddMore) {
            toast.error('Maximum 10 social links allowed.');
            return;
        }
        const newLink: SocialLinkItem = {
            id: `custom-${Date.now()}`,
            label: 'New Link',
            url: 'https://',
            color: '#1877F2',
            iconName: 'simple-icons:linktree',
        };
        setSocialLinks((prev) => [...prev, newLink]);
        toast.info('New social link added.');
    };

    const handleIconSelect = (iconName: string) => {
        if (!iconPickerLinkId) return;
        updateSocialLink(iconPickerLinkId, { iconName });
        setIconPickerLinkId(null);
    };

    const leftLinks = socialLinks.slice(0, 5);
    const rightLinks = socialLinks.slice(5, 10);
    const hasRightPanel = socialLinks.length > 5;

    const renderTableRows = (rows: SocialLinkItem[]) =>
        rows.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30 border-b border-border">
                <td className="py-2.5 px-3">
                    <button
                        type="button"
                        onClick={() => setIconPickerLinkId(item.id)}
                        title="Click to choose icon"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white font-bold transition-transform hover:scale-105 hover:opacity-90 shadow-xs cursor-pointer"
                        style={{ backgroundColor: item.color }}
                    >
                        <Icon icon={item.iconName} className="h-4 w-4" />
                    </button>
                </td>
                <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                        <input
                            type="color"
                            value={item.color}
                            onChange={(e) => updateSocialLink(item.id, { color: e.target.value })}
                            className="h-6 w-6 cursor-pointer rounded border p-0.5"
                        />
                        <span className="text-[10px] font-mono uppercase">{item.color}</span>
                    </div>
                </td>
                <td className="py-2.5 px-3">
                    <Input
                        value={item.label}
                        onChange={(e) => updateSocialLink(item.id, { label: e.target.value })}
                        maxLength={40}
                        className="h-7 text-xs"
                        placeholder="Label"
                    />
                </td>
                <td className="py-2.5 px-3">
                    <Input
                        value={item.url}
                        onChange={(e) => updateSocialLink(item.id, { url: e.target.value })}
                        maxLength={300}
                        className="h-7 text-xs font-mono"
                        placeholder="https://"
                    />
                </td>
                <td className="py-2.5 px-3 text-center">
                    <button
                        type="button"
                        onClick={() => handleDeleteSocialLink(item.id)}
                        className="text-destructive hover:text-destructive/80 p-1"
                        title="Delete social link"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </td>
            </tr>
        ));

    return (
        <div className="space-y-6">
            <PageLoader open={isSaving} text="Saving Header Settings..." />

            {/* Top Page Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Header Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage social icons toggle, contact phone, email, and social links.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure your website header contact details and social media icon links.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Card 1: Header Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-bold">Header Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Toggle: Social Icons */}
                    <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
                        <div>
                            <h4 className="font-semibold text-xs text-foreground">Social Icons</h4>
                            <p className="text-[10px] text-muted-foreground">Show or hide social icons in the website header.</p>
                        </div>
                        <Switch checked={showSocialIcons} onCheckedChange={setShowSocialIcons} />
                    </div>

                    {/* Inputs: Mobile Number & Email */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <BuilderCountedInput
                            label="Mobile Number"
                            value={mobileNumber}
                            onChange={setMobileNumber}
                            maxLength={20}
                            inputPrefix={
                                <div className="flex h-full shrink-0 items-center gap-1 border-r border-border bg-muted px-2">
                                    <span className="text-[10px] font-semibold text-foreground">+91</span>
                                </div>
                            }
                        />
                        <BuilderCountedInput
                            label="Email"
                            value={email}
                            onChange={setEmail}
                            maxLength={100}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Social Links */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                        <CardTitle className="text-base font-bold">Social Links</CardTitle>
                        <p className="text-xs text-muted-foreground">Add up to 10 social profile links. Click an icon to choose from Iconify library.</p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                        {socialLinks.length}/{MAX_LINKS} links
                    </span>
                </CardHeader>
                <CardContent className="space-y-4">
                    {socialLinks.length === 0 ? (
                        <div className="rounded-md border border-dashed p-8 text-center text-xs text-muted-foreground">
                            No social links yet. Click &quot;+ Add Social Link&quot; to add one.
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${hasRightPanel ? 'grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border' : 'grid-cols-1'}`}>
                            <div className={hasRightPanel ? 'lg:pr-3' : ''}>
                                <div className="overflow-x-auto rounded-md border border-border">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                                                <th className="py-2.5 px-3 w-[50px]">Icon</th>
                                                <th className="py-2.5 px-3 w-[120px]">Icon Color</th>
                                                <th className="py-2.5 px-3 w-[140px]">Label</th>
                                                <th className="py-2.5 px-3">URL</th>
                                                <th className="py-2.5 px-3 w-[50px] text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {renderTableRows(leftLinks)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {hasRightPanel && (
                                <div className="lg:pl-3">
                                    <div className="overflow-x-auto rounded-md border border-border">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                                                    <th className="py-2.5 px-3 w-[50px]">Icon</th>
                                                    <th className="py-2.5 px-3 w-[120px]">Icon Color</th>
                                                    <th className="py-2.5 px-3 w-[140px]">Label</th>
                                                    <th className="py-2.5 px-3">URL</th>
                                                    <th className="py-2.5 px-3 w-[50px] text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {renderTableRows(rightLinks)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddSocialLink}
                            disabled={!canAddMore}
                            className="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Social Link
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <IconPickerDialog
                open={Boolean(iconPickerLinkId)}
                socialOnly={true}
                onOpenChange={(open) => {
                    if (!open) setIconPickerLinkId(null);
                }}
                onSelect={handleIconSelect}
            />

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
