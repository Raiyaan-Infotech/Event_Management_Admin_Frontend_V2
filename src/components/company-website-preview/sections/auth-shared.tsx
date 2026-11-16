'use client';

/**
 * Pieces shared by the login and signup screens.
 *
 * Both screens need the same mobile-number field, the same 6-box OTP entry and
 * the same social sign-in flow, so they live here rather than being written
 * twice and drifting apart.
 *
 * ── Colour ──────────────────────────────────────────────────────────────────
 * No palette in this file. Everything tints from `theme.primaryButton` through
 * `tintOf()`, which mixes the tenant's own colour at render time. The only
 * fixed colours are the providers' brand marks (a recoloured Google "G" is not
 * the Google mark) and one semantic success green — that is state, not brand.
 *
 * ── Not wired to a backend ──────────────────────────────────────────────────
 * Nothing here talks to an API. "Send OTP", "Verify", the account chooser and
 * the provider buttons all advance LOCAL state so the flow can be reviewed
 * end to end. The account list and the +91 98765 43210 number are placeholder
 * data taken from the mockup, clearly marked below. Replace each step's
 * handler with the real call when the auth endpoints exist.
 */

import * as React from 'react';
import { toast } from '@/lib/toast';
import { Check, ChevronDown, Send, ShieldCheck, ArrowRight, ArrowLeft, X, Lock } from 'lucide-react';
import { useWebsiteLanguage } from '../website-language-provider';

// Success/verified state. Semantic, not the tenant's brand colour — a failed
// state would be red on every tenant too.
export const SUCCESS_COLOR = '#16A34A';

/** Mixes softer steps of the tenant's own colour instead of hardcoding hex. */
export function tintOf(color: string) {
    return (percent: number) => `color-mix(in srgb, ${color} ${percent}%, #FFFFFF)`;
}

// ── Brand marks ──────────────────────────────────────────────────────────────
// The providers' own fixed marks. Deliberately NOT theme-driven. Inline because
// lucide carries no brand logos.

export function GoogleMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.19a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.17-2 3.45-4.95 3.45-8.39Z" />
            <path fill="#34A853" d="M12 24c3.12 0 5.73-1.04 7.64-2.81l-3.72-2.9c-1.03.7-2.35 1.11-3.92 1.11-3.01 0-5.56-2.03-6.47-4.76H1.68v2.99A11.99 11.99 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.53 14.64a7.2 7.2 0 0 1 0-4.6V7.05H1.68a12 12 0 0 0 0 10.58l3.85-3Z" />
            <path fill="#EA4335" d="M12 4.77c1.7 0 3.22.58 4.42 1.72l3.3-3.3C17.73 1.24 15.12 0 12 0 7.4 0 3.42 2.64 1.68 6.47l3.85 3c.91-2.73 3.46-4.7 6.47-4.7Z" />
        </svg>
    );
}

export function FacebookMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
        </svg>
    );
}

// ── Country codes ────────────────────────────────────────────────────────────
// Short list; the mockup only shows India. Extend when the backend defines the
// supported set — the value stored is the dial code.

export const COUNTRY_CODES = [
    { code: '+91', flag: '🇮🇳', label: 'India' },
    { code: '+1', flag: '🇺🇸', label: 'United States' },
    { code: '+44', flag: '🇬🇧', label: 'United Kingdom' },
    { code: '+971', flag: '🇦🇪', label: 'United Arab Emirates' },
    { code: '+65', flag: '🇸🇬', label: 'Singapore' },
];

// ── Mobile number field ──────────────────────────────────────────────────────

export function MobileNumberField({
    primary,
    label,
    value,
    onChange,
    dialCode,
    onDialCodeChange,
    id = 'mobile-number',
    placeholder = 'Enter your mobile number',
    required = false,
    error = false,
}: {
    primary: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    dialCode: string;
    onDialCodeChange: (value: string) => void;
    id?: string;
    placeholder?: string;
    /** Renders the * and lets the caller mark the field invalid. */
    required?: boolean;
    error?: boolean;
}) {
    const tint = tintOf(primary);
    const selected = COUNTRY_CODES.find((entry) => entry.code === dialCode) || COUNTRY_CODES[0];

    return (
        <div className="min-w-0">
            <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-bold text-slate-700">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div
                className={`flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${error ? 'border-rose-400' : 'border-slate-200'}`}
                style={{ ['--tw-ring-color' as string]: tint(30) }}
            >
                {/* Country code. A native select keeps keyboard and mobile
                    behaviour correct without rebuilding a listbox. */}
                <div className="relative flex shrink-0 items-center gap-1 border-r border-slate-200 pl-3 pr-7">
                    <span aria-hidden="true">{selected.flag}</span>
                    <span className="text-[13px] font-semibold text-slate-700">{selected.code}</span>
                    <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
                    <select
                        aria-label="Country code"
                        value={dialCode}
                        onChange={(event) => onDialCodeChange(event.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                    >
                        {COUNTRY_CODES.map((entry) => (
                            <option key={entry.code} value={entry.code}>
                                {entry.flag} {entry.code} — {entry.label}
                            </option>
                        ))}
                    </select>
                </div>
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={value}
                    // Digits only: a phone field that accepts letters just fails later.
                    onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder={placeholder}
                    className="h-11 min-w-0 flex-1 bg-white px-3 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400"
                />
            </div>
        </div>
    );
}

// ── OTP entry ────────────────────────────────────────────────────────────────

export function OtpInput({
    primary,
    length = 6,
    value,
    onChange,
}: {
    primary: string;
    length?: number;
    value: string;
    onChange: (value: string) => void;
}) {
    const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
    const digits = React.useMemo(
        () => Array.from({ length }, (_, index) => value[index] || ''),
        [value, length]
    );

    const write = (index: number, digit: string) => {
        const next = digits.slice();
        next[index] = digit;
        onChange(next.join('').slice(0, length));
    };

    const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value.replace(/\D/g, '');
        if (!raw) {
            write(index, '');
            return;
        }
        // Typing over a filled box, or pasting several digits into one box,
        // should fill forward rather than being truncated to a single cell.
        if (raw.length > 1) {
            const merged = (value.slice(0, index) + raw).slice(0, length);
            onChange(merged);
            inputsRef.current[Math.min(merged.length, length - 1)]?.focus();
            return;
        }
        write(index, raw);
        if (index < length - 1) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
        if (event.key === 'ArrowRight' && index < length - 1) inputsRef.current[index + 1]?.focus();
    };

    return (
        <div className="flex items-center justify-center gap-2">
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(node) => {
                        inputsRef.current[index] = node;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={handleChange(index)}
                    onKeyDown={handleKeyDown(index)}
                    aria-label={`Digit ${index + 1}`}
                    className="h-11 w-10 rounded-lg border text-center text-[16px] font-bold text-slate-900 outline-none transition focus:ring-2"
                    style={{
                        borderColor: digit ? primary : '#E2E8F0',
                        ['--tw-ring-color' as string]: tintOf(primary)(30),
                    }}
                />
            ))}
        </div>
    );
}

// ── Password rules ───────────────────────────────────────────────────────────

export interface PasswordRule {
    key: string;
    label: string;
    test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
    { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
    { key: 'number', label: 'Include a number', test: (v) => /\d/.test(v) },
    { key: 'uppercase', label: 'Include an uppercase letter', test: (v) => /[A-Z]/.test(v) },
];

export function PasswordRules({ password, rules = PASSWORD_RULES }: { password: string; rules?: PasswordRule[] }) {
    const { t } = useWebsiteLanguage();
    return (
        <ul className="flex flex-col gap-1">
            {rules.map((rule) => {
                const passed = rule.test(password);
                return (
                    <li key={rule.key} className="flex items-center gap-2 text-[12px]">
                        <Check
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: passed ? SUCCESS_COLOR : '#CBD5E1' }}
                        />
                        <span style={{ color: passed ? SUCCESS_COLOR : '#94A3B8' }}>
                            {t(`auth.password_rule.${rule.key}`, rule.label)}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

// ── Social sign-in flow ──────────────────────────────────────────────────────

export type AuthProvider = 'google' | 'facebook';

type FlowStep = 'account' | 'validating' | 'mobile' | 'otp' | 'success';

// Placeholder accounts from the mockup. There is no backend behind the chooser
// yet — the real provider returns these.
const DEMO_ACCOUNTS = [
    { name: 'Rohan Mehta', email: 'rohan.mehta@gmail.com' },
    { name: 'Anita Sharma', email: 'anita.sharma@gmail.com' },
    { name: 'Vikram Patel', email: 'vikram.patel@gmail.com' },
];

const RESEND_SECONDS = 45;

/**
 * The provider sign-in flow: account choice → validating → mobile → OTP → done.
 *
 * One dialog for both providers. Only the inner box changes between steps; the
 * shell, the brand line and the reassurance footer stay put, so the flow reads
 * as one continuous screen rather than five different modals.
 */
export function AuthFlowDialog({
    open,
    provider,
    primary,
    companyName,
    onClose,
}: {
    open: boolean;
    provider: AuthProvider;
    primary: string;
    companyName: string;
    onClose: () => void;
}) {
    const { t } = useWebsiteLanguage();
    const tint = tintOf(primary);
    // Facebook has no account chooser in the reference, so it starts a step later.
    const firstStep: FlowStep = provider === 'google' ? 'account' : 'validating';

    const [step, setStep] = React.useState<FlowStep>(firstStep);
    const [account, setAccount] = React.useState(DEMO_ACCOUNTS[0]);
    const [dialCode, setDialCode] = React.useState('+91');
    const [mobile, setMobile] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [secondsLeft, setSecondsLeft] = React.useState(RESEND_SECONDS);

    // Reset whenever the dialog is (re)opened, so a second attempt does not
    // resume halfway through the previous one.
    React.useEffect(() => {
        if (!open) return;
        setStep(firstStep);
        setAccount(DEMO_ACCOUNTS[0]);
        setMobile('');
        setOtp('');
        setSecondsLeft(RESEND_SECONDS);
    }, [open, firstStep]);

    // The "validating" step is a fixed pause standing in for the real provider
    // round trip. Cleared on unmount so closing mid-flow cannot advance a
    // dialog that is no longer on screen.
    React.useEffect(() => {
        if (!open || step !== 'validating') return;
        const timer = setTimeout(() => setStep('mobile'), 1800);
        return () => clearTimeout(timer);
    }, [open, step]);

    React.useEffect(() => {
        if (!open || step !== 'otp' || secondsLeft <= 0) return;
        const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
        return () => clearTimeout(timer);
    }, [open, step, secondsLeft]);

    // Escape closes, and the body must not scroll behind the overlay.
    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    const ProviderMark = provider === 'google' ? GoogleMark : FacebookMark;
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';
    const maskedNumber = `${dialCode} ${mobile || '98765 43210'}`;
    const firstName = account.name.split(' ')[0];

    const reassurance = (
        <div className="mt-5 flex items-start justify-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: tint(8) }}>
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
            <p className="text-[11px] leading-4 text-slate-500">
                {t('auth.number_safe', 'Your number is safe with us. We never share your details.')}
            </p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Continue with ${providerLabel}`}
                className="relative max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Brand line — constant across every step except the account chooser,
                    which is the provider's own screen rather than ours. */}
                {step !== 'account' ? (
                    <p className="mb-5 text-center text-[15px] font-black" style={{ color: primary }}>
                        {companyName}
                    </p>
                ) : null}

                {/* ── Step: provider account chooser ──────────────────────── */}
                {step === 'account' ? (
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                            <ProviderMark className="h-4 w-4" />
                            <span className="text-[13px] font-medium text-slate-600">{t('auth.sign_in_with', 'Sign in with {provider}', { provider: providerLabel })}</span>
                        </div>
                        <h3 className="mt-4 text-[19px] font-bold text-slate-900">{t('auth.choose_account', 'Choose an account')}</h3>
                        <p className="text-[12.5px] text-slate-500">
                            {t('auth.to_continue_to', 'to continue to')} <span className="font-semibold" style={{ color: primary }}>{companyName}</span>
                        </p>

                        <ul className="mt-4 flex flex-col">
                            {DEMO_ACCOUNTS.map((entry) => (
                                <li key={entry.email}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAccount(entry);
                                            setStep('validating');
                                        }}
                                        className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition hover:bg-slate-50"
                                    >
                                        <span
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                            style={{ backgroundColor: tint(85) }}
                                        >
                                            {entry.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-[13px] font-semibold text-slate-800">{entry.name}</span>
                                            <span className="block truncate text-[12px] text-slate-500">{entry.email}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setStep('validating')}
                                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-slate-50"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400">
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                    <span className="text-[13px] font-medium text-slate-700">{t('auth.use_another_account', 'Use another account')}</span>
                                </button>
                            </li>
                        </ul>

                        <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-4 text-slate-400">
                            {t('auth.provider_share_notice', 'To continue, {provider} will share your name, email address, language preference and profile picture with {company}.', { provider: providerLabel, company: companyName })}
                        </p>
                    </div>
                ) : null}

                {/* ── Step: validating ────────────────────────────────────── */}
                {step === 'validating' ? (
                    <div className="flex min-w-0 flex-col items-center py-4 text-center">
                        <span
                            className="flex h-24 w-24 animate-spin items-center justify-center rounded-full border-2 border-dashed"
                            style={{ borderColor: tint(45), animationDuration: '3s' }}
                        >
                            <ProviderMark className="h-9 w-9" />
                        </span>
                        <p className="mt-5 text-[15px] font-bold text-slate-800">{t('auth.verifying_account', 'Verifying your account')}</p>
                        <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
                            {t('auth.validating_credentials', 'Please wait while we validate your {provider} credentials…', { provider: providerLabel })}
                        </p>
                        <div className="mt-5 flex items-start gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: tint(8) }}>
                            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                            <p className="text-[11px] leading-4 text-slate-500">
                                {t('auth.may_take_seconds', 'This may take a few seconds. Please do not close this window.')}
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* ── Step: mobile number ─────────────────────────────────── */}
                {step === 'mobile' ? (
                    <div className="min-w-0 text-center">
                        <h3 className="text-[19px] font-black text-slate-900">{t('auth.almost_there', 'Almost there!')}</h3>
                        <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
                            {t('auth.mobile_prompt_prefix', 'Please')}{' '}
                            <span className="font-semibold" style={{ color: primary }}>{t('auth.mobile_prompt_accent', 'enter your mobile number')}</span>{' '}
                            {t('auth.mobile_prompt_suffix', 'to secure your account.')}
                        </p>

                        <div className="mt-5 text-left">
                            <MobileNumberField
                                id="flow-mobile"
                                primary={primary}
                                label={t('auth.mobile_label', 'Mobile Number')}
                                value={mobile}
                                onChange={setMobile}
                                dialCode={dialCode}
                                onDialCodeChange={setDialCode}
                            />
                            <p className="mt-2 text-[11px] text-slate-400">
                                {t('auth.otp_notice', 'We will send you an OTP to verify your mobile number.')}
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={mobile.length < 6}
                            onClick={() => {
                                setSecondsLeft(RESEND_SECONDS);
                                setOtp('');
                                setStep('otp');
                            }}
                            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: primary }}
                        >
                            <Send className="h-4 w-4" />
                            {t('auth.send_otp', 'Send OTP')}
                        </button>
                        {reassurance}
                    </div>
                ) : null}

                {/* ── Step: OTP ───────────────────────────────────────────── */}
                {step === 'otp' ? (
                    <div className="min-w-0 text-center">
                        <h3 className="text-[19px] font-black text-slate-900">{t('auth.verify_otp', 'Verify OTP')}</h3>
                        <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
                            {t('auth.otp_sent_to', "We've sent a 6-digit OTP to")}{' '}
                            <span className="font-semibold text-slate-700">{maskedNumber}</span>{' '}
                            <button
                                type="button"
                                onClick={() => setStep('mobile')}
                                className="font-semibold hover:underline"
                                style={{ color: primary }}
                            >
                                {t('auth.edit', 'Edit')}
                            </button>
                        </p>

                        <p className="mb-2 mt-5 text-left text-[12.5px] font-bold text-slate-700">{t('auth.enter_otp', 'Enter OTP')}</p>
                        <OtpInput primary={primary} value={otp} onChange={setOtp} />

                        <p className="mt-4 text-[12px] text-slate-500">
                            {t('auth.didnt_receive', "Didn't receive the code?")}{' '}
                            {secondsLeft > 0 ? (
                                <span className="font-semibold text-slate-700">
                                    {t('auth.resend_in', 'Resend OTP in')} 00:{String(secondsLeft).padStart(2, '0')}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setSecondsLeft(RESEND_SECONDS)}
                                    className="font-semibold hover:underline"
                                    style={{ color: primary }}
                                >
                                    {t('auth.resend_otp', 'Resend OTP')}
                                </button>
                            )}
                        </p>

                        <button
                            type="button"
                            disabled={otp.length < 6}
                            onClick={() => setStep('success')}
                            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: primary }}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            {t('auth.verify_continue', 'Verify & Continue')}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('mobile')}
                            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition hover:text-slate-700"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            {t('auth.back', 'Back')}
                        </button>
                        {reassurance}
                    </div>
                ) : null}

                {/* ── Step: success ───────────────────────────────────────── */}
                {step === 'success' ? (
                    <div className="min-w-0 text-center">
                        <span
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                            style={{ backgroundColor: SUCCESS_COLOR }}
                        >
                            <Check className="h-8 w-8 text-white" strokeWidth={3} />
                        </span>
                        <h3 className="mt-4 text-[19px] font-black text-slate-900">
                            {t('auth.welcome_name', 'Welcome, {name}!', { name: firstName })} <span aria-hidden="true">🎉</span>
                        </h3>
                        <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
                            {t('auth.login_success', 'You have successfully logged in to your account.')}
                        </p>

                        {/* Inert: there is no dashboard route on the public site yet. */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99]"
                            style={{ backgroundColor: primary }}
                        >
                            {t('auth.go_to_dashboard', 'Go to Dashboard')}
                            <ArrowRight className="h-4 w-4" />
                        </button>

                        <div className="my-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-slate-200" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('auth.or', 'OR')}</span>
                            <span className="h-px flex-1 bg-slate-200" />
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            {t('auth.explore_events', 'Explore My Events')}
                        </button>

                        <div className="mt-4 rounded-lg p-3 text-left" style={{ backgroundColor: tint(8) }}>
                            <p className="text-[12px] font-bold text-slate-800">{t('auth.start_creating', 'Start creating amazing events')}</p>
                            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                                {t('auth.start_creating_subtitle', 'Design, manage guests and create unforgettable experiences.')}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ── Social buttons ───────────────────────────────────────────────────────────

/**
 * Google + Facebook only. Apple was removed from the UI on request; add it back
 * here (and nowhere else) if that decision is reversed.
 */
export function SocialButtons({
    primaryText,
    labelFor,
    onSelect,
}: {
    primaryText: string;
    labelFor: (provider: AuthProvider, fallback: string) => string;
    onSelect: (provider: AuthProvider) => void;
}) {
    const providers: { key: AuthProvider; label: string; Mark: (props: { className?: string }) => React.JSX.Element }[] = [
        { key: 'google', label: 'Continue with Google', Mark: GoogleMark },
        { key: 'facebook', label: 'Continue with Facebook', Mark: FacebookMark },
    ];

    return (
        <div className="flex flex-col gap-2.5">
            {providers.map(({ key, label, Mark }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onSelect(key)}
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold transition hover:bg-slate-50 active:scale-[0.99]"
                    style={{ color: primaryText }}
                >
                    <Mark className="h-[18px] w-[18px] shrink-0" />
                    <span className="break-words">{labelFor(key, label)}</span>
                </button>
            ))}
        </div>
    );
}

// ── Social sign-in ───────────────────────────────────────────────────────────

/**
 * Where the browser goes when a provider button is pressed.
 *
 * A full-page navigation, not a fetch: the visitor has to physically leave for
 * accounts.google.com and come back, which an XHR cannot do. The backend holds
 * the client secret and does the code exchange; nothing sensitive is ever here.
 *
 * `return_to` is the page they are standing on, so the callback can send them
 * back to it. The backend re-checks that URL against an allowlist — a signed
 * state alone would not stop this being an open redirect.
 */
export function startSocialAuth(provider: AuthProvider) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1').replace(/\/$/, '');
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    window.location.href =
        `${apiBase}/public/website-clients/oauth/${provider}/start` +
        `?return_to=${encodeURIComponent(returnTo)}`;
}

/**
 * Raises a toast on the next tick rather than immediately.
 *
 * React runs effects bottom-up, so a section's mount effect fires BEFORE the
 * <Toaster> in the root layout has run its own subscribe effect. A toast raised
 * synchronously from here is published to no subscriber and silently dropped —
 * which is exactly why the sign-in confirmation never appeared, despite the
 * code being correct and deployed. One tick puts it after every mount effect,
 * Sonner's included.
 *
 * Only needed for toasts raised during mount. Anything fired from a click is
 * already long past this.
 */
const announce = (fn: () => void) => {
    setTimeout(fn, 0);
};

/**
 * Reads the outcome the callback appended to the URL, shows it, and strips the
 * params so a refresh does not replay it.
 *
 * Returns the mobile-link token when the account still has no phone number, so
 * the caller can open the verification step. A provider never tells us a phone
 * number, so that step can only happen after the round trip.
 */
export function useSocialAuthResult() {
    const [mobileToken, setMobileToken] = React.useState<string | null>(null);

    // Held back while the mobile step runs, so "Login successful" lands LAST —
    // after the number and code — instead of before either.
    const pendingSuccess = React.useRef<string | null>(null);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const outcome = params.get('auth');
        if (!outcome) return;

        const token = params.get('needs_mobile') === '1' ? params.get('link_token') : null;

        if (outcome === 'success') {
            const name = params.get('name');
            const greeting = name ? `, ${name}` : '';
            const message =
                params.get('mode') === 'signup'
                    ? `Account created${greeting}. You are signed in.`
                    : `Login successful${greeting}`;

            if (token) {
                pendingSuccess.current = message;
                setMobileToken(token);
            } else {
                announce(() => toast.success(message));
            }
        } else if (outcome === 'cancelled') {
            announce(() => toast.message('Sign-in was cancelled.'));
        } else {
            const detail = params.get('message');
            announce(() => toast.error(detail || 'Sign-in failed. Please try again.'));
        }

        // `link_token` in particular must not survive in the address bar: it
        // authorises writing a phone number onto the account, so a pasted or
        // bookmarked URL would carry that power to whoever gets the link.
        ['auth', 'mode', 'provider', 'name', 'message', 'needs_mobile', 'link_token'].forEach(
            (key) => params.delete(key)
        );
        const query = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }, []);

    // Closing the mobile step — verified or skipped — is what finally confirms
    // the sign-in. No defer needed: this runs from a click, long after mount.
    const finishMobileStep = React.useCallback(() => {
        setMobileToken(null);
        const message = pendingSuccess.current;
        pendingSuccess.current = null;
        if (message) toast.success(message);
    }, []);

    return { mobileToken, clearMobileToken: finishMobileStep };
}

// -- Mobile verification after a social sign-in ------------------------------

const mobileApiBase = () =>
    (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1').replace(/\/$/, '');

async function postMobile(path: string, body: unknown) {
    const response = await fetch(`${mobileApiBase()}/public/website-clients/mobile/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    let data: any = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Something went wrong. Please try again.');
    }
    return data.data;
}

/**
 * Collects and verifies a phone number for an account that just signed in with
 * a provider.
 *
 * Not dismissible by clicking the backdrop: the token lives only in memory, so
 * closing this by accident loses the only chance to verify without signing in
 * again. "Skip for now" is an explicit choice, and the account works without a
 * number.
 */
export function MobileVerifyDialog({
    token,
    primary,
    onDone,
}: {
    token: string;
    primary: string;
    onDone: () => void;
}) {
    const [dialCode, setDialCode] = React.useState('+91');
    const [mobile, setMobile] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [sent, setSent] = React.useState(false);
    const [busy, setBusy] = React.useState(false);

    const send = async () => {
        setBusy(true);
        try {
            const result = await postMobile('send-otp', { token, dial_code: dialCode, mobile });
            setSent(true);
            // Delivery is not wired up — there is no SMS provider in the
            // backend — so in development the code comes back in the response.
            if (result?.dev_code) {
                setOtp(String(result.dev_code));
                toast.message(`Development code: ${result.dev_code}`);
            } else {
                toast.success('Verification code sent.');
            }
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const verify = async () => {
        setBusy(true);
        try {
            await postMobile('verify', { token, dial_code: dialCode, mobile, otp });
            // `onDone` raises the sign-in confirmation — see finishMobileStep.
            onDone();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full min-w-0 max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="break-words text-[18px] font-black tracking-tight text-slate-900">
                    Verify your mobile number
                </h2>
                <p className="mt-1 break-words text-[12.5px] leading-5 text-slate-500">
                    You are signed in. Add a mobile number to finish setting up your account.
                </p>

                <div className="mt-5 flex flex-col gap-4">
                    <MobileNumberField
                        primary={primary}
                        label="Mobile Number"
                        value={mobile}
                        onChange={setMobile}
                        dialCode={dialCode}
                        onDialCodeChange={setDialCode}
                        id="social-mobile"
                    />

                    {sent && (
                        <div className="min-w-0">
                            <p className="mb-2 text-[12.5px] font-bold text-slate-700">
                                Enter the 6-digit code
                            </p>
                            <OtpInput primary={primary} value={otp} onChange={setOtp} />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={sent ? verify : send}
                        disabled={busy || (sent ? otp.length !== 6 : mobile.trim().length < 7)}
                        className="h-11 w-full rounded-lg text-[13.5px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ backgroundColor: primary }}
                    >
                        {busy ? 'Please wait...' : sent ? 'Verify & Continue' : 'Send OTP'}
                    </button>

                    <div className="flex items-center justify-between">
                        {sent ? (
                            <button
                                type="button"
                                onClick={send}
                                disabled={busy}
                                className="text-[12px] font-semibold hover:underline disabled:opacity-50"
                                style={{ color: primary }}
                            >
                                Resend code
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            type="button"
                            onClick={onDone}
                            className="text-[12px] font-semibold text-slate-500 hover:underline"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
