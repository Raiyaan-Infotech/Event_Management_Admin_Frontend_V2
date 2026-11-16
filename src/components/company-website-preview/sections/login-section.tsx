'use client';

/**
 * Client login screen for the tenant site.
 *
 * This is the END-USER login ("log in to your <company> account"), not the
 * admin panel's `/auth/login` — that one signs into the admin dashboard with a
 * different JWT and keeps its own styling.
 *
 * Renders as a normal page of the site — inside the site header and footer, in
 * the same max-w-[1280px] container every other section uses — rather than as a
 * standalone full-bleed screen.
 *
 * ── Structure from the mockup, colour from the API ───────────────────────────
 * Only the LAYOUT is taken from the design. There is no palette in this file:
 * every colour traces back to `theme` (which `parseThemeColors` builds from the
 * company's theme_settings row), and the softer tints are mixed from those same
 * values with `color-mix` rather than being written out as hex. A tenant whose
 * brand is not pink does not get a pink login screen.
 *
 * ── Not wired to a backend yet ──────────────────────────────────────────────
 * `onSubmit` and the three social buttons are intentionally inert. The auth
 * endpoints are separate work; nothing here fakes a success state, because a
 * login form that appears to work is worse than one that visibly does nothing.
 *
 * ── Where the copy will come from ───────────────────────────────────────────
 * The left panel's title/subtitle/features/testimonial are PROPS with shipped
 * defaults. The builder already has a "Login Page" section (eyebrow, title,
 * description) whose editor describes itself as customising the "client login
 * panel background image, copy, and bullet features" — pass that data in here
 * when it is exposed, rather than editing these defaults.
 */

import * as React from 'react';
import { toast } from '@/lib/toast';
import { loginWebsiteClient } from '@/lib/website-client-auth';
import { Mail, Lock, Eye, EyeOff, Send, ShieldCheck, Star, Sparkles, Users, LineChart } from 'lucide-react';
import type { ThemeColors } from './preview-shared';
import {
    tintOf,
    MobileNumberField,
    OtpInput,
    SocialButtons,
    startSocialAuth,
    useSocialAuthResult,
    MobileVerifyDialog,
    type AuthProvider,
} from './auth-shared';
import { useWebsiteLanguage } from '../website-language-provider';

/**
 * Where a signed-in client lands. Separate app on its own origin, so this is a
 * full page navigation rather than a router push.
 *
 * Env-driven because the portal's origin differs per environment; the literal
 * is only the local-dev default.
 */
const CLIENT_PORTAL_URL =
    process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || 'http://localhost:3005/dashboard';


// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginFeature {
    /** Stable key, also used as the translation key suffix. */
    key: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export interface LoginTestimonial {
    quote: string;
    name: string;
    role: string;
    /** Optional portrait. Empty renders initials — never an empty <img src>. */
    photoUrl?: string;
    rating?: number;
}

interface LoginSectionProps {
    theme: ThemeColors;
    companyName?: string;
    onNavigate?: (href: string) => void;
    panelTitle?: string;
    panelSubtitle?: string;
    features?: LoginFeature[];
    testimonial?: LoginTestimonial | null;
}

// ── Shipped defaults ─────────────────────────────────────────────────────────

const DEFAULT_FEATURES: LoginFeature[] = [
    {
        key: 'invitations',
        title: 'Beautiful Invitations',
        description: 'Create stunning invitations for any event in minutes.',
        icon: Sparkles,
    },
    {
        key: 'manage',
        title: 'Manage Easily',
        description: 'Manage guests, RSVPs and communications all in one place.',
        icon: Users,
    },
    {
        key: 'track',
        title: 'Track & Analyze',
        description: 'Get real-time insights and analytics for your events.',
        icon: LineChart,
    },
    {
        key: 'secure',
        title: 'Secure & Private',
        description: 'Your data is safe with us. We never share your information.',
        icon: Lock,
    },
];

const DEFAULT_TESTIMONIAL: LoginTestimonial = {
    quote: 'Event Invit made planning our wedding so easy and fun!',
    name: 'Sarah J.',
    role: 'Wedding Planner',
    rating: 5,
};

// ── Illustration ─────────────────────────────────────────────────────────────
// Built from markup rather than shipped as a flat asset, because it has to
// recolour with the tenant's theme — a PNG could not. Purely decorative, so it
// is hidden from assistive tech.

function InvitationArtwork({ theme }: { theme: ThemeColors }) {
    const primary = theme.primaryButton;
    // Softer steps of the SAME theme colour, mixed at render time rather than
    // written out as separate hex values.
    const tint = (percent: number) => `color-mix(in srgb, ${primary} ${percent}%, #FFFFFF)`;

    return (
        <div className="relative mx-auto w-full max-w-[360px] select-none" aria-hidden="true">
            {/* Device / editor frame */}
            <div className="relative flex overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200/70">
                {/* Left rail */}
                <div className="flex w-9 flex-col items-center gap-2.5 py-3" style={{ backgroundColor: theme.primaryText }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    <span className="h-4 w-4 rounded-[4px] bg-white/25" />
                    <span className="h-4 w-4 rounded-[4px] bg-white/15" />
                </div>

                <div className="flex-1 p-3">
                    {/* Toolbar */}
                    <div className="mb-2.5 h-1.5 w-full rounded-full bg-slate-100" />

                    {/* The invitation card */}
                    <div
                        className="relative overflow-hidden rounded-md border px-4 py-5 text-center"
                        style={{
                            borderColor: tint(25),
                            backgroundImage: `linear-gradient(180deg, ${tint(10)}, #FFFFFF 65%)`,
                        }}
                    >
                        {/* Floral corner sprigs */}
                        {[
                            'left-1 top-1',
                            'right-1 top-1 -scale-x-100',
                            'left-1 bottom-1 -scale-y-100',
                            'right-1 bottom-1 -scale-x-100 -scale-y-100',
                        ].map((position) => (
                            <svg
                                key={position}
                                viewBox="0 0 40 40"
                                className={`absolute h-8 w-8 ${position}`}
                                style={{ color: tint(55) }}
                            >
                                <path d="M4 36C10 28 14 22 16 14" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                                <ellipse cx="10" cy="26" rx="4.5" ry="2.6" fill="currentColor" opacity="0.6" transform="rotate(-35 10 26)" />
                                <ellipse cx="15" cy="18" rx="4" ry="2.3" fill="currentColor" opacity="0.45" transform="rotate(-40 15 18)" />
                                <circle cx="17" cy="11" r="3.2" fill="currentColor" opacity="0.75" />
                                <circle cx="17" cy="11" r="1.2" fill="#FFFFFF" opacity="0.8" />
                            </svg>
                        ))}

                        <p className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: primary }}>
                            You&apos;re Invited!
                        </p>
                        <p className="mt-0.5 text-[6.5px] font-medium uppercase tracking-[0.14em]" style={{ color: theme.secondaryText }}>
                            To a Special Celebration
                        </p>

                        <p
                            className="mt-2 text-[15px] font-semibold italic"
                            style={{ color: theme.primaryText, fontFamily: 'Georgia, serif' }}
                        >
                            Emma &amp; David
                        </p>

                        <div className="mt-1.5 flex items-center justify-center gap-2">
                            <span className="h-px w-5" style={{ backgroundColor: tint(45) }} />
                            <span className="text-[11px] font-bold" style={{ color: theme.primaryText }}>25</span>
                            <span className="h-px w-5" style={{ backgroundColor: tint(45) }} />
                        </div>
                        <p className="mt-0.5 text-[7px] font-semibold tracking-[0.16em]" style={{ color: theme.secondaryText }}>
                            2025
                        </p>

                        <span
                            className="mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[7.5px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: primary }}
                        >
                            Edit Invitation
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Floating decorations ─────────────────────────────────────── */}

            {/* Envelope, left */}
            <div
                className="absolute -left-7 top-[38%] flex h-12 w-16 rotate-[-12deg] items-center justify-center rounded-md shadow-lg"
                style={{ backgroundColor: primary }}
            >
                <svg viewBox="0 0 64 48" className="h-full w-full">
                    <path d="M0 6l32 22L64 6" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.85" />
                </svg>
            </div>

            {/* Guest chip, right */}
            <div
                className="absolute -right-5 top-[32%] flex h-11 w-11 rotate-[8deg] items-center justify-center rounded-xl shadow-lg"
                style={{ backgroundColor: tint(85) }}
            >
                <Users className="h-5 w-5 text-white" />
            </div>

            {/* Gift box, bottom right */}
            <div className="absolute -bottom-3 right-2 h-14 w-16 rotate-[6deg]">
                <div className="absolute inset-x-0 bottom-0 h-9 rounded-md" style={{ backgroundColor: tint(30) }} />
                <div className="absolute inset-x-0 bottom-7 h-4 rounded-md shadow-sm" style={{ backgroundColor: primary }} />
                <div className="absolute bottom-0 left-1/2 h-9 w-2 -translate-x-1/2" style={{ backgroundColor: tint(65) }} />
                <div
                    className="absolute bottom-[2.4rem] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-sm"
                    style={{ backgroundColor: primary }}
                />
            </div>

            {/* Sparkles */}
            <Sparkles className="absolute -left-1 top-6 h-4 w-4" style={{ color: tint(70) }} />
            <Sparkles className="absolute right-6 top-1 h-3 w-3" style={{ color: tint(50) }} />
            <span className="absolute -right-1 bottom-16 h-2 w-2 rounded-full" style={{ backgroundColor: tint(60) }} />
            <span className="absolute left-6 -top-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tint(45) }} />
        </div>
    );
}

// ── Section ──────────────────────────────────────────────────────────────────

export function LoginSection({
    theme,
    companyName,
    onNavigate,
    panelTitle,
    panelSubtitle,
    features = DEFAULT_FEATURES,
    testimonial = DEFAULT_TESTIMONIAL,
}: LoginSectionProps) {
    const { t } = useWebsiteLanguage();
    const primary = theme.primaryButton;
    const company = companyName || 'Event Invit';
    const tint = tintOf(primary);

    const [showPassword, setShowPassword] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [dialCode, setDialCode] = React.useState('+91');
    const [mobile, setMobile] = React.useState('');
    const [mobileError, setMobileError] = React.useState(false);
    const [otpSent, setOtpSent] = React.useState(false);
    const [otp, setOtp] = React.useState('');
    // Which provider we are handing the browser off to, or null. Set purely so
    // the buttons can disable during the moment before the page navigates away.
    const [activeProvider, setActiveProvider] = React.useState<AuthProvider | null>(null);

    // Shows the result of a provider round trip, which comes back in the URL,
    // and hands back a token when the account still needs a phone number.
    const { mobileToken, clearMobileToken } = useSocialAuthResult();

    // Disables the button while in flight so a double click cannot double post.
    const [submitting, setSubmitting] = React.useState(false);
    // Held true across the navigation so the overlay does not flash off.
    const [redirecting, setRedirecting] = React.useState(false);

    // Verifies the credentials and stops there — no token comes back and there
    // is nowhere to redirect to, so the toast IS the outcome. Goes through
    // `website-client-auth`, NOT the shared apiClient, whose 401 handler would
    // read a wrong password here as the ADMIN's session expiring.
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;

        if (!email.trim() || !password) {
            toast.error('Please enter your email and password.');
            return;
        }

        // Mobile is MANDATORY on this form. The server verifies it against the
        // account when present, so requiring it here makes it a real second
        // factor rather than an optional box people skip.
        if (mobile.trim().length < 6) {
            setMobileError(true);
            toast.error('Please enter your mobile number.');
            return;
        }
        setMobileError(false);

        setSubmitting(true);
        const result = await loginWebsiteClient({
            email: email.trim(),
            password,
            dial_code: dialCode,
            // Always sent now — the field is mandatory, so the server always
            // has a number to verify against the account.
            mobile: mobile.trim(),
        });
        setSubmitting(false);

        if (result.ok) {
            toast.success(result.message || 'Login successful');
            setPassword('');

            // The session cookie is set by now, so hand the visitor to the
            // portal. A full page assignment, not a router push: the portal is
            // a separate app on its own origin.
            setRedirecting(true);
            window.location.assign(CLIENT_PORTAL_URL);
            return;
        } else {
            toast.error(result.message);
        }
    };

    // `/signup` is a real route; `/forgot-password` is not built yet, so that
    // one swallows the click rather than pushing to a 404. Drop it from the
    // set once the route exists — the markup already points at the right path.
    const UNBUILT_ROUTES = new Set(['/forgot-password']);
    const navigate = (href: string) => (event: React.MouseEvent) => {
        event.preventDefault();
        if (!onNavigate || UNBUILT_ROUTES.has(href)) return;
        onNavigate(href);
    };

    const inputClass =
        'h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[13.5px] outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2';

    return (
        // Same page container as every other section (max-w-[1280px] + the
        // standard responsive gutters), so the login screen lines up with the
        // header, footer and the rest of the site instead of running full-bleed.
        <section className="w-full bg-white py-16 sm:py-20">
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
                <div className="grid min-w-0 overflow-hidden rounded-2xl lg:grid-cols-2">
                    {/* ── Left: branded panel ─────────────────────────────── */}
                    <div
                        className="relative hidden min-w-0 flex-col justify-center gap-7 overflow-hidden p-8 xl:p-10 lg:flex"
                        style={{ backgroundImage: `linear-gradient(155deg, ${tint(13)} 0%, ${tint(5)} 55%, #FFFFFF 100%)` }}
                    >
                        <div className="min-w-0">
                            <h1
                                className="break-words text-[34px] font-black leading-tight tracking-tight"
                                style={{ color: theme.primaryText }}
                            >
                                {t('login.welcome_title', 'Welcome Back!')} <span aria-hidden="true">👋</span>
                            </h1>
                            <p className="mt-3 max-w-md break-words text-[14px] leading-6" style={{ color: theme.paragraph }}>
                                {t('login.welcome_subtitle', 'Log in to your {company} account and continue creating unforgettable moments.', { company })}
                            </p>
                        </div>

                        {panelTitle ? (
                            <div className="min-w-0">
                                <h2 className="break-words text-[18px] font-bold" style={{ color: theme.primaryText }}>
                                    {panelTitle}
                                </h2>
                                {panelSubtitle ? (
                                    <p className="mt-1 break-words text-[13px] leading-6" style={{ color: theme.paragraph }}>
                                        {panelSubtitle}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <InvitationArtwork theme={theme} />

                        {/* Feature list */}
                        <ul className="flex min-w-0 flex-col gap-4">
                            {features.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <li key={feature.key} className="flex min-w-0 items-start gap-3">
                                        <span
                                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                            style={{ backgroundColor: tint(14) }}
                                        >
                                            <Icon className="h-[18px] w-[18px]" style={{ color: primary }} />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="break-words text-[13.5px] font-bold" style={{ color: theme.primaryText }}>
                                                {t(`login.feature.${feature.key}.title`, feature.title)}
                                            </p>
                                            <p className="break-words text-[12.5px] leading-5" style={{ color: theme.paragraph }}>
                                                {t(`login.feature.${feature.key}.description`, feature.description)}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Testimonial */}
                        {testimonial ? (
                            <figure className="min-w-0 rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: testimonial.rating ?? 5 }).map((_, index) => (
                                        <Star key={index} className="h-3.5 w-3.5" style={{ color: primary, fill: primary }} />
                                    ))}
                                </div>
                                <blockquote className="mt-2 break-words text-[12.5px] italic leading-5" style={{ color: theme.paragraph }}>
                                    &ldquo;{t('login.testimonial.quote', testimonial.quote)}&rdquo;
                                </blockquote>
                                <figcaption className="mt-3 flex min-w-0 items-center gap-2.5">
                                    {/* An empty src makes the browser re-request the page as the image, so
                                        initials render instead of an <img> when there is no portrait. */}
                                    {testimonial.photoUrl ? (
                                        <img
                                            src={testimonial.photoUrl}
                                            alt={testimonial.name}
                                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                                            style={{ backgroundColor: tint(85) }}
                                        >
                                            {testimonial.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        <span className="block break-words text-[12.5px] font-bold" style={{ color: theme.primaryText }}>
                                            {testimonial.name}
                                        </span>
                                        <span className="block break-words text-[11.5px]" style={{ color: theme.secondaryText }}>
                                            {t('login.testimonial.role', testimonial.role)}
                                        </span>
                                    </span>
                                </figcaption>
                            </figure>
                        ) : null}
                    </div>

                    {/* ── Right: the form ─────────────────────────────────────────── */}
                    <div className="flex min-w-0 items-center justify-center bg-white px-0 py-2 sm:px-6 lg:py-8">
                        <div className="w-full min-w-0 max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <h2
                                className="break-words text-center text-[21px] font-black tracking-tight"
                                style={{ color: theme.primaryText }}
                            >
                                {t('login.card_title', 'Log in to your account')}
                            </h2>
                            <p className="mt-1.5 break-words text-center text-[12.5px]" style={{ color: theme.secondaryText }}>
                                {t('login.no_account', "Don't have an account?")}{' '}
                                <a
                                    href="/signup"
                                    onClick={navigate('/signup')}
                                    className="font-bold hover:underline"
                                    style={{ color: primary }}
                                >
                                    {t('login.sign_up', 'Sign up')}
                                </a>
                            </p>

                            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                                {/* Email */}
                                <div>
                                    <label
                                        htmlFor="login-email"
                                        className="mb-1.5 block text-[12.5px] font-bold"
                                        style={{ color: theme.primaryText }}
                                    >
                                        {t('login.email_label', 'Email Address')} <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="login-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder={t('login.email_placeholder', 'Enter your email address')}
                                            className={inputClass}
                                            style={{ color: theme.primaryText, ['--tw-ring-color' as string]: tint(30) }}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label
                                        htmlFor="login-password"
                                        className="mb-1.5 block text-[12.5px] font-bold"
                                        style={{ color: theme.primaryText }}
                                    >
                                        {t('login.password_label', 'Password')} <span className="text-rose-500">*</span>
                                    </label>
                                    {/* The eye toggle is positioned against THIS wrapper only. Anything
                                        else inside it (a hint line) shifts what -translate-y-1/2 centres on. */}
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder={t('login.password_placeholder', 'Enter your password')}
                                            className={inputClass}
                                            style={{ color: theme.primaryText, ['--tw-ring-color' as string]: tint(30) }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((previous) => !previous)}
                                            aria-label={showPassword ? t('login.hide_password', 'Hide password') : t('login.show_password', 'Show password')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile number + OTP. The OTP block only appears once the
                                    number has been sent, so the form is not cluttered with
                                    six empty boxes before there is anything to type into them. */}
                                <MobileNumberField
                                    id="login-mobile"
                                    primary={primary}
                                    label={t('login.mobile_label', 'Mobile Number')}
                                    placeholder={t('login.mobile_placeholder', 'Enter your mobile number')}
                                    value={mobile}
                                    onChange={setMobile}
                                    dialCode={dialCode}
                                    onDialCodeChange={setDialCode}
                                    required
                                    error={mobileError}
                                />

                                {otpSent ? (
                                    <div className="min-w-0 rounded-lg border border-slate-200 p-3">
                                        <p className="mb-2 text-[12.5px] font-bold" style={{ color: theme.primaryText }}>
                                            {t('login.otp_label', 'Enter OTP')}
                                        </p>
                                        <OtpInput primary={primary} value={otp} onChange={setOtp} />
                                        <p className="mt-2.5 text-center text-[11.5px]" style={{ color: theme.secondaryText }}>
                                            {t('login.otp_sent_to', 'Sent to')}{' '}
                                            <span className="font-semibold">{dialCode} {mobile}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={mobile.length < 6}
                                        onClick={() => setOtpSent(true)}
                                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-[12.5px] font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ borderColor: tint(35), color: primary }}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {t('login.send_otp', 'Send OTP')}
                                    </button>
                                )}

                                <div className="text-right">
                                    <a
                                        href="/forgot-password"
                                        onClick={navigate('/forgot-password')}
                                        className="text-[12px] font-semibold hover:underline"
                                        style={{ color: primary }}
                                    >
                                        {t('login.forgot_password', 'Forgot password?')}
                                    </a>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || redirecting}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                    style={{ backgroundColor: primary }}
                                >
                                    {submitting || redirecting ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    {redirecting
                                        ? t('login.redirecting', 'Taking you to your dashboard...')
                                        : submitting
                                            ? t('login.submitting', 'Logging in...')
                                            : t('login.submit', 'Log In')}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="my-5 flex items-center gap-3">
                                <span className="h-px flex-1 bg-slate-200" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.secondaryText }}>
                                    {t('login.or', 'OR')}
                                </span>
                                <span className="h-px flex-1 bg-slate-200" />
                            </div>

                            {/* Google + Facebook only — Apple was removed from the UI on
                                request. Each opens the shared provider flow. */}
                            <SocialButtons
                                primaryText={theme.primaryText}
                                labelFor={(key, fallback) => t(`login.continue_with_${key}`, fallback)}
                                onSelect={(provider) => {
                                    setActiveProvider(provider);
                                    startSocialAuth(provider);
                                }}
                            />

                            {/* Privacy note */}
                            <div className="mt-6 flex min-w-0 items-start justify-center gap-2.5">
                                <span
                                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                    style={{ backgroundColor: tint(14) }}
                                >
                                    <ShieldCheck className="h-3.5 w-3.5" style={{ color: primary }} />
                                </span>
                                <p className="break-words text-[11.5px] leading-4" style={{ color: theme.secondaryText }}>
                                    {t('login.privacy_line_1', 'We take your privacy seriously.')}
                                    <br />
                                    {t('login.privacy_line_2', 'Your information is 100% secure.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Only after a provider sign-in, and only when the account has no
                number yet — a provider never tells us one. */}
            {/* Covers the gap between "logged in" and the portal actually
                painting. Without it the page sits there looking like nothing
                happened while the browser loads another origin. */}
            {redirecting && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm"
                >
                    <span
                        className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200"
                        style={{ borderTopColor: primary }}
                    />
                    <p className="text-[13px] font-semibold text-slate-600">
                        {t('login.redirecting', 'Taking you to your dashboard...')}
                    </p>
                </div>
            )}
            {mobileToken && (
                <MobileVerifyDialog
                    token={mobileToken}
                    primary={primary}
                    onDone={clearMobileToken}
                />
            )}
        </section>
    );
}
