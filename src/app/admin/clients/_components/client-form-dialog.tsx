'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { Eye, EyeOff } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/common/page-loader';
import {
    useCreateWebsiteClient,
    useUpdateWebsiteClient,
    type WebsiteClient,
} from '@/hooks/use-website-clients';
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ClientFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Null = create. */
    client: WebsiteClient | null;
}

const EMPTY = { name: '', email: '', dial_code: '+91', mobile: '', password: '', subscription_plan_id: '' };

/**
 * Mirrors `assertPasswordValid` in the backend's `websiteClient.service.js`.
 *
 * Duplicated deliberately so the failure is inline instead of a round trip that
 * comes back as a 400 toast. The backend stays the authority and rejects
 * anything this misses — a direct POST never passes through here at all.
 */
const passwordProblem = (value: string): string | null => {
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (!/\d/.test(value)) return 'Password must include a number.';
    if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
    return null;
};

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
    const isEdit = !!client;
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [showPassword, setShowPassword] = useState(false);
    // A typed-but-malformed password is a different failure from a missing one,
    // so it gets its own inline message rather than the mandatory-fields toast.
    const [passwordHint, setPasswordHint] = useState<string | null>(null);
    // Only active plans — assigning an inactive one leaves the client
    // with a portal that refuses to offer them anything.
    const { data: plans } = useSubscriptionPlans({ limit: 200, is_active: 1 });

    const createClient = useCreateWebsiteClient();
    const updateClient = useUpdateWebsiteClient();
    const busy = createClient.isPending || updateClient.isPending;

    // Re-seed whenever the dialog opens or the target row changes, so a second
    // open never shows the previous client's values.
    useEffect(() => {
        if (!open) return;
        setErrors({});
        setShowPassword(false);
        setPasswordHint(null);
        setForm(
            client
                ? {
                      name: client.name || '',
                      email: client.email || '',
                      dial_code: client.dial_code || '+91',
                      subscription_plan_id: client.subscription_plan_id ? String(client.subscription_plan_id) : '',
                      mobile: client.mobile || '',
                      // Never round-trip a hash into an editable field. Blank
                      // means "leave the password alone".
                      password: '',
                  }
                : EMPTY
        );
    }, [open, client]);

    // Functional updater: a `{ ...form }` spread writes back a stale snapshot
    // when two fields change in the same tick.
    const set = (key: keyof typeof EMPTY, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: false }));
        if (key === 'password') setPasswordHint(null);
    };

    const handleSave = () => {
        const nextErrors = {
            name: !form.name.trim(),
            email: !form.email.trim(),
            // MANDATORY on create. There is no forgot-password, set-password or
            // invite flow anywhere in this system, so a client saved without one
            // can never sign in and nothing tells the admin why — the portal just
            // answers "Invalid email or password" forever. On EDIT it stays
            // optional, where blank correctly means "leave the password alone".
            password: !isEdit && !form.password.trim(),
        };
        setErrors(nextErrors);
        if (Object.values(nextErrors).some(Boolean)) {
            setPasswordHint(null);
            toast.error('Please fill all mandatory fields.');
            return;
        }

        const problem = form.password ? passwordProblem(form.password) : null;
        setPasswordHint(problem);
        if (problem) {
            setErrors((prev) => ({ ...prev, password: true }));
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            dial_code: form.dial_code || '+91',
            mobile: form.mobile || null,
            // '' is the "No plan" option; the backend normalises it to NULL.
            subscription_plan_id: form.subscription_plan_id ? Number(form.subscription_plan_id) : null,
            // Only sent when actually typed — an empty box must not clear or
            // rewrite an existing password.
            ...(form.password ? { password: form.password } : {}),
        };

        const onSuccess = () => onOpenChange(false);
        if (isEdit && client) {
            updateClient.mutate({ id: client.id, data: payload }, { onSuccess });
        } else {
            createClient.mutate(payload, { onSuccess });
        }
    };

    return (
        <>
            <PageLoader open={busy} />
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-2">
                        <div>
                            <Label htmlFor="client-name">
                                Full Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="client-name"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="Enter full name"
                                className={errors.name ? 'border-destructive' : ''}
                            />
                        </div>

                        <div>
                            <Label htmlFor="client-email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="client-email"
                                type="email"
                                value={form.email}
                                onChange={(e) => set('email', e.target.value)}
                                placeholder="Enter email address"
                                className={errors.email ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="grid grid-cols-[90px_1fr] gap-2">
                            <div>
                                <Label htmlFor="client-dial">Code</Label>
                                <Input
                                    id="client-dial"
                                    value={form.dial_code}
                                    onChange={(e) => set('dial_code', e.target.value)}
                                    placeholder="+91"
                                />
                            </div>
                            <div>
                                <Label htmlFor="client-mobile">Mobile</Label>
                                <Input
                                    id="client-mobile"
                                    inputMode="numeric"
                                    value={form.mobile}
                                    // Digits only — a phone field that accepts
                                    // letters just fails later.
                                    onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 15))}
                                    placeholder="Enter mobile number"
                                />
                            </div>
                        </div>

                        {/* The plan is what the client portal reads to decide what
                            this client may create: it is scoped to an event
                            category and grants a specific set of
                            menus. No plan = they can create nothing. */}
                        <div>
                            <Label htmlFor="client-plan">Subscription Plan</Label>
                            <Select
                                value={form.subscription_plan_id || 'none'}
                                onValueChange={(v) => set('subscription_plan_id', v === 'none' ? '' : v)}
                            >
                                <SelectTrigger id="client-plan">
                                    <SelectValue placeholder="No plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No plan</SelectItem>
                                    {(plans?.data ?? []).map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Decides which event categories and menus this client can use in their portal.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="client-password">
                                Password{' '}
                                {isEdit ? (
                                    <span className="text-muted-foreground">(leave blank to keep current)</span>
                                ) : (
                                    <span className="text-destructive">*</span>
                                )}
                            </Label>
                            {/* The eye button is positioned against this wrapper
                                only, so nothing else may live inside it. */}
                            <div className="relative">
                                <Input
                                    id="client-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={(e) => set('password', e.target.value)}
                                    placeholder={isEdit ? 'Unchanged' : 'At least 8 chars, 1 number, 1 uppercase'}
                                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {/* Outside the relative wrapper on purpose — the eye
                                button is positioned against it, so an extra child
                                inside pushes it off centre. */}
                            {passwordHint ? (
                                <p className="mt-1 text-[11px] text-destructive">{passwordHint}</p>
                            ) : !isEdit ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Required — the client signs in to the portal with this. There is no
                                    password-reset flow, so an account saved without one cannot sign in.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={busy}>
                            {isEdit ? 'Save Changes' : 'Add Client'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
