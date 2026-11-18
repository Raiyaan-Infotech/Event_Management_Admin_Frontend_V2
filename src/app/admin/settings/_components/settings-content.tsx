"use client";

import Link from "next/link";
import {
  Settings,
  Mail,
  Bell,
  FileText,
  Phone,
  Globe,
  DollarSign,
  Image,
  Link2,
  Shield,
  Database,
  MapPin,
  BarChart3,
  Palette,
  Languages,
  Users,
  Building2,
  Lock,
  Puzzle,
  Activity,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissionCheck } from "@/hooks";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { PageLoader } from "@/components/common/page-loader";
import { usePendingCount } from "@/hooks/use-approvals";

interface SettingItem {
  labelKey: string;
  descriptionKey: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  permission?: string;
  badgeKey?: string;
}

interface SettingGroup {
  titleKey: string;
  items: SettingItem[];
  badgeKey?: string;
}

const settingGroups: SettingGroup[] = [
  {
    titleKey: "settings.general",
    items: [
      {
        labelKey: "settings.general",
        descriptionKey: "settings.general_desc",
        href: "/admin/settings/general",
        icon: Settings,
        permission: "settings.view",
      },
      {
        labelKey: "settings.media_disk_config",
        descriptionKey: "settings.media_disk_config_desc",
        href: "/admin/settings/media",
        icon: Image,
        permission: "media.view",
      },
    ],
  },
  {
    titleKey: "settings.localization",
    items: [
      {
        labelKey: "settings.languages",
        descriptionKey: "settings.languages_desc",
        href: "/admin/settings/languages",
        icon: Globe,
        permission: "languages.view",
      },
      {
        labelKey: "settings.currencies",
        descriptionKey: "settings.currencies_desc",
        href: "/admin/settings/currencies",
        icon: DollarSign,
        permission: "currencies.view",
      },
      {
        labelKey: "settings.translations",
        descriptionKey: "settings.translations_desc",
        href: "/admin/settings/translations",
        icon: Languages,
        permission: "translations.view",
      },
    ],
  },
  {
    titleKey: "settings.location_timezone",
    items: [
      {
        labelKey: "settings.locations",
        descriptionKey: "settings.locations_desc",
        href: "/admin/settings/locations",
        icon: MapPin,
        permission: "locations.view",
      },
      {
        labelKey: "settings.timezone",
        descriptionKey: "settings.timezone_desc",
        href: "/admin/settings/timezone",
        icon: Clock,
        permission: "settings.view",
      },
    ],
  },
  {
    titleKey: "settings.communication",
    items: [
      {
        labelKey: "settings.email",
        descriptionKey: "settings.email_desc",
        href: "/admin/settings/email",
        icon: Mail,
        permission: "email_configs.view",
      },
      {
        labelKey: "settings.email_templates",
        descriptionKey: "settings.email_templates_desc",
        href: "/admin/settings/templates",
        icon: FileText,
        permission: "email_templates.view",
      },
      {
        labelKey: "Push Notifications",
        descriptionKey: "Configure Firebase Cloud Messaging and app push notification credentials",
        href: "/admin/settings/push-notifications",
        icon: Bell,
        permission: "settings.view",
      },
      {
        labelKey: "settings.phone_number",
        descriptionKey: "settings.phone_number_desc",
        href: "/admin/settings/phone",
        icon: Phone,
        badge: "common.comming",
        permission: "settings.view",
      },
    ],
  },
  {
    titleKey: "settings.appearance",
    items: [
      {
        labelKey: "settings.dashboard_theme",
        descriptionKey: "settings.dashboard_theme_desc",
        href: "/admin/settings/admin-apperance",
        icon: Palette,
        permission: "settings.view",
      },
      {
        labelKey: "settings.color_palettes",
        descriptionKey: "settings.color_palettes_desc",
        href: "/admin/color-palettes",
        icon: Palette,
        permission: "color_palettes.view",
      },
      {
        labelKey: "nav.modules",
        descriptionKey: "settings.modules_desc",
        href: "/admin/platform/modules",
        icon: Shield,
        permission: "modules.view",
      },
    ],
  },
  {
    titleKey: "settings.performance",
    items: [
      {
        labelKey: "settings.cache",
        descriptionKey: "settings.cache_desc",
        href: "/admin/settings/cache",
        icon: Database,
        permission: "settings.view",
      },
      {
        labelKey: "settings.optimize",
        descriptionKey: "settings.optimize_desc",
        href: "/admin/settings/optimize",
        icon: BarChart3,
        permission: "settings.view",
      },
    ],
  },
  {
    titleKey: "settings.reports_logs",
    items: [
      {
        labelKey: "settings.activity_logs",
        descriptionKey: "settings.activity_logs_desc",
        href: "/admin/activity-logs",
        icon: Activity,
        permission: "activity_logs.view",
      },
    ],
  },
  {
    titleKey: "settings.platform_admin",
    badgeKey: "pendingCount",
    items: [
      {
        labelKey: "nav.approvals",
        descriptionKey: "settings.approvals_desc",
        href: "/admin/approvals",
        icon: ShieldCheck,
        permission: "approvals.view",
        badgeKey: "pendingCount",
      },
      {
        labelKey: "nav.employees",
        descriptionKey: "settings.employees_desc",
        href: "/admin/platform/users",
        icon: Users,
        permission: "employees.view",
      },
      {
        labelKey: "nav.roles",
        descriptionKey: "settings.roles_desc",
        href: "/admin/platform/roles",
        icon: Lock,
        permission: "roles.view",
      },
    ],
  },
];

export function SettingsContent() {
  const { t } = useTranslation();
  const { isLoading } = useAuth();
  const { hasPermission } = usePermissionCheck();
  const { data: pendingCount = 0 } = usePendingCount();

  // Filter setting items based on permissions
  const filterItems = (items: SettingItem[]): SettingItem[] => {
    return items.filter(item => hasPermission(item.permission));
  };

  // Filter groups that have at least one visible item
  const visibleGroups = settingGroups
    .map(group => ({
      ...group,
      items: filterItems(group.items),
    }))
    .filter(group => group.items.length > 0);

  return (
    <PermissionGuard permission="settings.view">
      <PageLoader open={isLoading} text={t("common.loading", "Loading...")} />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("nav.settings")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("settings.page_desc")}</p>
          </div>
        </div>

        {visibleGroups.map((group) => (
          <Card key={group.titleKey}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{t(group.titleKey)}</CardTitle>
              {group.badgeKey === "pendingCount" && pendingCount > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemBadgeCount = item.badgeKey === "pendingCount" ? pendingCount : null;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer">
                        <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary group-hover:underline">
                              {t(item.labelKey)}
                              {item.badge && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  ({t(item.badge)})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {t(item.descriptionKey)}
                            </p>
                          </div>
                          {itemBadgeCount && itemBadgeCount > 0 && (
                            <Badge variant="destructive" className="flex-shrink-0 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]">
                              {itemBadgeCount > 99 ? "99+" : itemBadgeCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGuard>
  );
}