'use client';

import * as React from 'react';
import { Icon, loadIcons } from '@iconify/react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { ContactData, SocialLink, ThemeColors } from './preview-shared';

import { useWebsiteLanguage } from '../website-language-provider';

function ContactSectionBase({ contact, theme }: { contact: ContactData; theme: ThemeColors }) {
  const { t } = useWebsiteLanguage();
  const [formData, setFormData] = React.useState({ name: '', email: '', phone: '', category: '', message: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [, setIconsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!contact?.socialLinks || !contact.socialLinks.length) return;
    const keys = contact.socialLinks.map((link) => {
      const raw = String(link.iconName || 'simple-icons:linktree').trim().toLowerCase();
      return raw.includes(':') ? raw : `simple-icons:${raw}`;
    });
    loadIcons(keys, () => setIconsLoaded(true));
  }, [contact?.socialLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setFormData({ name: '', email: '', phone: '', category: '', message: '' });
    toast.success('Message sent successfully!');
  };

  const mapAddress = encodeURIComponent(contact.address || 'New York, USA');
  const mapSrc = contact.latitude && contact.longitude
    ? `https://maps.google.com/maps?q=${contact.latitude},${contact.longitude}&z=14&output=embed`
    : `https://maps.google.com/maps?q=${mapAddress}&z=14&output=embed`;

  return (
    <section id="contact" className="w-full border-t border-slate-100 bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-flex rounded px-3 py-1 text-[12px] font-bold text-white" style={{ backgroundColor: theme.primaryButton }}>{t('header.contact', 'Contact Us')}</span>
          <h2 className="mt-4 text-[28px] font-black leading-tight tracking-tight sm:text-[36px]" style={{ color: theme.primaryText }}>{t('contact.title', 'Get In Touch')}</h2>
          <div className="mx-auto mt-3 h-[3px] w-12 rounded-full" style={{ backgroundColor: theme.primaryButton }} />
        </div>

        {/* Two cards side by side, matching the mockup: the form on the left,
            contact details + map sharing one card on the right. */}
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          {/* ── Send Us a Message ───────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: theme.primaryButton }}
              >
                <Send className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-[17px] font-black" style={{ color: theme.primaryText }}>
                  {t('contact.subtitle', 'Send Us a Message')}
                </h3>
                <p className="text-[12px] font-medium text-slate-500">
                  {t('contact.form_hint', 'Fill out the form and our team will get back to you shortly.')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-slate-700">{t('contact.full_name', 'Full Name')}</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('contact.full_name_placeholder', 'Enter your full name')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                  required
                />
              </div>

              {/* One field per row. Email and phone shared a 2-column grid,
                  which read as a broken row rather than two fields. */}
              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-slate-700">{t('contact.email_address', 'Email Address')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t('contact.email_placeholder', 'Enter your email address')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-slate-700">{t('contact.phone_number', 'Phone Number')}</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={t('contact.phone_placeholder', 'Enter your phone number')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              {contact.categories && contact.categories.length ? (
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">{t('contact.subject', 'Subject')}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                  >
                    <option value="">{t('contact.select_subject', 'Select a subject')}</option>
                    {contact.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-[12px] font-bold text-slate-700">{t('contact.message', 'Message')}</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  placeholder={t('contact.message_placeholder', 'Type your message here...')}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-70"
                style={{ backgroundColor: theme.primaryButton }}
              >
                {submitting ? 'Sending...' : t('contact.send_message', 'Send Message')}
                {!submitting && <Send className="h-3.5 w-3.5" />}
              </button>
            </form>
          </div>

          {/* ── Contact Information + map (one card) ────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid h-full sm:grid-cols-[1.3fr_1fr]">
              {/* The card is stretched to the form's height, so the details
                  used to end well short of the bottom edge and leave a dead
                  block under the social icons. The rows take the slack and
                  centre in it; the icons stay pinned to the bottom. */}
              <div className="flex flex-col p-6 sm:p-7">
                <div>
                  <h3 className="text-[17px] font-black" style={{ color: theme.primaryText }}>
                    {t('contact.info_title', 'Contact Information')}
                  </h3>
                  <div className="mt-2 h-[3px] w-10 rounded-full" style={{ backgroundColor: theme.primaryButton }} />
                </div>

                <div className="mt-6 flex flex-1 flex-col justify-center gap-5">
                  {contact.email ? (
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${theme.primaryButton}1A`, color: theme.primaryButton }}>
                        <Mail className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black" style={{ color: theme.primaryText }}>{t('contact.email_us', 'Email Us')}</p>
                        <p className="mt-0.5 break-words text-[12.5px] font-medium text-slate-600">{contact.email}</p>
                      </div>
                    </div>
                  ) : null}

                  {contact.mobile ? (
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${theme.primaryButton}1A`, color: theme.primaryButton }}>
                        <Phone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black" style={{ color: theme.primaryText }}>{t('contact.call_us', 'Call Us')}</p>
                        <p className="mt-0.5 break-words text-[12.5px] font-medium text-slate-600">{contact.mobile}</p>
                      </div>
                    </div>
                  ) : null}

                  {contact.address ? (
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${theme.primaryButton}1A`, color: theme.primaryButton }}>
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black" style={{ color: theme.primaryText }}>{t('contact.head_office', 'Head Office')}</p>
                        <p className="mt-0.5 break-words text-[12.5px] font-medium leading-relaxed text-slate-600">{contact.address}</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {contact.socialLinksEnabled && contact.socialLinks && contact.socialLinks.length ? (
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {contact.socialLinks.map((link: SocialLink) => {
                      const raw = String(link.iconName || 'simple-icons:linktree').trim().toLowerCase();
                      const iconKey = raw.includes(':') ? raw : `simple-icons:${raw}`;
                      return (
                        <a
                          key={link.label}
                          href={link.href}
                          aria-label={link.label}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-80"
                          style={{ backgroundColor: link.color || theme.primaryButton }}
                        >
                          <Icon icon={iconKey} className="h-4 w-4" />
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Map sits flush inside the card, full height, as in the mockup. */}
              <div className="relative min-h-[220px] border-t border-slate-100 sm:min-h-full sm:border-l sm:border-t-0">
                <iframe
                  title="Company Location Map"
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  className="absolute inset-0 h-full w-full"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const ContactSection = React.memo(ContactSectionBase);
