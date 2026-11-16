'use client';

import { useState } from 'react';
import {
    Plus,
    Trash2,
    Save,
    Upload,
    Sparkles,
    Palette,
    LogIn,
    Check,
    Eye,
    Shield,
    Sliders,
    Layers,
    HelpCircle,
    RotateCcw,
    Loader2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmResetDialog } from '@/components/common/confirm-reset-dialog';

interface AdminPalette {
    id: string;
    name: string;
    primaryBg: string;
    primaryText: string;
    secondaryText: string;
    paragraph: string;
}

const ADMIN_PALETTES: AdminPalette[] = [
    {
        id: 'p1',
        name: 'Royal Sapphire (Default)',
        primaryBg: '#1e3a8a',
        primaryText: '#0f172a',
        secondaryText: '#475569',
        paragraph: '#334155',
    },
    {
        id: 'p2',
        name: 'Emerald Prestige',
        primaryBg: '#065f46',
        primaryText: '#064e3b',
        secondaryText: '#374151',
        paragraph: '#1f2937',
    },
    {
        id: 'p3',
        name: 'Luxury Rose Gold',
        primaryBg: '#9f1239',
        primaryText: '#881337',
        secondaryText: '#4b5563',
        paragraph: '#374151',
    },
    {
        id: 'p4',
        name: 'Midnight Onyx & Violet',
        primaryBg: '#581c87',
        primaryText: '#3b0764',
        secondaryText: '#4b5563',
        paragraph: '#1f2937',
    },
];

export default function ThemeBrandingSettingsPage() {
    const [colorMode, setColorMode] = useState<'palette' | 'custom'>('palette');
    const [selectedPaletteId, setSelectedPaletteId] = useState('p1');
    const [customPrimaryBg, setCustomPrimaryBg] = useState('#1e3a8a');
    const [customPrimaryText, setCustomPrimaryText] = useState('#0f172a');
    const [customSecondaryText, setCustomSecondaryText] = useState('#475569');
    const [customParagraph, setCustomParagraph] = useState('#334155');

    // Login Branding
    const [showLoginPanel, setShowLoginPanel] = useState(true);
    const [loginEyebrow, setLoginEyebrow] = useState('Event workspace');
    const [loginTitle, setLoginTitle] = useState('Everything for your event, in one place.');
    const [loginDescription, setLoginDescription] = useState('Manage enquiries, bookings and event details from one secure account.');
    const [loginBgUrl, setLoginBgUrl] = useState('');
    const [loginBullets, setLoginBullets] = useState<string[]>([
        'Real-time RSVP & Guest Management',
        'Direct Messaging with Event Vendors',
        'Custom Website Builder & Gallery Settings',
    ]);

    const [isSaving, setIsSaving] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const activePalette = ADMIN_PALETTES.find((p) => p.id === selectedPaletteId) || ADMIN_PALETTES[0];

    const currentColors =
        colorMode === 'custom'
            ? {
                  primaryBg: customPrimaryBg,
                  primaryText: customPrimaryText,
                  secondaryText: customSecondaryText,
                  paragraph: customParagraph,
              }
            : {
                  primaryBg: activePalette.primaryBg,
                  primaryText: activePalette.primaryText,
                  secondaryText: activePalette.secondaryText,
                  paragraph: activePalette.paragraph,
              };

    const handleReset = () => {
        setColorMode('palette');
        setSelectedPaletteId('p1');
        setCustomPrimaryBg('#1e3a8a');
        setCustomPrimaryText('#0f172a');
        setCustomSecondaryText('#475569');
        setCustomParagraph('#334155');
        setLoginEyebrow('Event workspace');
        setLoginTitle('Everything for your event, in one place.');
        setLoginDescription('Manage enquiries, bookings and event details from one secure account.');
        setLoginBgUrl('');
        setLoginBullets([
            'Real-time RSVP & Guest Management',
            'Direct Messaging with Event Vendors',
            'Custom Website Builder & Gallery Settings',
        ]);
        toast.info('Theme branding settings reset to defaults.');
    };

    const handleAddBullet = () => {
        if (loginBullets.length >= 5) {
            toast.error('Maximum 5 bullet points allowed.');
            return;
        }
        setLoginBullets([...loginBullets, 'New highlight feature']);
    };

    const handleRemoveBullet = (index: number) => {
        setLoginBullets(loginBullets.filter((_, i) => i !== index));
    };

    const handleSaveTheme = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast.success('Theme and Login branding settings saved successfully!');
        }, 500);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Theme Palettes & Login Branding</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure 4-color website theme palettes and customize the client login/registration brand panel.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Configure site color schemes and login panel branding options.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveTheme} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="theme" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="theme" className="gap-2">
                        <Palette className="h-4 w-4" /> 4-Color Theme Palette
                    </TabsTrigger>
                    <TabsTrigger value="login" className="gap-2">
                        <LogIn className="h-4 w-4" /> Login Brand Panel
                    </TabsTrigger>
                </TabsList>

                {/* Theme Colors Tab */}
                <TabsContent value="theme" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Color Theme Mode</CardTitle>
                            <CardDescription>Select a pre-built Admin Palette or define custom 4-color hex codes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-6 rounded-lg border p-4">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="radio"
                                        name="colorMode"
                                        checked={colorMode === 'palette'}
                                        onChange={() => setColorMode('palette')}
                                        className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm font-semibold">Admin Curated Palettes</span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="radio"
                                        name="colorMode"
                                        checked={colorMode === 'custom'}
                                        onChange={() => setColorMode('custom')}
                                        className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm font-semibold">Custom 4-Color Hex Values</span>
                                </label>
                            </div>

                            {colorMode === 'palette' ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {ADMIN_PALETTES.map((pal) => (
                                        <div
                                            key={pal.id}
                                            onClick={() => setSelectedPaletteId(pal.id)}
                                            className={`cursor-pointer rounded-lg border p-4 transition-all ${
                                                selectedPaletteId === pal.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/40'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between pb-3">
                                                <h4 className="font-semibold text-sm">{pal.name}</h4>
                                                {selectedPaletteId === pal.id && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div className="flex h-8 w-full overflow-hidden rounded-md border">
                                                <div className="h-full flex-1" style={{ backgroundColor: pal.primaryBg }} title="Primary Background" />
                                                <div className="h-full flex-1" style={{ backgroundColor: pal.primaryText }} title="Primary Text" />
                                                <div className="h-full flex-1" style={{ backgroundColor: pal.secondaryText }} title="Secondary Text" />
                                                <div className="h-full flex-1" style={{ backgroundColor: pal.paragraph }} title="Paragraph Text" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                                    <div className="space-y-2 rounded-lg border p-3">
                                        <Label className="text-xs">Primary Background</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={customPrimaryBg}
                                                onChange={(e) => setCustomPrimaryBg(e.target.value)}
                                                className="h-9 w-9 cursor-pointer rounded border p-0.5"
                                            />
                                            <Input
                                                value={customPrimaryBg}
                                                onChange={(e) => setCustomPrimaryBg(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-lg border p-3">
                                        <Label className="text-xs">Primary Text</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={customPrimaryText}
                                                onChange={(e) => setCustomPrimaryText(e.target.value)}
                                                className="h-9 w-9 cursor-pointer rounded border p-0.5"
                                            />
                                            <Input
                                                value={customPrimaryText}
                                                onChange={(e) => setCustomPrimaryText(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-lg border p-3">
                                        <Label className="text-xs">Secondary Text</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={customSecondaryText}
                                                onChange={(e) => setCustomSecondaryText(e.target.value)}
                                                className="h-9 w-9 cursor-pointer rounded border p-0.5"
                                            />
                                            <Input
                                                value={customSecondaryText}
                                                onChange={(e) => setCustomSecondaryText(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-lg border p-3">
                                        <Label className="text-xs">Paragraph Color</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={customParagraph}
                                                onChange={(e) => setCustomParagraph(e.target.value)}
                                                className="h-9 w-9 cursor-pointer rounded border p-0.5"
                                            />
                                            <Input
                                                value={customParagraph}
                                                onChange={(e) => setCustomParagraph(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Simulated Palette Preview Card */}
                            <div className="mt-6 space-y-2 rounded-xl border p-5 bg-card">
                                <h4 className="text-xs uppercase font-semibold text-muted-foreground">Live Theme Preview</h4>
                                <div className="rounded-lg p-5 border" style={{ backgroundColor: currentColors.primaryBg }}>
                                    <span className="inline-block rounded px-2.5 py-1 text-xs font-bold text-white bg-white/20">
                                        EYEBROW BADGE
                                    </span>
                                    <h3 className="mt-2 text-xl font-bold text-white">Sample Section Heading</h3>
                                    <p className="mt-1 text-xs text-white/80">
                                        This simulates how theme elements, headings, buttons, and badges render with selected colors.
                                    </p>
                                    <div className="mt-4 flex gap-2">
                                        <button className="rounded px-4 py-2 text-xs font-semibold bg-white text-slate-900 shadow">
                                            Primary CTA Button
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Login Brand Panel Tab */}
                <TabsContent value="login" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Client Login & Registration Brand Side-Panel</CardTitle>
                            <CardDescription>Configure side panel copy, highlight bullets, and background visuals.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <h4 className="font-semibold text-sm">Show Brand Side-Panel</h4>
                                    <p className="text-xs text-muted-foreground">If disabled, the login modal renders as a single-column login card.</p>
                                </div>
                                <Switch checked={showLoginPanel} onCheckedChange={setShowLoginPanel} />
                            </div>

                            {showLoginPanel && (
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="loginEyebrow">Eyebrow Badge Text</Label>
                                        <Input
                                            id="loginEyebrow"
                                            value={loginEyebrow}
                                            onChange={(e) => setLoginEyebrow(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="loginTitle">Brand Panel Title</Label>
                                        <Input
                                            id="loginTitle"
                                            value={loginTitle}
                                            onChange={(e) => setLoginTitle(e.target.value)}
                                            className="font-semibold"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="loginDescription">Description Copy</Label>
                                        <Textarea
                                            id="loginDescription"
                                            value={loginDescription}
                                            onChange={(e) => setLoginDescription(e.target.value)}
                                            rows={2}
                                        />
                                    </div>

                                    {/* Highlight Bullets List */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Highlight Bullets (Max 5)</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAddBullet} className="gap-1 text-xs">
                                                <Plus className="h-3.5 w-3.5" /> Add Bullet
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {loginBullets.map((bullet, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <Input
                                                        value={bullet}
                                                        onChange={(e) => {
                                                            const updated = [...loginBullets];
                                                            updated[idx] = e.target.value;
                                                            setLoginBullets(updated);
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRemoveBullet(idx)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}
