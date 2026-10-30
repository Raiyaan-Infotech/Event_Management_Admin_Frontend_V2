"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavigationLoader } from "@/components/common/navigation-loader-provider";
import {
  ChevronDown,
  LayoutDashboard,
  Settings,
  Menu,
  Building2,
  Users,
  Megaphone,
  HelpCircle,
  FileQuestion,
  Image,
  CreditCard,
  Store,
  Package,
  Calendar,
  BarChart2,
  MessageSquare,
  Bell,
  Mail,
  MessageCircle,
  Phone,
  Globe,
  Layers,
  Sliders,
  FileText,
  Palette,
  LayoutGrid,
  Award,
  Folder,
  Frame,
  GalleryHorizontal,
  LogIn,
  Monitor,
  Search,
  Star,
  DollarSign,
  Video,
  Plus,
  Sparkles,
  Lock,
  Languages,
  LayoutList,
  LayoutTemplate,
  Tag,
  Repeat,
  UserRound,
  UtensilsCrossed,
  FileEdit,
  Type,
  ClipboardList,
  Smartphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSettingsByGroup } from "@/hooks/use-settings";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissionCheck } from "@/hooks";
import { usePlugins } from "@/hooks/use-plugins";
import { PageLoader } from "@/components/common/page-loader";
import { useUiBlocksData } from "@/hooks/useUiBlocks";

interface MenuItem {
  labelKey: string;
  href?: string;
  icon: React.ElementType;
  children?: MenuItem[];
  permission?: string;
  minLevel?: number;
  developerOnly?: boolean;
  pluginSlug?: string; // if set, item is hidden when plugin is inactive
  badge?: string;
  uiBlockKey?: string; // if set, item is hidden when this UI block is toggled off
}

const menuItems: MenuItem[] = [
  {
    labelKey: "nav.dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    labelKey: "nav.companies",
    href: "/admin/companies",
    icon: Building2,
    developerOnly: true,
  },
  {
    labelKey: "nav.vendors",
    href: "/admin/vendors",
    icon: Store,
    permission: "vendors.view",
  },
  {
    labelKey: "nav.employees",
    href: "/admin/platform/users",
    icon: Users,
    permission: "employees.view",
  },
  {
    // People who signed themselves up on the public website (`website_clients`),
    // NOT the vendor portal's own client list (`vendor_clients`).
    labelKey: "nav.clients",
    href: "/admin/clients",
    icon: UserRound,
    permission: "website_clients.view",
  },
  {
    labelKey: "nav.events",
    icon: Calendar,
    children: [
      { labelKey: "nav.menus", href: "/admin/menus", icon: Menu, permission: "menus.view" },
    ],
  },
  {
    labelKey: "nav.menu_management",
    icon: LayoutList,
    children: [
      { labelKey: "nav.event_menus", href: "/admin/menu-management/menus", icon: LayoutList, permission: "event_menus.view" },
      { labelKey: "nav.event_categories", href: "/admin/menu-management/event-categories", icon: Folder, permission: "event_categories.view" },
      // The two dropdowns the MOBILE APP's guest registration form offers.
      // Filed here because they are category-scoped taxonomies exactly like the
      // three above, and are edited the same way.
      { labelKey: "nav.guest_relationships", href: "/admin/menu-management/guest-relationships", icon: Users, permission: "guest_relationship_options.view" },
      { labelKey: "nav.guest_food_preferences", href: "/admin/menu-management/guest-food-preferences", icon: UtensilsCrossed, permission: "guest_food_preference_options.view" },
      // Contact Person responsibilities per event category (2026-10-27).
      { labelKey: "Responsibilities", href: "/admin/menu-management/responsibilities", icon: ClipboardList, permission: "event_responsibilities.view" },
    ],
  },
  {
    // Invitation templates — the design a client's event invitation is rendered
    // from. NOT the Website Builder's Templates, which are website themes.
    //
    // This WAS flat, deliberately, because a one-child group is a disclosure
    // triangle that reveals nothing. It is a group now that there are genuinely
    // three separate things behind it, each with its own permission. "Create
    // Template" is still only the button at the top of the list, not a child.
    // Renamed "Templates" → "Invitation" (Jamal, 2026-10-30); "Template" is
    // now the mobile app home screen designs below. Routes unchanged.
    labelKey: "Invitation",
    icon: LayoutTemplate,
    children: [
      {
        labelKey: "All Invitations",
        href: "/admin/templates",
        icon: LayoutTemplate,
        permission: "event_templates.view",
      },
      {
        // The DESIGN family — Elegant, Floral, Traditional. Not event
        // categories, and not the Website Builder's template categories.
        labelKey: "Template Categories",
        href: "/admin/templates/categories",
        icon: Folder,
        permission: "template_categories.view",
      },
      {
        // Uploaded border artwork, classified by a template category.
        labelKey: "Frame Styles",
        href: "/admin/templates/frame-styles",
        icon: Frame,
        permission: "frame_styles.view",
      },
      {
        // Ornament images placed INSIDE a template — corners, dividers, tops.
        // A frame surrounds the invitation; a decoration is one part of it.
        labelKey: "Decorations",
        href: "/admin/templates/decorations",
        icon: Sparkles,
        permission: "decorations.view",
      },
      {
        // Fonts added for templates — an uploaded file or a link. Shown with
        // the templates permission: a font exists only to be picked in the
        // template wizard, so it has no permission of its own.
        labelKey: "Fonts",
        href: "/admin/templates/fonts",
        icon: Type,
        permission: "event_templates.view",
      },
    ],
  },
  {
    // Mobile app home screen designs per event category (2026-10-30).
    labelKey: "Template",
    icon: Smartphone,
    children: [
      {
        labelKey: "Home Screen Templates",
        href: "/admin/home-screen-templates",
        icon: Smartphone,
        permission: "home_screen_templates.view",
      },
    ],
  },
  {
    labelKey: "nav.reports",
    href: "/admin/reports",
    icon: BarChart2,
    permission: "reports.view",
  },
  {
    labelKey: "nav.marketing",
    icon: Megaphone,
    children: [
      { labelKey: "nav.media", href: "/admin/media", icon: Image, permission: "media.view" },
    ],
  },
  {
    labelKey: "nav.communication",
    icon: MessageSquare,
    children: [
      { labelKey: "nav.notifications", href: "/admin/notifications", icon: Bell, permission: "notifications.view" },
      { labelKey: "Push Notifications", href: "/admin/settings/push-notifications", icon: Bell, permission: "settings.view" },
      { labelKey: "nav.mail", href: "/admin/mail", icon: Mail, permission: "mail.view" },
      { labelKey: "Chat", href: "/admin/communication/chat", icon: MessageCircle },
      { labelKey: "nav.support", href: "/admin/support", icon: MessageCircle, permission: "support.view" },
      { labelKey: "nav.contact", href: "/admin/contact", icon: Phone, permission: "contact.view" },
    ],
  },
  {
    // Admin-authored message BLUEPRINTS (RSVP Confirmation, Event Reminder, ...),
    // scoped by notification/event category. Distinct from nav.communication's
    // "Push Notifications", which is the FCM connection config, and from
    // "nav.notifications", which is the admin's own mail-notification inbox.
    labelKey: "Notification Templates",
    icon: FileEdit,
    children: [
      {
        labelKey: "Transactional Templates",
        href: "/admin/notifications/templates",
        icon: FileEdit,
        permission: "notification_templates.view",
      },
      {
        labelKey: "Notification Categories",
        href: "/admin/notifications/categories",
        icon: Tag,
        permission: "notification_categories.view",
      },
    ],
  },
  {
    labelKey: "nav.subscription_management",
    icon: Package,
    children: [
      { labelKey: "nav.subscription_plans", href: "/admin/subscriptions", icon: Package, permission: "subscription_plans.view" },
      { labelKey: "nav.plan_types", href: "/admin/plan-types", icon: Repeat, permission: "plan_types.view" },
      { labelKey: "nav.plan_badges", href: "/admin/subscriptions/badges", icon: Award, permission: "plan_badges.view" },
    ],
  },
  {
    labelKey: "nav.faqs",
    icon: HelpCircle,
    permission: "faqs.view",
    pluginSlug: "faq",
    children: [
      { labelKey: "nav.faq_list", href: "/admin/faqs", icon: HelpCircle, permission: "faqs.view" },
      { labelKey: "nav.faq_categories", href: "/admin/faq-categories", icon: FileQuestion, permission: "faq_categories.view" },
    ],
  },
  {
    labelKey: "nav.payments",
    href: "/admin/payments",
    icon: CreditCard,
    permission: "payments.view",
    badge: "Coming Soon",
  },
  {
    labelKey: "Website Builder",
    icon: Globe,
    children: [
      // ── GLOBAL MAIN PARENT ITEMS ───────────────────────────────────────
      { labelKey: "Header", href: "/admin/website-builder/header", icon: FileText },
      { labelKey: "Navbar", href: "/admin/website-builder/nav-menu", icon: Menu },
      { labelKey: "Footer", href: "/admin/website-builder/footer", icon: Settings },

      // ── HOME PAGE ──────────────────────────────────────────────────────
      {
        labelKey: "Home",
        icon: Monitor,
        children: [
          { labelKey: "Hero Section", href: "/admin/website-builder/hero-section", icon: Monitor },
          { labelKey: "Highlights (Outline)", href: "/admin/website-builder/highlights/home/1", icon: Sparkles },
          { labelKey: "Template", href: "/admin/website-builder/templates", icon: LayoutGrid },
          { labelKey: "Highlights (BG Filled)", href: "/admin/website-builder/highlights/home/2", icon: Sparkles },
          { labelKey: "Testimonials", href: "/admin/website-builder/testimonials", icon: Star },
          { labelKey: "Login & Demo", href: "/admin/website-builder/login-demo/home", icon: LogIn },
        ],
      },
      // ── FEATURES PAGE ─────────────────────────────────────────────────
      {
        labelKey: "Features",
        icon: Layers,
        children: [
          { labelKey: "Hero Section", href: "/admin/website-builder/hero-section?page=features", icon: Monitor },
          { labelKey: "Features", href: "/admin/website-builder/features", icon: Layers },
          { labelKey: "Sign In & Demo", href: "/admin/website-builder/login-demo/features?variant=variant_2", icon: LogIn },
          { labelKey: "Highlights", href: "/admin/website-builder/highlights/features/1", icon: Sparkles },
          { labelKey: "Sign In with Price Plan", href: "/admin/website-builder/login-demo/features?variant=variant_6", icon: DollarSign },
        ],
      },
      // ── TEMPLATE PAGE ─────────────────────────────────────────────────
      {
        labelKey: "Template",
        icon: LayoutGrid,
        children: [
          { labelKey: "Hero Section", href: "/admin/website-builder/hero-section?page=template", icon: Monitor },
          { labelKey: "Template", href: "/admin/website-builder/templates", icon: LayoutGrid },
          { labelKey: "Sign In with Price Plan", href: "/admin/website-builder/login-demo/template", icon: DollarSign },
          { labelKey: "Highlights", href: "/admin/website-builder/highlights/template/1", icon: Sparkles },
        ],
      },
      // ── PRICING PAGE ──────────────────────────────────────────────────
      {
        labelKey: "Pricing",
        icon: DollarSign,
        children: [
          { labelKey: "Hero Section", href: "/admin/website-builder/hero-section?page=pricing", icon: Monitor },
          { labelKey: "Plans & Pricing", href: "/admin/website-builder/pricing-plans", icon: DollarSign },
          { labelKey: "Plan Features", href: "/admin/website-builder/pricing-features", icon: Layers },
          { labelKey: "Highlights", href: "/admin/website-builder/highlights/pricing/1", icon: Sparkles },
          { labelKey: "Contact & Signup Demo", href: "/admin/website-builder/login-demo/pricing", icon: LogIn },
        ],
      },
      // ── HOW IT WORKS PAGE ─────────────────────────────────────────────
      {
        labelKey: "How It's Work",
        icon: HelpCircle,
        children: [
          { labelKey: "Hero Section", href: "/admin/website-builder/hero-section?page=how-it-works", icon: Monitor },
          { labelKey: "Videos", href: "/admin/website-builder/video-tutorials", icon: Video },
          { labelKey: "Highlights", href: "/admin/website-builder/highlights/how-it-works/1", icon: Sparkles },
          { labelKey: "Signup Demo", href: "/admin/website-builder/login-demo/how-it-works", icon: LogIn },
        ],
      },
      // ── CONTACT PAGE ──────────────────────────────────────────────────
      {
        labelKey: "Contact",
        icon: Mail,
        children: [
          { labelKey: "Hero Section", href: "/admin/website-builder/hero-section?page=contact", icon: Monitor },
          { labelKey: "Highlights", href: "/admin/website-builder/highlights/contact/1", icon: Sparkles },
          { labelKey: "Contact form with Map", href: "/admin/website-builder/contact-us", icon: Mail },
          { labelKey: "FAQ's", href: "/admin/website-builder/faqs", icon: HelpCircle },
          { labelKey: "Chat & Signup Demo", href: "/admin/website-builder/login-demo/contact", icon: LogIn },
        ],
      },
      // ── GALLERY MODULE ────────────────────────────────────────────────
      {
        labelKey: "Gallery",
        icon: GalleryHorizontal,
        children: [
          { labelKey: "Gallery Images", href: "/admin/website-builder/gallery", icon: GalleryHorizontal },
          { labelKey: "Gallery Categories", href: "/admin/website-builder/gallery/categories", icon: Folder },
        ],
      },
      // ── OTHER SETTINGS & CONTENT MODULES ──────────────────────────────
      {
        labelKey: "Content Modules",
        icon: Layers,
        children: [
          { labelKey: "Features Builder", href: "/admin/website-builder/features", icon: Layers, uiBlockKey: "features" },
          { labelKey: "How It Works", href: "/admin/website-builder/how-it-works", icon: HelpCircle, uiBlockKey: "how-it-works" },
          { labelKey: "Pricing Plans", href: "/admin/website-builder/pricing-plans", icon: DollarSign, uiBlockKey: "pricing-plans" },
          { labelKey: "Testimonials", href: "/admin/website-builder/testimonials", icon: Star, uiBlockKey: "testimonials" },
          {
            labelKey: "Event Templates",
            icon: LayoutGrid,
            uiBlockKey: "templates",
            children: [
              { labelKey: "Event Templates", href: "/admin/website-builder/templates", icon: LayoutGrid },
              { labelKey: "Template Categories", href: "/admin/website-builder/templates/categories", icon: Folder },
            ],
          },
          {
            labelKey: "FAQs",
            icon: HelpCircle,
            uiBlockKey: "faqs",
            children: [
              { labelKey: "All FAQs", href: "/admin/website-builder/faqs", icon: HelpCircle },
              { labelKey: "FAQ Categories", href: "/admin/website-builder/faqs/categories", icon: Folder },
            ],
          },
          {
            labelKey: "Video Tutorials",
            icon: Video,
            uiBlockKey: "video-tutorials",
            children: [
              { labelKey: "All Video Tutorials", href: "/admin/website-builder/video-tutorials", icon: Video },
              { labelKey: "Categories", href: "/admin/website-builder/video-tutorials/categories", icon: Folder },
              { labelKey: "Sub Categories", href: "/admin/website-builder/video-tutorials/subcategories", icon: Folder },
              { labelKey: "Difficulty Levels", href: "/admin/website-builder/video-tutorials/difficulty-levels", icon: BarChart2 },
              { labelKey: "Tutorial Types", href: "/admin/website-builder/video-tutorials/types", icon: Sliders },
            ],
          },
          {
            labelKey: "Contact Us",
            icon: Mail,
            uiBlockKey: "contact_us",
            children: [
              { labelKey: "Contact Settings", href: "/admin/website-builder/contact-us", icon: Mail },
              { labelKey: "Categories", href: "/admin/website-builder/contact-us/categories", icon: Folder },
              { labelKey: "Contact List", href: "/admin/website-builder/contact-us/list", icon: FileText },
            ],
          },
          {
            labelKey: "Slider",
            icon: Folder,
            children: [
              { labelKey: "Simple Slider", href: "/admin/website-builder/simple-slider", icon: Folder, uiBlockKey: "basic-slider" },
              { labelKey: "Advance Slider", href: "/admin/website-builder/advance-slider", icon: Calendar, uiBlockKey: "advance-slider" },
            ],
          },
          {
            labelKey: "Portfolio",
            icon: Award,
            children: [
              { labelKey: "Sponsors", href: "/admin/website-builder/sponsors", icon: Award, uiBlockKey: "basic-sponsors" },
              { labelKey: "Clients", href: "/admin/website-builder/clients", icon: Users, uiBlockKey: "basic-clients" },
            ],
          },
        ],
      },
      // ── GENERAL SETTINGS (flat, no parent group) ──────────────────────
      { labelKey: "Web UI Block", href: "/admin/website-builder/ui-block", icon: LayoutGrid },
      { labelKey: "Languages", href: "/admin/website-builder/languages", icon: Languages },
      { labelKey: "Translations", href: "/admin/website-builder/translations", icon: Globe },
      { labelKey: "Theme Color", href: "/admin/website-builder/theme-color", icon: Palette, uiBlockKey: "theme-color" },
      { labelKey: "SEO Settings", href: "/admin/website-builder/seo", icon: Search, uiBlockKey: "seo" },
      { labelKey: "Login Page", href: "/admin/website-builder/login-page", icon: LogIn, uiBlockKey: "login-page" },
      {
        labelKey: "Custom Pages",
        icon: FileText,
        uiBlockKey: "pages",
        children: [
          { labelKey: "Pages List", href: "/admin/website-builder/pages", icon: FileText },
          { labelKey: "Create Page", href: "/admin/website-builder/pages/create", icon: FileText },
        ],
      },
    ],
  },
  {
    labelKey: "nav.settings",
    href: "/admin/settings",
    icon: Settings,
    permission: "settings.view",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { startLoading } = useNavigationLoader();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: settings } = useSettingsByGroup("appearance");

  const adminTitle =
    settings?.find((s) => s.key === "admin_title")?.value || "Admin Panel";
  const adminLogoUrl =
    settings?.find((s) => s.key === "admin_logo_url")?.value || "";
  const logoHeight =
    settings?.find((s) => s.key === "logo_height")?.value || "40";

  const searchParams = useSearchParams();

  const isActive = (href?: string) => {
    if (!href) return false;
    const [targetPath, targetQuery] = href.split("?");
    if (targetPath === "/admin") return pathname === href;
    if (pathname !== targetPath) return false;

    if (targetQuery) {
      const currentQuery = searchParams?.toString() || "";
      return currentQuery.includes(targetQuery);
    }
    if (pathname.includes("/login-demo/")) {
      return !searchParams || !searchParams.has("variant");
    }
    return true;
  };
  const isChildActive = (children?: MenuItem[]): boolean =>
    !!children?.some(
      (child) =>
        (child.href && isActive(child.href)) ||
        isChildActive(child.children),
    );

  // Use shared permission check hook
  const { hasPermission, isDeveloper, hasMinLevel } = usePermissionCheck();
  const isLoading = !user;

  // Plugin active state
  const { data: pluginsData } = usePlugins();
  const activePluginSlugs = new Set(
    (pluginsData?.plugins ?? []).filter((p) => p.is_active === 1).map((p) => p.slug)
  );

  // UI Block visibility state — hides sidebar items when their block is toggled OFF
  const { data: uiBlocks } = useUiBlocksData();
  const uiBlockVisibility = new Map<string, boolean>(
    (uiBlocks ?? []).map((b) => [b.id, b.visible])
  );

  // Filter menu items based on permissions + plugin state + UI block visibility
  const filterMenuItem = (item: MenuItem): boolean => {
    // Developer-only items
    if (item.developerOnly && !isDeveloper()) {
      return false;
    }

    // Level check
    if (!hasMinLevel(item.minLevel)) {
      return false;
    }

    // Permission check
    if (!hasPermission(item.permission)) {
      return false;
    }

    // Plugin check — only hide if plugins are loaded AND plugin is explicitly inactive
    if (item.pluginSlug && pluginsData && !activePluginSlugs.has(item.pluginSlug)) {
      return false;
    }

    // UI Block visibility check — only hide when blocks have been saved AND block is explicitly OFF
    if (item.uiBlockKey && uiBlocks && uiBlocks.length > 0 && uiBlockVisibility.get(item.uiBlockKey) === false) {
      return false;
    }

    return true;
  };

  // Filter children and check if parent should be shown
  const getVisibleChildren = (children?: MenuItem[]): MenuItem[] => {
    if (!children) return [];
    return children.filter(filterMenuItem);
  };

  // Filter menu items
  const visibleMenuItems = menuItems.filter((item) => {
    if (!filterMenuItem(item)) return false;

    // If item has children, check if any children are visible
    if (item.children) {
      const visibleChildren = getVisibleChildren(item.children);
      return visibleChildren.length > 0;
    }

    return true;
  });

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link
                href="/admin"
                className="flex flex-col items-center gap-2 px-2 py-4"
              >
                {adminLogoUrl ? (
                  <>
                    <img
                      src={adminLogoUrl}
                      alt={adminTitle}
                      style={{ height: `${logoHeight}px` }}
                      className="max-w-full object-contain"
                    />
                    <span className="font-semibold text-lg text-center">
                      {adminTitle}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold">
                        {adminTitle.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-lg text-center">
                      {adminTitle}
                    </span>
                  </>
                )}
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.navigation")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMenuItems.map((item) => {
                  const visibleChildren = getVisibleChildren(item.children);

                  if (visibleChildren.length > 0) {
                    return (
                      <Collapsible
                        key={item.labelKey}
                        defaultOpen={isChildActive(visibleChildren)}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton title={t(item.labelKey)}>
                              {/* shrink-0 + truncate: a long group label like
                                  "Subscription Management" otherwise wraps to two
                                  lines and pushes the chevron out of alignment. */}
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{t(item.labelKey)}</span>
                              <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {visibleChildren.map((child) => {
                                const grandChildren = getVisibleChildren(child.children);
                                if (grandChildren.length > 0) {
                                  // 2nd level collapsible
                                  return (
                                    <Collapsible
                                      key={child.labelKey}
                                      defaultOpen={isChildActive(grandChildren)}
                                      className="group/sub-collapsible"
                                    >
                                      <SidebarMenuSubItem>
                                        <CollapsibleTrigger asChild>
                                          <SidebarMenuSubButton className="cursor-pointer">
                                            <child.icon className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{t(child.labelKey)}</span>
                                            <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/sub-collapsible:rotate-180" />
                                          </SidebarMenuSubButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <SidebarMenuSub className="ml-2 border-l pl-2">
                                            {grandChildren.map((grand) => (
                                              <SidebarMenuSubItem key={grand.labelKey}>
                                                <SidebarMenuSubButton asChild isActive={isActive(grand.href)}>
                                                  <Link
                                                    href={grand.href || '#'}
                                                    onClick={() => {
                                                      if (grand.href && !pathname.startsWith(grand.href)) startLoading();
                                                    }}
                                                    className="flex items-center gap-2"
                                                  >
                                                    <grand.icon className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{t(grand.labelKey)}</span>
                                                  </Link>
                                                </SidebarMenuSubButton>
                                              </SidebarMenuSubItem>
                                            ))}
                                          </SidebarMenuSub>
                                        </CollapsibleContent>
                                      </SidebarMenuSubItem>
                                    </Collapsible>
                                  );
                                }
                                return (
                                  <SidebarMenuSubItem key={child.labelKey}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isActive(child.href)}
                                    >
                                      <Link
                                        href={child.href || "#"}
                                        onClick={() => {
                                          if (child.href && !pathname.startsWith(child.href)) startLoading();
                                        }}
                                        className="flex items-center gap-2"
                                      >
                                        <child.icon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{t(child.labelKey)}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.labelKey}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link
                          href={item.href || "#"}
                          onClick={() => {
                            if (item.href && !pathname.startsWith(item.href)) startLoading();
                          }}
                          className="flex items-center gap-2"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(item.labelKey)}</span>
                          {item.badge && (
                            <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
