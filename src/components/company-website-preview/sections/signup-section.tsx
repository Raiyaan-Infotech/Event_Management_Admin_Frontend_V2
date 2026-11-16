'use client';

/**
 * Client signup screen for the tenant site.
 *
 * Sibling of `login-section.tsx` — same container, same grid, same shared auth
 * pieces (mobile field, OTP entry, provider flow), so the two screens cannot
 * drift apart. Read that file's header for the colour and backend notes; they
 * apply here unchanged.
 *
 * Apple sign-in is deliberately absent: it was removed from the UI on request.
 */

import * as React from 'react';
import { toast } from '@/lib/toast';
import { registerWebsiteClient } from '@/lib/website-client-auth';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    ArrowRight,
    PartyPopper,
    LayoutTemplate,
    Users,
    ShieldCheck,
    Send,
    Star,
    ClipboardList,
} from 'lucide-react';
import type { ThemeColors } from './preview-shared';
import {
    tintOf,
    MobileNumberField,
    OtpInput,
    PasswordRules,
    PASSWORD_RULES,
    SocialButtons,
    startSocialAuth,
    useSocialAuthResult,
    MobileVerifyDialog,
    type AuthProvider,
} from './auth-shared';
import { useWebsiteLanguage } from '../website-language-provider';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignupFeature {
    key: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export interface SignupStat {
    key: string;
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface SignupSectionProps {
    theme: ThemeColors;
    companyName?: string;
    onNavigate?: (href: string) => void;
    features?: SignupFeature[];
    stats?: SignupStat[];
}

// ── Shipped defaults ─────────────────────────────────────────────────────────

const DEFAULT_FEATURES: SignupFeature[] = [
    {
        key: 'easy',
        title: 'Easy to Use',
        description: 'Create beautiful invitations in minutes with our simple and intuitive tools.',
        icon: PartyPopper,
    },
    {
        key: 'templates',
        title: 'Stunning Templates',
        description: 'Choose from 1,000+ professionally designed templates for any occasion.',
        icon: LayoutTemplate,
    },
    {
        key: 'manage',
        title: 'Manage with Ease',
        description: 'Track RSVPs, send reminders, and manage guests all in one place.',
        icon: Users,
    },
    {
        key: 'secure',
        title: 'Secure & Reliable',
        description: 'Your data is safe with us. We use industry-standard security to protect your privacy.',
        icon: ShieldCheck,
    },
];

const DEFAULT_STATS: SignupStat[] = [
    { key: 'users', value: '10K+', label: 'Happy Users', icon: Users },
    { key: 'invitations', value: '1M+', label: 'Invitations Created', icon: ClipboardList },
    { key: 'rating', value: '4.8/5', label: 'Average Rating', icon: Star },
    { key: 'uptime', value: '99.9%', label: 'Uptime & Reliable', icon: ShieldCheck },
];

// ── Illustration ─────────────────────────────────────────────────────────────
// Calendar + invitation envelope + balloon + plant, built from markup so it
// recolours with the tenant's theme. Decorative only.

function CelebrationArtwork({ theme }: { theme: ThemeColors }) {
    const primary = theme.primaryButton;
    const tint = tintOf(primary);

    return (
        <div className="relative mx-auto h-[190px] w-full max-w-[380px] select-none" aria-hidden="true">
            {/* Calendar, left */}
            <div className="absolute bottom-0 left-2 w-[124px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200/70">
                {/* Binder rings */}
                <div className="flex justify-center gap-3 pt-1.5">
                    {[0, 1, 2].map((ring) => (
                        <span key={ring} className="h-2.5 w-1 rounded-full" style={{ backgroundColor: tint(60) }} />
                    ))}
                </div>
                <div className="h-6" style={{ backgroundColor: primary }} />
                <div className="grid grid-cols-5 gap-1 p-2">
                    {Array.from({ length: 20 }).map((_, cell) => (
                        <span
                            key={cell}
                            className="h-2.5 rounded-[2px]"
                            style={{ backgroundColor: cell === 13 ? tint(70) : '#F1F5F9' }}
                        />
                    ))}
                </div>
                {/* Checked date badge */}
                <span
                    className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md"
                    style={{ backgroundColor: primary }}
                >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>

            {/* Envelope with invitation, centre */}
            <div className="absolute bottom-0 left-[112px] w-[132px]">
                {/* The card peeking out of the envelope */}
                <div
                    className="relative mx-auto w-[104px] rounded-t-md border border-b-0 bg-white px-2 pb-6 pt-3 text-center shadow-sm"
                    style={{ borderColor: tint(30) }}
                >
                    <p className="text-[7px] font-black uppercase tracking-[0.14em]" style={{ color: primary }}>
                        You&apos;re
                    </p>
                    <p className="text-[7px] font-black uppercase tracking-[0.14em]" style={{ color: primary }}>
                        Invited!
                    </p>
                    <svg viewBox="0 0 24 24" className="mx-auto mt-1 h-3.5 w-3.5" style={{ color: primary }}>
                        <path
                            fill="currentColor"
                            d="M12 21s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 12c0 4.5-7 9-7 9Z"
                        />
                    </svg>
                </div>
                {/* Envelope body */}
                <div className="relative h-[62px] w-full overflow-hidden rounded-md shadow-lg" style={{ backgroundColor: primary }}>
                    <svg viewBox="0 0 132 62" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                        <path d="M0 0l66 40L132 0v62H0Z" fill={tint(78)} />
                        <path d="M0 0l66 40L132 0" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />
                    </svg>
                </div>
            </div>

            {/* Balloon, right of centre */}
            <div className="absolute bottom-[46px] left-[228px]">
                <div className="h-11 w-9 rounded-[50%] shadow-md" style={{ backgroundColor: tint(75) }} />
                <div
                    className="mx-auto h-0 w-0"
                    style={{
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderTop: `6px solid ${tint(75)}`,
                    }}
                />
                <svg viewBox="0 0 20 40" className="mx-auto h-10 w-5">
                    <path d="M10 0c6 10-6 16 0 26s-4 10-2 14" fill="none" stroke={tint(45)} strokeWidth="1.2" />
                </svg>
            </div>

            {/* Potted plant, right */}
            <div className="absolute bottom-0 right-3 h-[86px] w-[64px]">
                <svg viewBox="0 0 64 86" className="h-full w-full">
                    <path d="M32 52c-10-6-15-18-13-31 11 3 18 13 19 25" fill={tint(62)} />
                    <path d="M32 52c8-8 12-20 8-31-10 5-15 15-15 26" fill={tint(82)} />
                    <path d="M18 54h28l-4 30H22L18 54Z" fill="#FFFFFF" stroke={tint(40)} strokeWidth="1.5" />
                </svg>
            </div>

            {/* Confetti — positions fixed rather than random so the layout is stable
                across renders and between server and client. */}
            {[
                { left: '4%', top: '18%', size: 6 },
                { left: '46%', top: '4%', size: 5 },
                { left: '68%', top: '26%', size: 7 },
                { left: '88%', top: '10%', size: 5 },
                { left: '20%', top: '6%', size: 4 },
            ].map((spark) => (
                <span
                    key={`${spark.left}-${spark.top}`}
                    className="absolute rotate-45 rounded-[1px]"
                    style={{
                        left: spark.left,
                        top: spark.top,
                        height: spark.size,
                        width: spark.size,
                        backgroundColor: tint(55),
                    }}
                />
            ))}
        </div>
    );
}

// ── Section ──────────────────────────────────────────────────────────────────

export function SignupSection({
    theme,
    companyName,
    onNavigate,
    features = DEFAULT_FEATURES,
    stats = DEFAULT_STATS,
}: SignupSectionProps) {
    const { t } = useWebsiteLanguage();
    const primary = theme.primaryButton;
    const company = companyName || 'Event Invit';
    const tint = tintOf(primary);

    const [showPassword, setShowPassword] = React.useState(false);
    const [fullName, setFullName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [dialCode, setDialCode] = React.useState('+91');
    const [mobile, setMobile] = React.useState('');
    const [otpSent, setOtpSent] = React.useState(false);
    const [otp, setOtp] = React.useState('');
    const [activeProvider, setActiveProvider] = React.useState<AuthProvider | null>(null);

    // Shows the result of a provider round trip, which comes back in the URL,
    // and hands back a token when the account still needs a phone number.
    const { mobileToken, clearMobileToken } = useSocialAuthResult();

    const [submitting, setSubmitting] = React.useState(false);

    /**
     * Creates a real client record, which the admin Clients module lists. The
     * OTP boxes above are NOT part of this — no SMS provider is configured, so
     * the mobile number is stored unverified.
     */
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;

        // The server validates all of this again; this only saves a round trip.
        if (!fullName.trim() || !email.trim() || !mobile.trim()) {
            toast.error('Please fill all mandatory fields.');
            return;
        }
        if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
            toast.error('Please choose a password that meets all three rules.');
            return;
        }

        setSubmitting(true);
        const result = await registerWebsiteClient({
            name: fullName.trim(),
            email: email.trim(),
            dial_code: dialCode,
            mobile: mobile.trim(),
            password,
        });
        setSubmitting(false);

        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        // Clear the credentials so a shared screen does not keep them.
        setPassword('');
        setOtp('');
        setOtpSent(false);

        // Signing up is not signing in — the account exists but no session was
        // issued, so the next step is the login screen.
        toast.success(result.message || 'Account created successfully');
        onNavigate?.('/login');
    };

    // `/login` exists; the legal pages do not have routes here yet, so those
    // two swallow the click rather than pushing to a 404.
    const goToLogin = (event: React.MouseEvent) => {
        if (!onNavigate) return;
        event.preventDefault();
        onNavigate('/login');
    };
    const inert = (event: React.MouseEvent) => event.preventDefault();

    const inputClass =
        'h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[13.5px] outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2';

    return (
        // Same page container as every other section, so the screen lines up
        // with the header, footer and the rest of the site.
        <section className="w-full bg-white py-16 sm:py-20">
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
                <div className="grid min-w-0 overflow-hidden rounded-2xl lg:grid-cols-2">
                    {/* ── Left: branded panel ─────────────────────────────── */}
                    <div
                        className="relative hidden min-w-0 flex-col justify-center gap-6 overflow-hidden p-8 xl:p-10 lg:flex"
                        style={{ backgroundImage: `linear-gradient(155deg, ${tint(13)} 0%, ${tint(5)} 55%, #FFFFFF 100%)` }}
                    >
                        <div className="min-w-0">
                            <span
                                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold"
                                style={{ backgroundColor: tint(18), color: primary }}
                            >
                                {t('signup.badge', 'Get Started')}
                            </span>

                            <h1
                                className="mt-4 break-words text-[34px] font-black leading-[1.15] tracking-tight"
                                style={{ color: theme.primaryText }}
                            >
                                {t('signup.title_line_1', "Let's create something")}{' '}
                                <span style={{ color: primary }}>{t('signup.title_highlight', 'unforgettable!')}</span>
                            </h1>

                            <p className="mt-3 max-w-md break-words text-[14px] leading-6" style={{ color: theme.paragraph }}>
                                {t(
                                    'signup.subtitle',
                                    'Join thousands of happy users who create stunning invitations and memorable events with {company}.',
                                    { company }
                                )}
                            </p>
                        </div>

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
                                                {t(`signup.feature.${feature.key}.title`, feature.title)}
                                            </p>
                                            <p className="break-words text-[12.5px] leading-5" style={{ color: theme.paragraph }}>
                                                {t(`signup.feature.${feature.key}.description`, feature.description)}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <CelebrationArtwork theme={theme} />
                    </div>

                    {/* ── Right: the form ─────────────────────────────────── */}
                    <div className="flex min-w-0 items-center justify-center bg-white px-0 py-2 sm:px-6 lg:py-8">
                        <div className="w-full min-w-0 max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <h2
                                className="break-words text-center text-[21px] font-black tracking-tight"
                                style={{ color: theme.primaryText }}
                            >
                                {t('signup.card_title', 'Create Your Account')}
                            </h2>
                            <p className="mt-1.5 break-words text-center text-[12.5px]" style={{ color: theme.secondaryText }}>
                                {t('signup.have_account', 'Already have an account?')}{' '}
                                <a href="/login" onClick={goToLogin} className="font-bold hover:underline" style={{ color: primary }}>
                                    {t('signup.log_in', 'Log in')}
                                </a>
                            </p>

                            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                                {/* Full name */}
                                <div>
                                    <label
                                        htmlFor="signup-name"
                                        className="mb-1.5 block text-[12.5px] font-bold"
                                        style={{ color: theme.primaryText }}
                                    >
                                        {t('signup.name_label', 'Full Name')} <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="signup-name"
                                            type="text"
                                            autoComplete="name"
                                            value={fullName}
                                            onChange={(event) => setFullName(event.target.value)}
                                            placeholder={t('signup.name_placeholder', 'Enter your full name')}
                                            className={inputClass}
                                            style={{ color: theme.primaryText, ['--tw-ring-color' as string]: tint(30) }}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label
                                        htmlFor="signup-email"
                                        className="mb-1.5 block text-[12.5px] font-bold"
                                        style={{ color: theme.primaryText }}
                                    >
                                        {t('signup.email_label', 'Email Address')} <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="signup-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder={t('signup.email_placeholder', 'Enter your email address')}
                                            className={inputClass}
                                            style={{ color: theme.primaryText, ['--tw-ring-color' as string]: tint(30) }}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label
                                        htmlFor="signup-password"
                                        className="mb-1.5 block text-[12.5px] font-bold"
                                        style={{ color: theme.primaryText }}
                                    >
                                        {t('signup.password_label', 'Password')} <span className="text-rose-500">*</span>
                                    </label>
                                    {/* The eye toggle is positioned against THIS wrapper only —
                                        the rules list below sits outside it, or the toggle would
                                        centre against the wrong height. */}
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="signup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder={t('signup.password_placeholder', 'Create a password')}
                                            className={inputClass}
                                            style={{ color: theme.primaryText, ['--tw-ring-color' as string]: tint(30) }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((previous) => !previous)}
                                            aria-label={showPassword ? t('signup.hide_password', 'Hide password') : t('signup.show_password', 'Show password')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        <PasswordRules password={password} />
                                    </div>
                                </div>

                                {/* Mobile number + OTP */}
                                <MobileNumberField
                                    id="signup-mobile"
                                    primary={primary}
                                    label={t('signup.mobile_label', 'Mobile Number')}
                                    placeholder={t('signup.mobile_placeholder', 'Enter your mobile number')}
                                    value={mobile}
                                    onChange={setMobile}
                                    dialCode={dialCode}
                                    onDialCodeChange={setDialCode}
                                    required
                                />

                                {otpSent ? (
                                    <div className="min-w-0 rounded-lg border border-slate-200 p-3">
                                        <p className="mb-2 text-[12.5px] font-bold" style={{ color: theme.primaryText }}>
                                            {t('signup.otp_label', 'Enter OTP')}
                                        </p>
                                        <OtpInput primary={primary} value={otp} onChange={setOtp} />
                                        <p className="mt-2.5 text-center text-[11.5px]" style={{ color: theme.secondaryText }}>
                                            {t('signup.otp_sent_to', 'Sent to')}{' '}
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
                                        {t('signup.send_otp', 'Send OTP')}
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || !PASSWORD_RULES.every((rule) => rule.test(password))}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13.5px] font-bold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ backgroundColor: primary }}
                                >
                                    {submitting
                                        ? t('signup.submitting', 'Creating account...')
                                        : t('signup.submit', 'Create Account')}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="my-5 flex items-center gap-3">
                                <span className="h-px flex-1 bg-slate-200" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.secondaryText }}>
                                    {t('signup.or', 'OR')}
                                </span>
                                <span className="h-px flex-1 bg-slate-200" />
                            </div>

                            {/* Google + Facebook only — Apple removed from the UI on request. */}
                            <SocialButtons
                                primaryText={theme.primaryText}
                                labelFor={(key, fallback) => t(`signup.continue_with_${key}`, fallback)}
                                onSelect={(provider) => {
                                    setActiveProvider(provider);
                                    startSocialAuth(provider);
                                }}
                            />

                            {/* Legal */}
                            <p className="mt-5 break-words text-center text-[11.5px] leading-4" style={{ color: theme.secondaryText }}>
                                {t('signup.legal_prefix', 'By creating an account, you agree to our')}{' '}
                                <a href="/terms-of-service" onClick={inert} className="font-semibold hover:underline" style={{ color: primary }}>
                                    {t('signup.terms', 'Terms & Conditions')}
                                </a>{' '}
                                {t('signup.legal_and', 'and')}{' '}
                                <a href="/privacy-policy" onClick={inert} className="font-semibold hover:underline" style={{ color: primary }}>
                                    {t('signup.privacy', 'Privacy Policy')}
                                </a>
                                .
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Stats bar ───────────────────────────────────────────── */}
                <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl p-5 sm:grid-cols-4" style={{ backgroundColor: tint(7) }}>
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.key} className="flex min-w-0 items-center justify-center gap-2.5">
                                <Icon className="h-5 w-5 shrink-0" style={{ color: primary }} />
                                <div className="min-w-0">
                                    <p className="break-words text-[15px] font-black leading-tight" style={{ color: theme.primaryText }}>
                                        {stat.value}
                                    </p>
                                    <p className="break-words text-[11.5px] leading-tight" style={{ color: theme.secondaryText }}>
                                        {t(`signup.stat.${stat.key}`, stat.label)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* Only after a provider sign-in, and only when the account has no
                number yet — a provider never tells us one. */}
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
