"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus } from "lucide-react";
import {
  useCreateRole,
  useUpdateRole,
  useAssignPermissions,
} from "@/hooks/use-roles";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { isApprovalRequired } from "@/lib/api-client";
import type { Role, Permission } from "@/types";

const roleSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  slug: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSuccess?: () => void;
}

interface ModuleGroup {
  name: string;
  slug: string;
  color?: string;
  bgColor?: string;
}

const moduleGroups: ModuleGroup[] = [
  {
    name: "Settings",
    slug: "settings",
    color: "text-foreground",
    bgColor: "bg-muted/40",
  },
  {
    name: "Users & Roles",
    slug: "users_roles",
    color: "text-foreground",
    bgColor: "bg-muted/40",
  },
  {
    name: "Content",
    slug: "cms",
    color: "text-foreground",
    bgColor: "bg-muted/40",
  },
  {
    name: "Localization",
    slug: "localization",
    color: "text-foreground",
    bgColor: "bg-muted/40",
  },
  {
    name: "Appearance",
    slug: "appearance",
    color: "text-foreground",
    bgColor: "bg-muted/40",
  },
  {
    name: "System",
    slug: "system",
    color: "text-foreground",
    bgColor: "bg-muted/40",
  },
];

function getModulesForGroup(groupSlug: string, allModules: string[]): string[] {
  if (groupSlug === "settings")
    return allModules.filter((m) => m === "settings");
  if (groupSlug === "users_roles")
    return allModules.filter((m) =>
      ["employees", "roles", "permissions", "modules", "approvals", "companies"].includes(m),
    );
  if (groupSlug === "cms")
    return allModules.filter((m) =>
      [
        "media",
        "translations",
        "languages",
        "pages",
        "blog",
        "testimonials",
        "ads",
        "announcements",
        "faqs",
        "faq_categories",
        "contact",
      ].includes(m),
    );
  if (groupSlug === "localization")
    return allModules.filter((m) => ["locations", "currencies"].includes(m));
  if (groupSlug === "appearance")
    return allModules.filter((m) => ["appearance"].includes(m));
  if (groupSlug === "system") {
    // Collect all modules assigned to other groups
    const assignedModules = [
      "settings",
      "employees", "roles", "permissions", "modules", "approvals", "companies",
      "media", "translations", "languages", "pages", "blog", "blog_posts", "blog_categories", "blog_tags", "testimonials", "ads", "announcements", "faqs", "faq_categories", "contact",

      "locations", "currencies",
      "appearance"
    ];
    // Return system modules PLUS any modules not assigned anywhere else (catch-all)
    return allModules.filter((m) =>
      [
        "activity_logs",
        "email_campaigns",
        "email_configs",
        "email_templates",
        "plugins",
        "tools",
        "platform",
        "other",
      ].includes(m) || !assignedModules.includes(m)
    );
  }
  return [];
}

// For Settings: group permissions into virtual sub-modules by their section prefix
function groupSettingsPermissions(
  permissions: Permission[],
): { slug: string; name: string; permissions: Permission[] }[] {
  const sectionMap: Record<string, Permission[]> = {};
  const displayNames: Record<string, string> = {};

  permissions.forEach((p) => {
    const slug = p.slug || "";
    const name = p.name || "";

    // Extract section key from slug: "settings.optimize_settings_view" → "optimize_settings"
    const slugPart = slug
      .replace(/^settings\./, "")
      .replace(/_?(view|create|edit|delete|manage|all)$/i, "");
    // Extract display name from human name: "Optimize Settings View" → "Optimize Settings"
    const namePart = name
      .replace(/\s*(View|Create|Edit|Delete|Manage|All)$/i, "")
      .trim();

    const key =
      slugPart || namePart.toLowerCase().replace(/\s+/g, "_") || "general";
    const displayName =
      namePart ||
      slugPart.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (!sectionMap[key]) {
      sectionMap[key] = [];
      displayNames[key] = displayName;
    }
    sectionMap[key].push(p);
  });

  return Object.entries(sectionMap).map(([key, perms]) => ({
    slug: `settings_${key}`,
    name:
      displayNames[key] ||
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    permissions: perms,
  }));
}

// Split faq permissions into virtual sub-modules by slug prefix (faqs / faq_categories)
function groupFaqPermissions(
  permissions: Permission[],
): { slug: string; name: string; permissions: Permission[] }[] {
  const displayNames: Record<string, string> = {
    faqs: "FAQs",
    faq_categories: "FAQ Categories",
  };
  const groupMap: Record<string, Permission[]> = {};
  permissions.forEach((p) => {
    const prefix = p.slug?.split(".")[0] || "faqs";
    if (!groupMap[prefix]) groupMap[prefix] = [];
    groupMap[prefix].push(p);
  });
  return Object.entries(groupMap).map(([key, perms]) => ({
    slug: key,
    name: displayNames[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    permissions: perms,
  }));
}

// Split blog permissions into virtual sub-modules by slug prefix (blog_posts / blog_categories / blog_tags)
function groupBlogPermissions(
  permissions: Permission[],
): { slug: string; name: string; permissions: Permission[] }[] {
  const displayNames: Record<string, string> = {
    blog_posts: "Blog Posts",
    blog_categories: "Blog Categories",
    blog_tags: "Blog Tags",
  };
  const groupMap: Record<string, Permission[]> = {};
  permissions.forEach((p) => {
    const prefix = p.slug?.split(".")[0] || "blog";
    if (!groupMap[prefix]) groupMap[prefix] = [];
    groupMap[prefix].push(p);
  });
  return Object.entries(groupMap).map(([key, perms]) => ({
    slug: key,
    name: displayNames[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    permissions: perms,
  }));
}

export function RoleForm({ role, onSuccess }: RoleFormProps) {
  const router = useRouter();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const assignPermissionsMutation = useAssignPermissions();
  const { data: permissionsData, isLoading: permissionsLoading } =
    usePermissions({ limit: 500 });
  const filteredPermissions = permissionsData?.data ?? [];

  const [expandedSubModules, setExpandedSubModules] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<
    Set<string>
  >(new Set());
  const [approvalSubModules, setApprovalSubModules] = useState<
    Record<string, boolean>
  >({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || "",
      slug: role?.slug || "",
      description: role?.description || "",
      is_active: role ? Boolean(role.is_active) : true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (!role?.permissions || !permissionsData?.data) return;

    const keys = new Set<string>();
    role.permissions.forEach((p: Permission) => keys.add(p.slug));
    setSelectedPermissionKeys(keys);

    // Build perm slug → subModuleSlug map from computed groups
    const permToSubMod = new Map<string, string>();
    const allGroups = moduleGroups.map((group) => {
      const subModuleSlugs = getModulesForGroup(
        group.slug,
        Object.keys(
          (permissionsData.data || []).reduce(
            (acc, p) => {
              acc[p.module || "other"] = true;
              return acc;
            },
            {} as Record<string, boolean>,
          ),
        ),
      );
      let subMods: { slug: string; permissions: Permission[] }[];
      const grouped = (permissionsData.data || []).reduce(
        (acc, p) => {
          const mod = p.module || "other";
          if (!acc[mod]) acc[mod] = [];
          acc[mod].push(p);
          return acc;
        },
        {} as Record<string, Permission[]>,
      );
      if (group.slug === "settings") {
        subMods = groupSettingsPermissions(
          permissionsData.data.filter((p) => p.module === "settings"),
        );
      } else if (group.slug === "cms") {
        subMods = subModuleSlugs.flatMap((mod) => {
          if (mod === "blog") {
            return groupBlogPermissions(grouped["blog"] || []).map((s) => ({
              slug: s.slug,
              permissions: s.permissions,
            }));
          }
          if (mod === "faqs") {
            return groupFaqPermissions(grouped["faqs"] || []).map((s) => ({
              slug: s.slug,
              permissions: s.permissions,
            }));
          }
          return [{ slug: mod, permissions: grouped[mod] || [] }];
        });
      } else {

        subMods = subModuleSlugs.map((mod) => ({
          slug: mod,
          permissions: grouped[mod] || [],
        }));
      }
      return subMods;
    });
    allGroups.forEach((subMods) =>
      subMods.forEach((sm) =>
        sm.permissions.forEach((p) => permToSubMod.set(p.slug, sm.slug)),
      ),
    );

    const approvals: Record<string, boolean> = {};
    role.permissions.forEach(
      (
        p: Permission & { RolePermission?: { requires_approval?: boolean } },
      ) => {
        if (p.RolePermission?.requires_approval) {
          const subModSlug = permToSubMod.get(p.slug) || p.module || "other";
          approvals[subModSlug] = true;
        }
      },
    );
    setApprovalSubModules(approvals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, permissionsData]);

  const toggleSubModule = (slug: string) => {
    setExpandedSubModules((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const togglePermission = (slug: string) => {
    setSelectedPermissionKeys((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const toggleSubModuleAll = (
    subModuleSlug: string,
    permissions: Permission[],
    checked: boolean,
  ) => {
    setSelectedPermissionKeys((prev) => {
      const next = new Set(prev);
      permissions.forEach((p) =>
        checked ? next.add(p.slug) : next.delete(p.slug),
      );
      return next;
    });
    // When selecting all permissions in a sub-module, auto-uncheck Requires Approval
    if (checked) {
      setApprovalSubModules((prev) => {
        const next = { ...prev };
        delete next[subModuleSlug];
        return next;
      });
    }
  };

  const toggleGroupAll = (
    subModuleSlugs: string[],
    permissions: Permission[],
    checked: boolean,
  ) => {
    setSelectedPermissionKeys((prev) => {
      const next = new Set(prev);
      permissions.forEach((p) =>
        checked ? next.add(p.slug) : next.delete(p.slug),
      );
      return next;
    });
    // When selecting all in a group, auto-uncheck Requires Approval for all sub-modules
    if (checked) {
      setApprovalSubModules((prev) => {
        const next = { ...prev };
        subModuleSlugs.forEach((s) => delete next[s]);
        return next;
      });
    }
  };

  const toggleAllPermissions = (checked: boolean) => {
    if (checked) {
      const all = new Set(filteredPermissions.map((p) => p.slug));
      setSelectedPermissionKeys(all);
      // Uncheck all requires approval when selecting all permissions
      setApprovalSubModules({});
    } else {
      setSelectedPermissionKeys(new Set());
    }
  };

  const toggleSubModuleApproval = (subModuleSlug: string, checked: boolean) => {
    setApprovalSubModules((prev) => {
      const next = { ...prev };
      if (checked) next[subModuleSlug] = true;
      else delete next[subModuleSlug];
      return next;
    });
  };

  const buildPayload = (permKeys: Set<string>) => {
    // Build perm slug → subModuleSlug map
    const permToSubMod = new Map<string, string>();
    groups.forEach((group) => {
      group.subModules.forEach((sm) => {
        sm.permissions.forEach((p) => permToSubMod.set(p.slug, sm.slug));
      });
    });

    return Array.from(permKeys)
      .map((slug) => {
        const permission = permissionsData?.data?.find((p) => p.slug === slug);
        if (!permission) return null;
        const subModSlug =
          permToSubMod.get(slug) || permission.module || "other";
        return {
          permissionId: permission.id,
          requiresApproval: !!approvalSubModules[subModSlug],
        };
      })
      .filter(Boolean) as { permissionId: number; requiresApproval: boolean }[];
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/admin/platform/roles");
    }
  };

  const [isRedirecting, setIsRedirecting] = useState(false);

  const navigateToList = () => {
    setIsRedirecting(true);
    onSuccess?.() ?? router.push("/admin/platform/roles");
  };

  const onSubmit = async (data: RoleFormData) => {
    const payload = buildPayload(selectedPermissionKeys);
    const apiData = { ...data, is_active: data.is_active ? 1 : 0 };
    if (role) {
      updateRoleMutation.mutate(
        { id: role.id, data: apiData },
        {
          onSuccess: () => {
            assignPermissionsMutation.mutate(
              { id: role.id, permissions: payload },
              { onSuccess: navigateToList, onError: () => setIsRedirecting(false) },
            );
          },
          onError: (error: any) => {
            setIsRedirecting(false);
            if (isApprovalRequired(error)) navigateToList();
          },
        },
      );
    } else {
      createRoleMutation.mutate(data, {
        onSuccess: (newRole) => {
          if (payload.length > 0) {
            assignPermissionsMutation.mutate(
              { id: newRole.id, permissions: payload },
              { onSuccess: navigateToList, onError: () => setIsRedirecting(false) },
            );
          } else {
            navigateToList();
          }
        },
        onError: (error: any) => {
          setIsRedirecting(false);
          if (isApprovalRequired(error)) navigateToList();
        },
      });
    }
  };

  const isPending =
    createRoleMutation.isPending ||
    updateRoleMutation.isPending ||
    assignPermissionsMutation.isPending ||
    isRedirecting;

  // Group permissions by module slug (uses filtered list — inactive plugin modules excluded)
  const groupedByModule = filteredPermissions.reduce(
    (acc, permission) => {
      const mod = permission.module || "other";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const allModuleSlugs = Object.keys(groupedByModule);

  // Build final groups with sub-modules
  const groups = moduleGroups
    .map((group) => {
      const subModuleSlugs = getModulesForGroup(group.slug, allModuleSlugs);

      let subModules: {
        slug: string;
        name: string;
        permissions: Permission[];
      }[];
      if (group.slug === "settings") {
        // Split settings permissions into virtual sub-modules by section
        const settingsPerms = groupedByModule["settings"] || [];
        subModules = groupSettingsPermissions(settingsPerms);
      } else if (group.slug === "cms") {
        const cmsNames: Record<string, string> = { faq_categories: "FAQ Categories" };
        subModules = subModuleSlugs.flatMap((mod) => {
          if (mod === "blog") {
            return groupBlogPermissions(groupedByModule["blog"] || []);
          }
          if (mod === "faqs") {
            return groupFaqPermissions(groupedByModule["faqs"] || []);
          }
          return [{
            slug: mod,
            name: cmsNames[mod] ?? mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            permissions: groupedByModule[mod] || [],
          }];
        });
      } else {
        subModules = subModuleSlugs.map((mod) => ({
          slug: mod,
          name: mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          permissions: groupedByModule[mod] || [],
        }));
      }

      const allGroupPermissions = subModules.flatMap((s) => s.permissions);
      return { ...group, subModules, allGroupPermissions };
    })
    .filter((g) => g.subModules.length > 0);

  const allPermissions = filteredPermissions;
  const allSelected =
    allPermissions.length > 0 &&
    allPermissions.every((p) => selectedPermissionKeys.has(p.slug));
  const someSelected = allPermissions.some((p) =>
    selectedPermissionKeys.has(p.slug),
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Role Details Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" placeholder="Name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Short description"
              {...register("description")}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <Label htmlFor="is_active" className="cursor-pointer font-normal">
              Is Active?
            </Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Permission Flags Card */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-base">Permission Flags</span>
            <div className="ml-auto flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-permissions"
                  checked={allSelected}
                  data-state={
                    someSelected && !allSelected ? "indeterminate" : undefined
                  }
                  onCheckedChange={(checked) => toggleAllPermissions(!!checked)}
                />
                <label
                  htmlFor="all-permissions"
                  className="text-sm cursor-pointer"
                >
                  All Permissions
                </label>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setExpandedSubModules(new Set())}
                >
                  Collapse all
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    const all = groups.flatMap((g) =>
                      g.subModules.map((s) => s.slug),
                    );
                    setExpandedSubModules(new Set(all));
                  }}
                >
                  Expand all
                </button>
              </div>
            </div>
          </div>

          {permissionsLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading permissions...
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              {groups.map((group) => {
                const groupAllSelected =
                  group.allGroupPermissions.length > 0 &&
                  group.allGroupPermissions.every((p) =>
                    selectedPermissionKeys.has(p.slug),
                  );
                const groupSomeSelected = group.allGroupPermissions.some((p) =>
                  selectedPermissionKeys.has(p.slug),
                );

                return (
                  <div
                    key={group.slug}
                    className={cn("border-b last:border-b-0")}
                  >
                    {/* Module Group Header Row */}
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5",
                        group.bgColor,
                      )}
                    >
                      <Checkbox
                        checked={groupAllSelected}
                        data-state={
                          groupSomeSelected && !groupAllSelected
                            ? "indeterminate"
                            : undefined
                        }
                        onCheckedChange={(checked) =>
                          toggleGroupAll(
                            group.subModules.map((s) => s.slug),
                            group.allGroupPermissions,
                            !!checked,
                          )
                        }
                      />
                      <span
                        className={cn("font-semibold text-sm", group.color)}
                      >
                        {group.name}
                      </span>
                    </div>

                    {/* Sub-Modules — grid of self-contained cells */}
                    <div className="px-5 py-3 bg-background">
                      <div className="flex flex-wrap gap-x-8 gap-y-1 items-start">
                        {group.subModules.map((subModule) => {
                          const subAllSelected =
                            subModule.permissions.length > 0 &&
                            subModule.permissions.every((p) =>
                              selectedPermissionKeys.has(p.slug),
                            );
                          const subSomeSelected = subModule.permissions.some(
                            (p) => selectedPermissionKeys.has(p.slug),
                          );
                          const isExpanded = expandedSubModules.has(
                            subModule.slug,
                          );

                          return (
                            // Each sub-module is a self-contained cell: chip + children below
                            <div
                              key={subModule.slug}
                              className="flex flex-col min-w-[120px]"
                            >
                              {/* Chip row */}
                              <div className="flex items-center gap-1.5 py-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubModule(subModule.slug)
                                  }
                                  className="w-[18px] h-[18px] rounded border border-border/70 flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors flex-shrink-0"
                                >
                                  {isExpanded ? (
                                    <Minus className="h-2.5 w-2.5" />
                                  ) : (
                                    <Plus className="h-2.5 w-2.5" />
                                  )}
                                </button>
                                <Checkbox
                                  id={`submod-${subModule.slug}`}
                                  checked={subAllSelected}
                                  data-state={
                                    subSomeSelected && !subAllSelected
                                      ? "indeterminate"
                                      : undefined
                                  }
                                  onCheckedChange={(checked) =>
                                    toggleSubModuleAll(
                                      subModule.slug,
                                      subModule.permissions,
                                      !!checked,
                                    )
                                  }
                                />
                                <label
                                  htmlFor={`submod-${subModule.slug}`}
                                  className="text-sm cursor-pointer text-primary font-medium whitespace-nowrap"
                                >
                                  {subModule.name}
                                </label>
                              </div>

                              {/* Children — appear directly below this chip */}
                              {isExpanded && (
                                <div className="ml-[28px] flex flex-col gap-0.5 mt-0.5">
                                  {/* Sort: "all" (manage) first, then the rest */}
                                  {[...subModule.permissions]
                                    .sort((a, b) => {
                                      const aIsAll = a.slug.endsWith(".manage");
                                      const bIsAll = b.slug.endsWith(".manage");
                                      if (aIsAll && !bIsAll) return -1;
                                      if (!aIsAll && bIsAll) return 1;
                                      return 0;
                                    })
                                    .map((permission) => {
                                      const rawLabel =
                                        permission.slug.split(".").pop() ||
                                        permission.name;
                                      const isAllPerm = rawLabel === "manage";
                                      const shortLabel = isAllPerm
                                        ? "all"
                                        : rawLabel;
                                      return (
                                        <div
                                          key={permission.id}
                                          className={cn(
                                            "flex items-center gap-2 py-0.5",
                                            isAllPerm && "mb-0.5",
                                          )}
                                        >
                                          <Checkbox
                                            id={`perm-${permission.id}`}
                                            checked={selectedPermissionKeys.has(
                                              permission.slug,
                                            )}
                                            onCheckedChange={(checked) => {
                                              if (isAllPerm && checked) {
                                                // "all" selects all permissions in this sub-module
                                                toggleSubModuleAll(
                                                  subModule.slug,
                                                  subModule.permissions,
                                                  true,
                                                );
                                              } else if (
                                                isAllPerm &&
                                                !checked
                                              ) {
                                                // Unchecking "all" deselects all
                                                toggleSubModuleAll(
                                                  subModule.slug,
                                                  subModule.permissions,
                                                  false,
                                                );
                                              } else {
                                                togglePermission(
                                                  permission.slug,
                                                );
                                              }
                                            }}
                                          />
                                          <label
                                            htmlFor={`perm-${permission.id}`}
                                            className={cn(
                                              "text-sm cursor-pointer capitalize",
                                              isAllPerm
                                                ? "font-medium text-primary"
                                                : "text-foreground",
                                            )}
                                          >
                                            {shortLabel}
                                          </label>
                                        </div>
                                      );
                                    })}

                                  {/* Requires Approval — at the bottom of expanded permissions */}
                                  <div className="flex items-center gap-2 py-0.5 mt-0.5 border-t border-border/30 pt-1.5">
                                    <Checkbox
                                      id={`approval-${subModule.slug}`}
                                      checked={
                                        !!approvalSubModules[subModule.slug]
                                      }
                                      onCheckedChange={(checked) =>
                                        toggleSubModuleApproval(
                                          subModule.slug,
                                          !!checked,
                                        )
                                      }
                                    />
                                    <label
                                      htmlFor={`approval-${subModule.slug}`}
                                      className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                                    >
                                      Requires Approval
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={isPending}>
          {isPending ? "Saving..." : role ? "Update Role" : "Create Role"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          isLoading={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
