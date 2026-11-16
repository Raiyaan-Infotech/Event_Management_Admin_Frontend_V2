'use client';

import * as React from 'react';
import { Icon, loadIcons } from '@iconify/react';
import { Send } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { FooterData, SocialLink, ThemeColors } from './preview-shared';
import { isExternalHref } from './preview-shared';

import { useWebsiteLanguage } from '../website-language-provider';

function FooterSectionBase({ footer, socialLinks, theme, onNavigate }: { footer: FooterData; socialLinks: SocialLink[]; theme: ThemeColors; onNavigate: (href: string) => void }) {
  const { t } = useWebsiteLanguage();
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [, setIconsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!socialLinks || !socialLinks.length) return;
    const keys = socialLinks.map((link: any) => {
      const raw = String(link?.iconName || link?.icon_name || link?.icon || 'simple-icons:linktree').trim().toLowerCase();
      return raw.includes(':') ? raw : `simple-icons:${raw}`;
    });
    loadIcons(keys, () => setIconsLoaded(true));
  }, [socialLinks]);

  const handleLink = (e: React.MouseEvent, href: string) => {
    if (isExternalHref(href)) return;
    e.preventDefault();
    onNavigate(href);
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Please enter a valid email.'); return; }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setNewsletterEmail('');
    toast.success('Subscribed successfully!');
  };

  const quickLinks = footer.quickLinks || [];
  const quickLinks2 = (footer as any).quickLinks2 || [];
  const hasLinks1 = quickLinks.length > 0;
  const hasLinks2 = quickLinks2.length > 0;

  const gridColsClass = (hasLinks1 && hasLinks2)
    ? 'lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]'
    : (hasLinks1 || hasLinks2)
      ? 'lg:grid-cols-[1.4fr_1fr_1.2fr]'
      : 'lg:grid-cols-[1.4fr_1.2fr]';

  return (
    <footer className="w-full bg-white text-slate-900 border-t border-slate-200/80">
      <div className={`mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-12 sm:px-6 ${gridColsClass} lg:px-8`}>
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            {footer.logoUrl ? (
              <img src={footer.logoUrl} alt={footer.companyName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-black text-white shadow-xs" style={{ backgroundColor: theme.primaryButton || '#ec4899' }}>
                {footer.companyName.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
              </span>
            )}
            <span className="text-[17px] font-extrabold tracking-tight text-slate-900">{footer.companyName}</span>
          </div>
          {footer.description ? (
            <p className="max-w-xs text-[12.5px] font-medium leading-relaxed text-slate-500">{footer.description}</p>
          ) : null}

          {(footer.address || footer.mobile || footer.email) && (
            <div className="space-y-1 text-[12px] font-medium text-slate-600">
              {footer.address ? <p>{footer.address}</p> : null}
              {footer.mobile ? <p>{footer.mobile}</p> : null}
              {footer.email ? <p>{footer.email}</p> : null}
            </div>
          )}

          {footer.showSocialLinks && socialLinks && socialLinks.length > 0 ? (
            <div className="flex items-center gap-2 pt-1">
              {socialLinks.map((link: any) => {
                const raw = String(link.iconName || link.icon_name || link.icon || link.icon_key || 'simple-icons:linktree').trim().toLowerCase();
                const iconKey = raw.includes(':') ? raw : `simple-icons:${raw}`;
                return (
                  <a
                    key={link.label || iconKey}
                    href={link.href || '#'}
                    aria-label={link.label || 'Social'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 hover:scale-105"
                  >
                    <Icon icon={iconKey} className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Dynamic Quick Links Column 1 */}
        {quickLinks.length > 0 ? (
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">{footer.topListHeading || t('footer.quick_links', 'Quick Links')}</h3>
            <ul className="mt-4 space-y-2.5 text-[12.5px] font-medium text-slate-600">
              {quickLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    onClick={(e) => handleLink(e, link.href)}
                    className="transition hover:opacity-80"
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.primaryButton)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : <div />}

        {/* Dynamic Quick Links Column 2 (Near Column 1) */}
        {hasLinks2 ? (
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">{(footer as any).topListHeading2 || t('footer.company', 'Company')}</h3>
            <ul className="mt-4 space-y-2.5 text-[12.5px] font-medium text-slate-600">
              {quickLinks2.map((link: any) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    onClick={(e) => handleLink(e, link.href)}
                    className="transition hover:opacity-80"
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.primaryButton)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Newsletter Column */}
        {footer.showNewsletter ? (
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">{t('footer.newsletter', 'Newsletter')}</h3>
            <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-slate-500">
              {t('footer.newsletter_subtitle', 'Subscribe to get updates and offers')}
            </p>
            {/* Input and button are one joined control — no gap. The rounding is
                split across the pair (left on the input, right on the button)
                and the input drops its right border so the seam reads as a
                single element rather than two touching ones. */}
            <form className="mt-4 flex items-stretch shadow-2xs" onSubmit={handleNewsletter}>
              {/* `flex-1 min-w-0` rather than `w-full`: a 100%-wide flex child
                  overflows the row and forces the button to shrink. */}
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={t('footer.email_placeholder', 'Enter your email')}
                disabled={submitting}
                className="h-10 min-w-0 flex-1 rounded-l-xl border border-r-0 border-slate-200 bg-white px-3.5 text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={submitting}
                aria-label="Subscribe to newsletter"
                className="flex h-10 w-11 shrink-0 items-center justify-center rounded-r-xl font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-70"
                style={{ backgroundColor: theme.primaryButton || '#ec4899' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-4 py-4 text-[12px] font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{footer.copyright || `© ${new Date().getFullYear()} ${footer.companyName}. ${t('footer.all_rights_reserved', 'All Rights Reserved.')}`}</p>
          <p className="flex items-center gap-1">
            {t('footer.made_with', 'Made with')} <span className="text-rose-500">❤️</span> {t('footer.for_moments', 'for your special moments')}
          </p>
        </div>
      </div>
    </footer>
  );
}

export const FooterSection = React.memo(FooterSectionBase);
