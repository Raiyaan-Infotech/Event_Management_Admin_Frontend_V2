"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

// Map URL segments to translation keys
const segmentTranslationMap: Record<string, string> = {
  // Main navigation
  "users": "nav.employees",
  "roles": "nav.roles",
  "permissions": "nav.permissions",
  "settings": "nav.settings",
  "profile": "nav.profile",
  "activity-logs": "nav.activity_logs",
  "platform": "nav.platform",

  // Settings sub-pages
  "general": "settings.general",
  "email": "settings.email",
  "templates": "settings.email_templates",
  "phone": "settings.phone_number",
  "languages": "settings.languages",
  "currencies": "settings.currencies",
  "media": "settings.media",
  "website-tracking": "settings.website_tracking",
  "admin-apperance": "settings.dashboard_theme",
  "admin-settings": "settings.site_settings",
  "campaigns": "settings.email_campaigns",
  "social-login": "settings.social_login",
  "translations": "nav.translations",
  "locations": "settings.locations",
  "timezone": "settings.timezone",
  "cache": "settings.cache",
  "optimize": "settings.optimize",
  "missing": "nav.missing_keys",

  // Actions
  "create": "common.create",
  "edit": "common.edit",
  "view": "common.view",

  // Content modules
  "contacts": "nav.contact",
  "blog": "nav.blog",
  "ads": "nav.ads",
  "banners": "nav.banners",
  "announcements": "nav.announcements",
  "approvals": "nav.approvals",
  "plugins": "nav.plugins",
  "payments": "nav.payments",
  "companies": "nav.companies",
  "vendors": "nav.vendors",

  // Appearance
  "appearance": "nav.appearance",
  "theme": "appearance.theme",
  "menu": "appearance.menu",
  "theme-option": "appearance.theme_options",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const { t } = useTranslation();

  // Remove "admin" + remove numeric IDs
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .slice(1) // skip 'admin'
    .filter(segment => isNaN(Number(segment))); // remove numeric IDs

  const getLabel = (segment: string, index: number): string => {
    /**
     * "templates" is ambiguous on its own: `/admin/settings/templates`
     * (notification/email templates) and `/admin/templates` (the invitation
     * Templates module) both end in this literal segment, and the map below
     * is keyed by segment name alone. Without this check the second one
     * always read as "Email Templates" — the label the FIRST one owns.
     */
    if (segment === "templates" && segments[index - 1] !== "settings") {
      return "Invitation";
    }

    if (segment === "home-screen-templates") return "Home Screen Templates";

    const translationKey = segmentTranslationMap[segment];

    if (translationKey) {
      return t(
        translationKey,
        segment
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );
    }

    // fallback
    return segment
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const items = [
    { label: t("nav.dashboard", "Dashboard"), href: "/admin" },
    ...segments.map((segment, index) => ({
      label: getLabel(segment, index),
      href: `/admin/${segments.slice(0, index + 1).join("/")}`,
    })),
  ];

  if (pathname === "/admin") {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
      {/* Home Icon */}
      <Link
        href="/admin"
        className="hover:text-foreground transition-colors shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.slice(1).map((item, index) => (
        <div key={item.href} className="flex items-center gap-2 shrink-0">
          <ChevronRight className="h-4 w-4" />

          {index === items.length - 2 ? (
            <span className="text-foreground font-medium max-w-[200px] truncate md:max-w-none">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}