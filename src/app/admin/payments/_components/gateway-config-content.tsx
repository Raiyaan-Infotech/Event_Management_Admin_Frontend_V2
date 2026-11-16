"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
    ArrowLeft, Eye, EyeOff, Save, ExternalLink,
    Info, Key, Settings2, CreditCard, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/common/page-loader";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { useSettingsByGroup, useBulkUpdateSettings } from "@/hooks/use-settings";
import { GATEWAYS, type GatewayDef } from "../_components/payments-content";
import { toast } from "@/lib/toast";

// ─── Gateway field definitions ────────────────────────────────────────────────

interface FieldDef {
    key: string;
    label: string;
    type: "text" | "password" | "select" | "textarea" | "toggle";
    placeholder?: string;
    hint?: string;
    options?: { value: string; label: string }[];
    section?: string;
}

const GATEWAY_FIELDS: Record<string, FieldDef[]> = {
    stripe: [
        { key: "stripe_name", label: "Display Name", type: "text", placeholder: "e.g. Pay online via Stripe", section: "General" },
        { key: "stripe_description", label: "Description", type: "textarea", placeholder: "Short description shown at checkout", section: "General" },
        { key: "stripe_test_mode", label: "Test Mode", type: "toggle", hint: "Enable to use Stripe test keys", section: "General" },
        { key: "stripe_publishable_key", label: "Publishable Key", type: "text", placeholder: "pk_live_…", section: "API Keys" },
        { key: "stripe_secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_…", section: "API Keys" },
        { key: "stripe_webhook_secret", label: "Webhook Secret", type: "password", placeholder: "whsec_…", section: "API Keys" },
        { key: "stripe_payment_type", label: "Payment Type", type: "select", options: [{ value: "checkout", label: "Stripe Checkout" }, { value: "elements", label: "Stripe Elements" }], section: "Advanced" },
        { key: "stripe_processing_fee", label: "Processing Fee (%)", type: "text", placeholder: "0", hint: "Extra fee charged to customer. Enter 0 for none.", section: "Advanced" },
        { key: "stripe_currency", label: "Default Currency", type: "text", placeholder: "USD", section: "Advanced" },
    ],
    paypal: [
        { key: "paypal_name", label: "Display Name", type: "text", placeholder: "Pay via PayPal", section: "General" },
        { key: "paypal_description", label: "Description", type: "textarea", placeholder: "Fast and safe online payment", section: "General" },
        { key: "paypal_mode", label: "Mode", type: "select", options: [{ value: "sandbox", label: "Sandbox (Test)" }, { value: "live", label: "Live" }], section: "General" },
        { key: "paypal_client_id", label: "Client ID", type: "text", placeholder: "AY…", section: "API Keys" },
        { key: "paypal_secret", label: "Client Secret", type: "password", placeholder: "EL…", section: "API Keys" },
        { key: "paypal_processing_fee", label: "Processing Fee (%)", type: "text", placeholder: "0", section: "Advanced" },
        { key: "paypal_currency", label: "Currency", type: "text", placeholder: "USD", section: "Advanced" },
    ],
    razorpay: [
        { key: "razorpay_name", label: "Display Name", type: "text", placeholder: "Pay via Razorpay", section: "General" },
        { key: "razorpay_description", label: "Description", type: "textarea", placeholder: "Cards, UPI, wallets & more", section: "General" },
        { key: "razorpay_test_mode", label: "Test Mode", type: "toggle", section: "General" },
        { key: "razorpay_key_id", label: "Key ID", type: "text", placeholder: "rzp_live_…", section: "API Keys" },
        { key: "razorpay_key_secret", label: "Key Secret", type: "password", placeholder: "••••••••", section: "API Keys" },
        { key: "razorpay_processing_fee", label: "Processing Fee (%)", type: "text", placeholder: "0", section: "Advanced" },
        { key: "razorpay_currency", label: "Currency", type: "text", placeholder: "INR", section: "Advanced" },
    ],
    paystack: [
        { key: "paystack_name", label: "Display Name", type: "text", placeholder: "Pay via Paystack", section: "General" },
        { key: "paystack_description", label: "Description", type: "textarea", placeholder: "Secure payments across Africa", section: "General" },
        { key: "paystack_test_mode", label: "Test Mode", type: "toggle", section: "General" },
        { key: "paystack_public_key", label: "Public Key", type: "text", placeholder: "pk_live_…", section: "API Keys" },
        { key: "paystack_secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_…", section: "API Keys" },
        { key: "paystack_processing_fee", label: "Processing Fee (%)", type: "text", placeholder: "0", section: "Advanced" },
        { key: "paystack_currency", label: "Currency", type: "text", placeholder: "NGN", section: "Advanced" },
    ],
    mollie: [
        { key: "mollie_name", label: "Display Name", type: "text", placeholder: "Pay via Mollie", section: "General" },
        { key: "mollie_description", label: "Description", type: "textarea", placeholder: "European online payments", section: "General" },
        { key: "mollie_test_mode", label: "Test Mode", type: "toggle", section: "General" },
        { key: "mollie_api_key", label: "API Key", type: "password", placeholder: "live_…", section: "API Keys" },
        { key: "mollie_processing_fee", label: "Processing Fee (%)", type: "text", placeholder: "0", section: "Advanced" },
    ],
    flutterwave: [
        { key: "flutterwave_name", label: "Display Name", type: "text", placeholder: "Pay via Flutterwave", section: "General" },
        { key: "flutterwave_description", label: "Description", type: "textarea", placeholder: "Pan-African payment platform", section: "General" },
        { key: "flutterwave_test_mode", label: "Test Mode", type: "toggle", section: "General" },
        { key: "flutterwave_public_key", label: "Public Key", type: "text", placeholder: "FLWPUBK_TEST-…", section: "API Keys" },
        { key: "flutterwave_secret_key", label: "Secret Key", type: "password", placeholder: "FLWSECK_TEST-…", section: "API Keys" },
        { key: "flutterwave_encryption_key", label: "Encryption Key", type: "password", placeholder: "••••••••", section: "API Keys" },
        { key: "flutterwave_processing_fee", label: "Processing Fee (%)", type: "text", placeholder: "0", section: "Advanced" },
        { key: "flutterwave_currency", label: "Currency", type: "text", placeholder: "NGN", section: "Advanced" },
    ],
};

const GATEWAY_DOCS: Record<string, { steps: { text: string; link?: { label: string; href: string } }[]; webhookUrl?: string }> = {
    stripe: {
        steps: [
            { text: "Register with Stripe", link: { label: "Stripe Dashboard", href: "https://dashboard.stripe.com/register" } },
            { text: "Find your API keys under Developers → API keys" },
            { text: "For webhooks, go to Developers → Webhooks and add your endpoint" },
            { text: "Select events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed, charge.refunded" },
            { text: "Copy the Signing Secret and paste it as Webhook Secret below" },
        ],
        webhookUrl: "/api/webhooks/stripe",
    },
    paypal: {
        steps: [
            { text: "Create a PayPal Developer account", link: { label: "developer.paypal.com", href: "https://developer.paypal.com" } },
            { text: "Create an App under My Apps & Credentials" },
            { text: "Copy Client ID and Secret from the app details" },
            { text: "Switch to Live mode when ready for production" },
        ],
    },
    razorpay: {
        steps: [
            { text: "Sign up at Razorpay", link: { label: "razorpay.com", href: "https://razorpay.com" } },
            { text: "Go to Settings → API Keys → Generate Key" },
            { text: "Copy the Key ID and Key Secret" },
            { text: "For webhooks, go to Settings → Webhooks" },
        ],
        webhookUrl: "/api/webhooks/razorpay",
    },
    paystack: {
        steps: [
            { text: "Create an account at Paystack", link: { label: "dashboard.paystack.com", href: "https://dashboard.paystack.com" } },
            { text: "Navigate to Settings → API Keys & Webhooks" },
            { text: "Copy your Public Key and Secret Key" },
            { text: "Set the webhook URL in your Paystack dashboard" },
        ],
        webhookUrl: "/api/webhooks/paystack",
    },
    mollie: {
        steps: [
            { text: "Create a Mollie account", link: { label: "my.mollie.com", href: "https://my.mollie.com" } },
            { text: "Go to Developers → API keys" },
            { text: "Copy your Live API key (starts with live_)" },
            { text: "Use test_ key for testing" },
        ],
    },
    flutterwave: {
        steps: [
            { text: "Sign up at Flutterwave", link: { label: "flutterwave.com", href: "https://flutterwave.com" } },
            { text: "Go to Settings → API → Copy your keys" },
            { text: "Add webhook URL in Settings → Webhooks" },
        ],
        webhookUrl: "/api/webhooks/flutterwave",
    },
};

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
    const [visible, setVisible] = useState(false);

    if (field.type === "toggle") {
        return (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <span className="text-sm font-medium">{field.label}</span>
                <Switch checked={value === "true"} onCheckedChange={(c) => onChange(c ? "true" : "false")} />
            </div>
        );
    }
    if (field.type === "select") {
        return (
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                    {field.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }
    if (field.type === "textarea") {
        return <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={3} />;
    }
    if (field.type === "password") {
        return (
            <div className="relative">
                <Input
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="pr-10 font-mono text-sm"
                />
                <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setVisible(!visible)}
                >
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        );
    }
    return (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
    );
}

// ─── Config Page ──────────────────────────────────────────────────────────────

export default function GatewayConfigContent({ slug }: { slug: string }) {
    const gateway = GATEWAYS.find((g) => g.slug === slug);
    const fields = GATEWAY_FIELDS[slug] ?? [];
    const docs = GATEWAY_DOCS[slug];

    const { data: settings, isLoading } = useSettingsByGroup(slug);
    const bulkUpdate = useBulkUpdateSettings();
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!settings) return;
        const init: Record<string, string> = {};
        for (const f of fields) init[f.key] = settings.find((s) => s.key === f.key)?.value ?? "";
        setValues(init);
    }, [settings]);

    if (!gateway) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold">Unknown payment gateway</h2>
                <Link href="/admin/payments" className="text-primary hover:underline mt-2 text-sm">← Back to Payment Methods</Link>
            </div>
        );
    }

    const sections = [...new Set(fields.map((f) => f.section ?? "General"))];
    const isConfigured = !!(values[gateway.primaryKeyField]);

    const handleSave = () => {
        bulkUpdate.mutate({ group: slug, ...values });
    };

    return (
        <PermissionGuard permission="payments.view">
            <PageLoader open={isLoading || bulkUpdate.isPending} />

            <div className="space-y-6">
                {/* ── Top Bar ── */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/payments">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center border bg-muted"
                            >
                                {gateway.logo}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">{gateway.name} Configuration</h1>
                                <p className="text-xs text-muted-foreground">{gateway.tagline}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isConfigured ? (
                            <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Configured
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-300 dark:text-amber-400">
                                <AlertCircle className="w-3 h-3" /> Setup Required
                            </Badge>
                        )}
                        <Button onClick={handleSave} isLoading={bulkUpdate.isPending} className="gap-2">
                            <Save className="w-4 h-4" />
                            {bulkUpdate.isPending ? "Saving…" : "Save Changes"}
                        </Button>
                    </div>
                </div>

                {/* ── Two-column layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* LEFT: Instructions */}
                    <div className="lg:col-span-2 space-y-4">
                        {docs && (
                            <div className="rounded-2xl border bg-card p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Info className="w-4 h-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-sm">Setup Instructions</h3>
                                </div>

                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                    To use {gateway.name}, follow these steps:
                                </p>

                                <ol className="space-y-3">
                                    {docs.steps.map((step, i) => (
                                        <li key={i} className="flex gap-3 text-sm">
                                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold mt-0.5">
                                                {i + 1}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {step.text}
                                                {step.link && (
                                                    <a
                                                        href={step.link.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-1 text-primary hover:underline inline-flex items-center gap-0.5"
                                                    >
                                                        {step.link.label} <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ol>

                                {docs.webhookUrl && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Webhook URL</p>
                                            <code className="block text-xs bg-muted rounded-lg p-2.5 break-all font-mono">
                                                {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}
                                                {docs.webhookUrl}
                                            </code>
                                            <p className="text-xs text-muted-foreground">Add this URL in your {gateway.name} dashboard.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Form */}
                    <div className="lg:col-span-3 space-y-4">
                        {sections.map((section) => {
                            const sectionFields = fields.filter((f) => (f.section ?? "General") === section);
                            const icon = section === "API Keys" ? <Key className="w-4 h-4 text-primary" /> : <Settings2 className="w-4 h-4 text-primary" />;

                            return (
                                <div key={section} className="rounded-2xl border bg-card overflow-hidden">
                                    {/* Section header */}
                                    <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-b">
                                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                                            {icon}
                                        </div>
                                        <h3 className="font-semibold text-sm">{section}</h3>
                                        {section === "API Keys" && (
                                            <Badge variant="secondary" className="ml-auto text-[10px]">
                                                <Key className="w-2.5 h-2.5 mr-1" /> Encrypted
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="p-5 space-y-4">
                                        {sectionFields.map((field) => (
                                            <div key={field.key} className="space-y-1.5">
                                                {field.type !== "toggle" && (
                                                    <Label htmlFor={field.key} className="text-sm font-medium">
                                                        {field.label}
                                                    </Label>
                                                )}
                                                <FieldInput
                                                    field={field}
                                                    value={values[field.key] ?? ""}
                                                    onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                                                />
                                                {field.hint && (
                                                    <p className="text-xs text-muted-foreground">{field.hint}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Save footer */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Link href="/admin/payments">
                                <Button variant="outline">Cancel</Button>
                            </Link>
                            <Button onClick={handleSave} isLoading={bulkUpdate.isPending} className="gap-2 min-w-32">
                                <Save className="w-4 h-4" />
                                {bulkUpdate.isPending ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
