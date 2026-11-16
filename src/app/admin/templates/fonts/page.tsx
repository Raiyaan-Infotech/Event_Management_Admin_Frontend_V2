'use client';

/**
 * Templates → Fonts — fonts the admin adds for invitation templates.
 *
 * The template wizard has ten fonts built in. Anything added here joins them
 * in its Primary Font / Secondary Font lists, and a template that uses one
 * stores the font's name like any other.
 *
 * Two ways to add one:
 *   Upload a file — TTF, OTF, WOFF or WOFF2, up to 5MB.
 *   Use a link    — a Google Fonts stylesheet link, or the address of a font
 *                   file hosted elsewhere.
 *
 * For a stylesheet link the Font Name must be the family name the stylesheet
 * declares ("Great Vibes" for `family=Great+Vibes`) — the name is what the
 * browser is asked for, and a different one silently falls back to a default.
 * The preview column draws each font in itself, so a wrong name shows at once.
 */

import { useRef, useState } from 'react';
import { Link2, Loader2, Trash2, Type, Upload } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DeleteDialog } from '@/components/common/delete-dialog';
import { PageLoader } from '@/components/common/page-loader';
import { cn } from '@/lib/utils';
import {
    useTemplateFonts,
    useCreateTemplateFont,
    useUpdateTemplateFont,
    useDeleteTemplateFont,
    useLoadedTemplateFonts,
    formatFontSize,
    type TemplateFont,
} from '@/hooks/use-template-fonts';

type Mode = 'upload' | 'link';

const FILE_TYPES = '.ttf,.otf,.woff,.woff2';
const MAX_BYTES = 5 * 1024 * 1024;

const isActive = (val?: boolean | number) => val !== false && val !== 0;

/** "GreatVibes-Regular.ttf" → "GreatVibes Regular" — a starting point for the name. */
const nameFromFile = (fileName: string) =>
    fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/[^A-Za-z0-9 .]/g, '').trim().slice(0, 100);

/** A Google Fonts link names its family: `family=Great+Vibes:wght@400` → "Great Vibes". */
const nameFromLink = (link: string) => {
    const match = link.match(/[?&]family=([^&:]+)/);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')).slice(0, 100) : '';
};

export default function TemplateFontsPage() {
    const { data: fonts = [], isLoading } = useTemplateFonts();
    // Declares every active font on this page, so the preview column is real.
    useLoadedTemplateFonts();

    const [mode, setMode] = useState<Mode>('upload');
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TemplateFont | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const reset = () => {
        setName('');
        setFile(null);
        setLink('');
        setSubmitted(false);
        if (fileInput.current) fileInput.current.value = '';
    };

    const createFont = useCreateTemplateFont(reset);
    const updateFont = useUpdateTemplateFont();
    const deleteFont = useDeleteTemplateFont();

    const nameMissing = !name.trim();
    const sourceMissing = mode === 'upload' ? !file : !link.trim();

    const pickFile = (picked: File | null) => {
        if (!picked) return;
        if (!/\.(ttf|otf|woff2?)$/i.test(picked.name)) {
            toast.error('Upload a TTF, OTF, WOFF or WOFF2 font file.');
            return;
        }
        if (picked.size > MAX_BYTES) {
            toast.error('The font file is larger than 5MB.');
            return;
        }
        setFile(picked);
        if (!name.trim()) setName(nameFromFile(picked.name));
    };

    const save = () => {
        setSubmitted(true);
        if (nameMissing || sourceMissing) {
            toast.error('Please fill all mandatory fields.');
            return;
        }
        createFont.mutate(mode === 'upload' ? { name: name.trim(), file } : { name: name.trim(), link_url: link.trim() });
    };

    if (isLoading) return <PageLoader open />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Fonts</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    The fonts for invitation templates. The template wizard&rsquo;s font lists show the
                    active fonts on this page, and nothing else.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Add Font</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {([
                            { value: 'upload', label: 'Upload a file', icon: Upload },
                            { value: 'link', label: 'Use a link', icon: Link2 },
                        ] as const).map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    setMode(option.value);
                                    setSubmitted(false);
                                }}
                                className={cn(
                                    'flex items-center gap-2 rounded-md border px-4 py-2 text-xs transition-colors',
                                    mode === option.value
                                        ? 'border-primary bg-primary/5 font-semibold text-primary'
                                        : 'border-border text-muted-foreground hover:border-primary/40'
                                )}
                            >
                                <option.icon className="h-3.5 w-3.5" />
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {mode === 'upload' ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Font File <span className="text-destructive">*</span>
                                </Label>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept={FILE_TYPES}
                                    className="hidden"
                                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className={cn(
                                        'flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-dashed px-3 text-left text-sm transition-colors hover:border-primary/50',
                                        submitted && !file ? 'border-destructive' : 'border-border'
                                    )}
                                >
                                    <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className={cn('min-w-0 truncate', !file && 'text-muted-foreground')}>
                                        {file ? `${file.name} (${formatFontSize(file.size)})` : 'Choose a TTF, OTF, WOFF or WOFF2 file'}
                                    </span>
                                </button>
                                <p className="text-[11px] text-muted-foreground">Up to 5MB.</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Font Link <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={link}
                                    onChange={(e) => {
                                        const value = e.target.value.slice(0, 1000);
                                        setLink(value);
                                        if (!name.trim()) {
                                            const guess = nameFromLink(value);
                                            if (guess) setName(guess);
                                        }
                                    }}
                                    placeholder="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap"
                                    className={cn('h-10', submitted && !link.trim() && 'border-destructive')}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    A Google Fonts stylesheet link, or the https address of a font file.
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">
                                Font Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9 _.\-]/g, '').slice(0, 100))}
                                placeholder="E.g., Great Vibes"
                                className={cn('h-10', submitted && nameMissing && 'border-destructive')}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {mode === 'link'
                                    ? 'For a stylesheet link this must be the family name the link declares.'
                                    : 'The name shown in the template wizard.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={reset} disabled={createFont.isPending}>
                            Reset
                        </Button>
                        <Button type="button" onClick={save} disabled={createFont.isPending}>
                            {createFont.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Font
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Added Fonts ({fonts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {fonts.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <Type className="h-7 w-7 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-foreground">No fonts added yet</p>
                            <p className="max-w-sm text-xs text-muted-foreground">
                                The template wizard has no fonts to offer until one is added here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                        <th className="py-2 pr-3 font-medium">Font</th>
                                        <th className="py-2 pr-3 font-medium">Preview</th>
                                        <th className="py-2 pr-3 font-medium">Source</th>
                                        <th className="py-2 pr-3 font-medium">Active</th>
                                        <th className="py-2 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fonts.map((font) => (
                                        <tr key={font.id} className="border-b border-border last:border-0">
                                            <td className="max-w-[220px] py-3 pr-3 align-top">
                                                <div className="break-all font-medium text-foreground line-clamp-2" title={font.name}>
                                                    {font.name}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3 align-top">
                                                {/* Drawn in the font itself. An inactive font is not
                                                    loaded, so its sample is in the fallback face. */}
                                                <span
                                                    className="text-lg text-foreground"
                                                    style={{ fontFamily: `"${font.name}", serif` }}
                                                >
                                                    Rahul &amp; Priya
                                                </span>
                                            </td>
                                            <td className="max-w-[260px] py-3 pr-3 align-top text-xs text-muted-foreground">
                                                {font.source === 'upload' ? (
                                                    <div className="break-all line-clamp-2" title={font.file_name ?? ''}>
                                                        Uploaded · {font.file_format ?? 'file'} · {formatFontSize(font.file_size)}
                                                    </div>
                                                ) : (
                                                    <div className="break-all line-clamp-2" title={font.link_url ?? ''}>
                                                        Link ({font.link_kind === 'file' ? 'font file' : 'stylesheet'}) · {font.link_url}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 pr-3 align-top">
                                                <Switch
                                                    checked={isActive(font.is_active)}
                                                    disabled={updateFont.isPending}
                                                    onCheckedChange={(v) =>
                                                        updateFont.mutate({ id: font.id, data: { is_active: v ? 1 : 0 } })
                                                    }
                                                />
                                            </td>
                                            <td className="py-3 text-right align-top">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteTarget(font)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <DeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteFont.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
                    }
                }}
                isDeleting={deleteFont.isPending}
                title="Delete Font"
                /* Says what actually happens: a template keeps the NAME, so it
                   is the look that changes, not the template that breaks. */
                description={
                    deleteTarget
                        ? `Delete "${deleteTarget.name}"? Templates that use it keep its name but will be drawn in a default font.`
                        : ''
                }
            />
        </div>
    );
}
