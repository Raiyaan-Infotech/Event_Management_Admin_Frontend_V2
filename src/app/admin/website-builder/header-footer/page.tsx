'use client';

import { useState } from 'react';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    Layers,
    Globe,
    Check,
    Pencil,
    Layout,
    Mail,
    Phone,
    Share2,
    Sparkles,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface NavLink {
    id: string;
    label: string;
    url: string;
    target: '_self' | '_blank';
    isOpen: boolean;
}

export default function HeaderFooterSettingsPage() {
    // Header States
    const [logoUrl, setLogoUrl] = useState('/logo-placeholder.png');
    const [logoHeight, setLogoHeight] = useState('44');
    const [topbarEmail, setTopbarEmail] = useState('contact@eventmanagement.com');
    const [topbarPhone, setTopbarPhone] = useState('+1 (800) 555-0199');
    const [showSocialIcons, setShowSocialIcons] = useState(true);
    const [navLinks, setNavLinks] = useState<NavLink[]>([
        { id: '1', label: 'Home', url: '/', target: '_self', isOpen: true },
        { id: '2', label: 'About Us', url: '/about-us', target: '_self', isOpen: true },
        { id: '3', label: 'Services', url: '/services', target: '_self', isOpen: true },
        { id: '4', label: 'Events & Menus', url: '/events', target: '_self', isOpen: true },
        { id: '5', label: 'Contact', url: '/contact-us', target: '_self', isOpen: true },
    ]);

    // Footer States
    const [footerCopyright, setFooterCopyright] = useState('© 2026 Event Management SaaS. All rights reserved.');
    const [showNewsletter, setShowNewsletter] = useState(true);
    const [newsletterTitle, setNewsletterTitle] = useState('Subscribe to our Newsletter');
    const [newsletterDesc, setNewsletterDesc] = useState('Get the latest event trends, updates, and special packages delivered to your inbox.');
    const [selectedQuickLinks, setSelectedQuickLinks] = useState<string[]>(['about-us', 'services', 'events', 'terms-conditions', 'privacy-policy']);

    const [isSaving, setIsSaving] = useState(false);

    const handleAddNavLink = () => {
        const newLink: NavLink = {
            id: Date.now().toString(),
            label: 'New Page',
            url: '/new-page',
            target: '_self',
            isOpen: true,
        };
        setNavLinks([...navLinks, newLink]);
        toast.info('New navigation link added.');
    };

    const handleRemoveNavLink = (id: string) => {
        setNavLinks(navLinks.filter((l) => l.id !== id));
        toast.success('Navigation link removed.');
    };

    const handleSaveHeaderFooter = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Header and Footer configurations updated successfully!');
        }, 600);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Header & Footer Configuration</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure topbar navigation, logo styling, menu links, quick footer links, and newsletter blocks.
                    </p>
                </div>

                <Button size="sm" onClick={handleSaveHeaderFooter} disabled={isSaving} className="gap-2">
                    <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            {/* Tabs Interface */}
            <Tabs defaultValue="header" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="header" className="gap-2">
                        <Layout className="h-4 w-4" /> Header & Nav Menu
                    </TabsTrigger>
                    <TabsTrigger value="footer" className="gap-2">
                        <Layers className="h-4 w-4" /> Footer Settings
                    </TabsTrigger>
                </TabsList>

                {/* Header Tab Content */}
                <TabsContent value="header" className="space-y-6">
                    {/* Brand Logo Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Header Logo & Branding</CardTitle>
                            <CardDescription>Upload site logo and adjust height dimensions for navigation bar.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Header Logo Image</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-16 w-36 items-center justify-center rounded-lg border bg-muted/30 p-2">
                                            <span className="text-xs font-semibold text-primary">LOGO PREVIEW</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Upload className="h-4 w-4" /> Upload Logo
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Recommended format: PNG or SVG with transparent background.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="logoHeight">Logo Height (px)</Label>
                                    <Input
                                        id="logoHeight"
                                        type="number"
                                        value={logoHeight}
                                        onChange={(e) => setLogoHeight(e.target.value)}
                                        placeholder="44"
                                    />
                                    <p className="text-xs text-muted-foreground">Standard header logo height is between 36px and 52px.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Topbar Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Top Bar Information</CardTitle>
                            <CardDescription>Contact info displayed in the top header info strip.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="topbarEmail" className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5" /> Support Email
                                    </Label>
                                    <Input
                                        id="topbarEmail"
                                        value={topbarEmail}
                                        onChange={(e) => setTopbarEmail(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="topbarPhone" className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" /> Contact Phone
                                    </Label>
                                    <Input
                                        id="topbarPhone"
                                        value={topbarPhone}
                                        onChange={(e) => setTopbarPhone(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1.5">
                                        <Share2 className="h-3.5 w-3.5" /> Social Icons Strip
                                    </Label>
                                    <div className="flex items-center justify-between rounded-lg border p-2.5">
                                        <span className="text-sm font-medium">Show Social Links</span>
                                        <Switch checked={showSocialIcons} onCheckedChange={setShowSocialIcons} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation Menu Links */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-lg">Main Navigation Menu</CardTitle>
                                <CardDescription>Manage navbar links, labels, and target URLs.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={handleAddNavLink} className="gap-1.5">
                                <Plus className="h-4 w-4" /> Add Menu Item
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {navLinks.map((link, idx) => (
                                <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                                    <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                                    <div className="min-w-[140px] flex-1">
                                        <Input
                                            value={link.label}
                                            onChange={(e) => {
                                                const updated = [...navLinks];
                                                updated[idx].label = e.target.value;
                                                setNavLinks(updated);
                                            }}
                                            placeholder="Link Label"
                                        />
                                    </div>
                                    <div className="min-w-[200px] flex-1">
                                        <Input
                                            value={link.url}
                                            onChange={(e) => {
                                                const updated = [...navLinks];
                                                updated[idx].url = e.target.value;
                                                setNavLinks(updated);
                                            }}
                                            placeholder="Link URL"
                                        />
                                    </div>
                                    <div className="w-[120px]">
                                        <Select
                                            value={link.target}
                                            onValueChange={(val: '_self' | '_blank') => {
                                                const updated = [...navLinks];
                                                updated[idx].target = val;
                                                setNavLinks(updated);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_self">Same Tab</SelectItem>
                                                <SelectItem value="_blank">New Tab</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveNavLink(link.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Footer Tab Content */}
                <TabsContent value="footer" className="space-y-6">
                    {/* Newsletter Block */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Footer Newsletter Subscription Block</CardTitle>
                            <CardDescription>Enable and customize footer email subscription form.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold">Enable Newsletter Form</h4>
                                    <p className="text-xs text-muted-foreground">Appears above footer quick links section.</p>
                                </div>
                                <Switch checked={showNewsletter} onCheckedChange={setShowNewsletter} />
                            </div>

                            {showNewsletter && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="newsletterTitle">Newsletter Heading</Label>
                                        <Input
                                            id="newsletterTitle"
                                            value={newsletterTitle}
                                            onChange={(e) => setNewsletterTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newsletterDesc">Newsletter Sub-description</Label>
                                        <Textarea
                                            id="newsletterDesc"
                                            value={newsletterDesc}
                                            onChange={(e) => setNewsletterDesc(e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Footer Quick Links & Copyright */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Footer Quick Links & Copyright</CardTitle>
                            <CardDescription>Select pages to display in quick links column and configure copyright note.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="footerCopyright">Copyright Notice Text</Label>
                                <Input
                                    id="footerCopyright"
                                    value={footerCopyright}
                                    onChange={(e) => setFooterCopyright(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label>Footer Selected Pages</Label>
                                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                    {[
                                        { slug: 'about-us', name: 'About Us' },
                                        { slug: 'services', name: 'Services' },
                                        { slug: 'events', name: 'Events & Packages' },
                                        { slug: 'terms-conditions', name: 'Terms & Conditions' },
                                        { slug: 'privacy-policy', name: 'Privacy Policy' },
                                        { slug: 'contact-us', name: 'Contact Us' },
                                    ].map((item) => {
                                        const isSelected = selectedQuickLinks.includes(item.slug);
                                        return (
                                            <div
                                                key={item.slug}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedQuickLinks(selectedQuickLinks.filter((s) => s !== item.slug));
                                                    } else {
                                                        setSelectedQuickLinks([...selectedQuickLinks, item.slug]);
                                                    }
                                                }}
                                                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                                                    isSelected ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40'
                                                }`}
                                            >
                                                <span className="text-sm font-medium">{item.name}</span>
                                                {isSelected && <Check className="h-4 w-4" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
