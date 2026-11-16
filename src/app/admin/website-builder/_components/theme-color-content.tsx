'use client';

import { useEffect, useState } from 'react';
import { Save, Palette, HelpCircle, RotateCcw, Loader2, Type } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyThemeSettings } from '@/hooks/useCompanyWebsiteBuilder';
import { PageLoader } from '@/components/common/page-loader';
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
    { id: 'p1', name: 'Royal Sapphire (Default)', primaryBg: '#1e3a8a', primaryText: '#0f172a', secondaryText: '#475569', paragraph: '#334155' },
    { id: 'p2', name: 'Emerald Prestige', primaryBg: '#065f46', primaryText: '#064e3b', secondaryText: '#374151', paragraph: '#1f2937' },
    { id: 'p3', name: 'Luxury Rose Gold', primaryBg: '#9f1239', primaryText: '#881337', secondaryText: '#4b5563', paragraph: '#374151' },
    { id: 'p4', name: 'Midnight Onyx & Violet', primaryBg: '#581c87', primaryText: '#3b0764', secondaryText: '#4b5563', paragraph: '#1f2937' },
];

const FONT_OPTIONS = [
    { id: 'Inter', name: 'Inter (Modern & Clean)' },
    { id: 'Roboto', name: 'Roboto (Geometric & Versatile)' },
    { id: 'Open Sans', name: 'Open Sans (Neutral & Readable)' },
    { id: 'Montserrat', name: 'Montserrat (Elegant Header)' },
    { id: 'Poppins', name: 'Poppins (Geometric & Friendly)' },
    { id: 'Lato', name: 'Lato (Warm & Humanist)' },
    { id: 'Playfair Display', name: 'Playfair Display (Luxury Serif)' },
    { id: 'Outfit', name: 'Outfit (Trendy & Modern)' },
];

export function ThemeColorContent() {
    const { data: themeData, isLoading, save, isSaving } = useCompanyThemeSettings();

    const [selectedPaletteId, setSelectedPaletteId] = useState('p1');
    const [pendingPaletteId, setPendingPaletteId] = useState('p1');
    const [selectedFont, setSelectedFont] = useState('Inter');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [isCustom, setIsCustom] = useState(false);
    const [customColors, setCustomColors] = useState({
        primary_bg_color: '#1e3a8a',
        primary_text_color: '#0f172a',
        secondary_text_color: '#475569',
        paragraph_color: '#334155',
    });

    useEffect(() => {
        if (themeData && Object.keys(themeData).length > 0) {
            if (themeData.font_family) {
                setSelectedFont(themeData.font_family);
            }
            if (themeData.primary_color) {
                const primaryColor = (themeData.primary_color || '').toLowerCase();
                const matched = ADMIN_PALETTES.find((p) => p.primaryBg.toLowerCase() === primaryColor);
                if (matched) {
                    setSelectedPaletteId(matched.id);
                    setPendingPaletteId(matched.id);
                    setIsCustom(false);
                } else {
                    setIsCustom(true);
                    setPendingPaletteId('custom');
                }

                setCustomColors({
                    primary_bg_color: themeData.primary_color || '#1e3a8a',
                    primary_text_color: themeData.text_color || '#0f172a',
                    secondary_text_color: themeData.secondary_color || '#475569',
                    paragraph_color: themeData.accent_color || '#334155',
                });
            }
        }
    }, [themeData]);

    const activePalette = ADMIN_PALETTES.find((p) => p.id === selectedPaletteId) || ADMIN_PALETTES[0];

    const currentColors = isCustom
        ? customColors
        : {
              primary_bg_color: activePalette.primaryBg,
              primary_text_color: activePalette.primaryText,
              secondary_text_color: activePalette.secondaryText,
              paragraph_color: activePalette.paragraph,
          };

    const handleReset = () => {
        setSelectedPaletteId('p1');
        setPendingPaletteId('p1');
        setSelectedFont('Inter');
        setIsCustom(false);
        setCustomColors({
            primary_bg_color: '#1e3a8a',
            primary_text_color: '#0f172a',
            secondary_text_color: '#475569',
            paragraph_color: '#334155',
        });
        toast.info('Theme colors and fonts reset to defaults.');
    };

    const handleApply = () => {
        if (pendingPaletteId === 'custom') {
            setIsCustom(true);
        } else {
            setIsCustom(false);
            setSelectedPaletteId(pendingPaletteId);
        }
        toast.info('Palette selection applied.');
    };

    const handleSave = async () => {
        try {
            await save({
                primary_color: currentColors.primary_bg_color,
                text_color: currentColors.primary_text_color,
                secondary_color: currentColors.secondary_text_color,
                accent_color: currentColors.paragraph_color,
                font_family: selectedFont,
            });
            toast.success('Theme color and font settings saved successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save theme colors');
        }
    };

    return (
        <div className="space-y-6">
            <PageLoader open={isSaving} text="Saving Theme Settings..." />
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">Theme & Branding</h1>
                    <p className="text-sm text-muted-foreground">Select website color palettes, custom hex codes, and font typography.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Select site color scheme presets and font family for your website.')} className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 mr-1" /> How It Works
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="h-8 px-3 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50">
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500 mr-1" /> Reset
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        {isSaving ? 'Saving...' : 'Save Theme Settings'}
                    </Button>
                </div>
            </div>

            {/* Section 1: Color Palette Selector */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                    <Palette className="h-4 w-4 text-primary" />
                    <div>
                        <CardTitle className="text-lg">Color Palette</CardTitle>
                        <CardDescription>Select palette and click Apply to update active site colors.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[240px]">
                            <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Color Palette Preset</Label>
                            <Select value={pendingPaletteId} onValueChange={setPendingPaletteId}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Select Palette">
                                        {pendingPaletteId === 'custom'
                                            ? 'Custom 4-Color Palette'
                                            : ADMIN_PALETTES.find((p) => p.id === pendingPaletteId)?.name || 'Royal Sapphire (Default)'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {ADMIN_PALETTES.map((pal) => (
                                        <SelectItem key={pal.id} value={pal.id}>
                                            {pal.name}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Custom 4-Color Palette</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex h-10 items-center gap-1 pt-5">
                            <span className="h-6 w-6 rounded border" style={{ backgroundColor: currentColors.primary_bg_color }} title="Primary Color" />
                            <span className="h-6 w-6 rounded border" style={{ backgroundColor: currentColors.primary_text_color }} title="Primary Text Color" />
                            <span className="h-6 w-6 rounded border" style={{ backgroundColor: currentColors.secondary_text_color }} title="Secondary Text Color" />
                            <span className="h-6 w-6 rounded border" style={{ backgroundColor: currentColors.paragraph_color }} title="Paragraph Text Color" />
                        </div>

                        <div className="pt-5">
                            <Button type="button" variant="outline" onClick={handleApply} disabled={pendingPaletteId === selectedPaletteId && !isCustom} className="h-10 text-xs">
                                Apply Palette
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Font Family Selector */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                    <Type className="h-4 w-4 text-primary" />
                    <div>
                        <CardTitle className="text-lg">Typography & Font Family</CardTitle>
                        <CardDescription>Select the typography font applied to all website preview text.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[240px]">
                            <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Primary Font Family</Label>
                            <Select value={selectedFont} onValueChange={setSelectedFont}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Select Font Family">
                                        {FONT_OPTIONS.find((f) => f.id === selectedFont)?.name || selectedFont}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_OPTIONS.map((font) => (
                                        <SelectItem key={font.id} value={font.id}>
                                            {font.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-5 text-sm font-semibold text-slate-700" style={{ fontFamily: `'${selectedFont}', sans-serif` }}>
                            Preview: The quick brown fox jumps over the lazy dog.
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Swatch Color Rows */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{isCustom ? 'Custom Colors' : activePalette.name}</CardTitle>
                    <CardDescription>4 semantic color tokens controlling website styling.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 divide-y">
                    {[
                        { key: 'primary_bg_color', label: 'Primary Color' },
                        { key: 'primary_text_color', label: 'Primary Text Color' },
                        { key: 'secondary_text_color', label: 'Secondary Text Color' },
                        { key: 'paragraph_color', label: 'Paragraph text Color' },
                    ].map((item, idx) => {
                        const k = item.key as keyof typeof currentColors;
                        return (
                            <div key={k} className={`flex items-center justify-between gap-4 ${idx !== 0 ? 'pt-3' : ''}`}>
                                <Label className="text-xs font-semibold">{item.label}</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={currentColors[k]}
                                        disabled={!isCustom}
                                        onChange={(e) => {
                                            if (isCustom) setCustomColors({ ...customColors, [k]: e.target.value });
                                        }}
                                        className="h-8 w-8 cursor-pointer rounded border p-0.5 disabled:opacity-60"
                                    />
                                    <Input
                                        value={currentColors[k]}
                                        disabled={!isCustom}
                                        onChange={(e) => {
                                            if (isCustom) setCustomColors({ ...customColors, [k]: e.target.value });
                                        }}
                                        className="h-8 w-[100px] font-mono text-xs uppercase"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <ConfirmResetDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleReset}
            />
        </div>
    );
}

