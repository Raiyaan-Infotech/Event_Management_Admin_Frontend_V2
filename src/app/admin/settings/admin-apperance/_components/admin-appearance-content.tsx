"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, RotateCcw, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSettingsByGroup, useBulkUpdateSettings } from "@/hooks/use-settings";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { PageLoader } from '@/components/common/page-loader';
import { toast } from "@/lib/toast";

const PRESET_PALETTES = [
  {
    id: "indigo",
    name: "Indigo Slate (Recommended)",
    light: {
      primary_color: "#4f46e5",
      secondary_color: "#64748b",
      background_color: "#f8fafc",
      sidebar_color: "#0f172a",
      sidebar_hover_color: "#1e293b",
      card_color: "#ffffff",
      border_color: "#e2e8f0",
      accent_color: "#eef2ff",
      link_color: "#4f46e5",
      btn_primary_bg: "#4f46e5",
      btn_primary_hover: "#4338ca",
    },
    dark: {
      dark_primary_color: "#6366f1",
      dark_secondary_color: "#475569",
      dark_background_color: "#090d16",
      dark_sidebar_color: "#0f172a",
      dark_sidebar_hover_color: "#1e293b",
      dark_card_color: "#1e293b",
      dark_border_color: "#334155",
      dark_accent_color: "#312e81",
      dark_link_color: "#818cf8",
      dark_btn_primary_bg: "#6366f1",
      dark_btn_primary_hover: "#4f46e5",
    },
  },
  {
    id: "emerald",
    name: "Emerald Executive",
    light: {
      primary_color: "#059669",
      secondary_color: "#475569",
      background_color: "#f0fdf4",
      sidebar_color: "#064e3b",
      sidebar_hover_color: "#047857",
      card_color: "#ffffff",
      border_color: "#d1fae5",
      accent_color: "#d1fae5",
      link_color: "#059669",
      btn_primary_bg: "#059669",
      btn_primary_hover: "#047857",
    },
    dark: {
      dark_primary_color: "#10b981",
      dark_secondary_color: "#334155",
      dark_background_color: "#041f16",
      dark_sidebar_color: "#064e3b",
      dark_sidebar_hover_color: "#047857",
      dark_card_color: "#065f46",
      dark_border_color: "#047857",
      dark_accent_color: "#065f46",
      dark_link_color: "#34d399",
      dark_btn_primary_bg: "#10b981",
      dark_btn_primary_hover: "#059669",
    },
  },
  {
    id: "royal",
    name: "Royal Sapphire",
    light: {
      primary_color: "#2563eb",
      secondary_color: "#475569",
      background_color: "#f0f9ff",
      sidebar_color: "#1e3a8a",
      sidebar_hover_color: "#1d4ed8",
      card_color: "#ffffff",
      border_color: "#dbeafe",
      accent_color: "#dbeafe",
      link_color: "#2563eb",
      btn_primary_bg: "#2563eb",
      btn_primary_hover: "#1d4ed8",
    },
    dark: {
      dark_primary_color: "#3b82f6",
      dark_secondary_color: "#334155",
      dark_background_color: "#081a36",
      dark_sidebar_color: "#1e3a8a",
      dark_sidebar_hover_color: "#1d4ed8",
      dark_card_color: "#1e40af",
      dark_border_color: "#1d4ed8",
      dark_accent_color: "#1e40af",
      dark_link_color: "#60a5fa",
      dark_btn_primary_bg: "#3b82f6",
      dark_btn_primary_hover: "#2563eb",
    },
  },
  {
    id: "midnight",
    name: "Midnight Onyx",
    light: {
      primary_color: "#7c3aed",
      secondary_color: "#475569",
      background_color: "#faf5ff",
      sidebar_color: "#311075",
      sidebar_hover_color: "#6d28d9",
      card_color: "#ffffff",
      border_color: "#ede9fe",
      accent_color: "#ede9fe",
      link_color: "#7c3aed",
      btn_primary_bg: "#7c3aed",
      btn_primary_hover: "#6d28d9",
    },
    dark: {
      dark_primary_color: "#8b5cf6",
      dark_secondary_color: "#334155",
      dark_background_color: "#16082e",
      dark_sidebar_color: "#311075",
      dark_sidebar_hover_color: "#6d28d9",
      dark_card_color: "#4c1d95",
      dark_border_color: "#6d28d9",
      dark_accent_color: "#4c1d95",
      dark_link_color: "#a78bfa",
      dark_btn_primary_bg: "#8b5cf6",
      dark_btn_primary_hover: "#7c3aed",
    },
  },
];

const lightColors = [
  { key: "primary_color", label: "Primary Color", defaultVal: "#4f46e5" },
  { key: "secondary_color", label: "Secondary Color", defaultVal: "#64748b" },
  { key: "background_color", label: "Background Color", defaultVal: "#f8fafc" },
  { key: "sidebar_color", label: "Sidebar Background", defaultVal: "#0f172a" },
  { key: "sidebar_hover_color", label: "Sidebar Hover", defaultVal: "#1e293b" },
  { key: "card_color", label: "Card Background", defaultVal: "#ffffff" },
  { key: "border_color", label: "Border Color", defaultVal: "#e2e8f0" },
  { key: "muted_color", label: "Muted Background", defaultVal: "#f1f5f9" },
  { key: "accent_color", label: "Accent Highlight", defaultVal: "#eef2ff" },
  { key: "heading_color", label: "Heading Text", defaultVal: "#0f172a" },
  { key: "text_color", label: "Body Text", defaultVal: "#1e293b" },
  { key: "link_color", label: "Link Color", defaultVal: "#4f46e5" },
  { key: "link_hover_color", label: "Link Hover Color", defaultVal: "#4338ca" },
];

const darkColors = [
  { key: "dark_primary_color", label: "Primary Color", defaultVal: "#6366f1" },
  { key: "dark_secondary_color", label: "Secondary Color", defaultVal: "#475569" },
  { key: "dark_background_color", label: "Background Color", defaultVal: "#090d16" },
  { key: "dark_sidebar_color", label: "Sidebar Background", defaultVal: "#0f172a" },
  { key: "dark_sidebar_hover_color", label: "Sidebar Hover", defaultVal: "#1e293b" },
  { key: "dark_card_color", label: "Card Background", defaultVal: "#1e293b" },
  { key: "dark_border_color", label: "Border Color", defaultVal: "#334155" },
  { key: "dark_muted_color", label: "Muted Background", defaultVal: "#1e293b" },
  { key: "dark_accent_color", label: "Accent Highlight", defaultVal: "#312e81" },
  { key: "dark_heading_color", label: "Heading Text", defaultVal: "#f8fafc" },
  { key: "dark_text_color", label: "Body Text", defaultVal: "#e2e8f0" },
  { key: "dark_link_color", label: "Link Color", defaultVal: "#818cf8" },
  { key: "dark_link_hover_color", label: "Link Hover Color", defaultVal: "#a5b4fc" },
];

const buttonColors = [
  { key: "btn_primary_bg", label: "Primary BG", defaultVal: "#4f46e5" },
  { key: "btn_primary_text", label: "Primary Text", defaultVal: "#ffffff" },
  { key: "btn_primary_hover", label: "Primary Hover", defaultVal: "#4338ca" },
  { key: "btn_secondary_bg", label: "Secondary BG", defaultVal: "#f1f5f9" },
  { key: "btn_secondary_text", label: "Secondary Text", defaultVal: "#1e293b" },
  { key: "btn_secondary_hover", label: "Secondary Hover", defaultVal: "#e2e8f0" },
  { key: "btn_destructive_bg", label: "Destructive BG", defaultVal: "#ef4444" },
  { key: "btn_destructive_text", label: "Destructive Text", defaultVal: "#ffffff" },
  { key: "btn_destructive_hover", label: "Destructive Hover", defaultVal: "#dc2626" },
  { key: "btn_outline_border", label: "Outline Border", defaultVal: "#e2e8f0" },
  { key: "btn_outline_text", label: "Outline Text", defaultVal: "#1e293b" },
  { key: "btn_outline_hover", label: "Outline Hover BG", defaultVal: "#f1f5f9" },
];

const darkButtonColors = [
  { key: "dark_btn_primary_bg", label: "Primary BG", defaultVal: "#6366f1" },
  { key: "dark_btn_primary_text", label: "Primary Text", defaultVal: "#ffffff" },
  { key: "dark_btn_primary_hover", label: "Primary Hover", defaultVal: "#4f46e5" },
  { key: "dark_btn_secondary_bg", label: "Secondary BG", defaultVal: "#1e293b" },
  { key: "dark_btn_secondary_text", label: "Secondary Text", defaultVal: "#e2e8f0" },
  { key: "dark_btn_secondary_hover", label: "Secondary Hover", defaultVal: "#334155" },
  { key: "dark_btn_destructive_bg", label: "Destructive BG", defaultVal: "#ef4444" },
  { key: "dark_btn_destructive_text", label: "Destructive Text", defaultVal: "#ffffff" },
  { key: "dark_btn_destructive_hover", label: "Destructive Hover", defaultVal: "#dc2626" },
  { key: "dark_btn_outline_border", label: "Outline Border", defaultVal: "#334155" },
  { key: "dark_btn_outline_text", label: "Outline Text", defaultVal: "#e2e8f0" },
  { key: "dark_btn_outline_hover", label: "Outline Hover BG", defaultVal: "#1e293b" },
];

export function AdminAppearanceContent() {
  const { data: settings, isLoading } = useSettingsByGroup("appearance");
  const bulkUpdateMutation = useBulkUpdateSettings();

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    lightColors.forEach((c) => { initial[c.key] = c.defaultVal; });
    darkColors.forEach((c) => { initial[c.key] = c.defaultVal; });
    buttonColors.forEach((c) => { initial[c.key] = c.defaultVal; });
    darkButtonColors.forEach((c) => { initial[c.key] = c.defaultVal; });
    return initial;
  });

  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value || "";
      });
      const updated: Record<string, string> = {};
      lightColors.forEach((c) => {
        updated[c.key] = settingsMap[c.key] || c.defaultVal;
      });
      darkColors.forEach((c) => {
        updated[c.key] = settingsMap[c.key] || c.defaultVal;
      });
      buttonColors.forEach((c) => {
        updated[c.key] = settingsMap[c.key] || c.defaultVal;
      });
      darkButtonColors.forEach((c) => {
        updated[c.key] = settingsMap[c.key] || c.defaultVal;
      });
      setValues(updated);
    }
  }, [settings]);

  const handleApplyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    const updated = {
      ...values,
      ...preset.light,
      ...preset.dark,
    };
    setValues(updated);
    toast.success(`Applied ${preset.name} palette for both Light and Dark mode.`);
  };

  const handleSave = () => {
    bulkUpdateMutation.mutate({
      group: "appearance",
      ...values,
    });
  };

  const handleResetSection = (section: "light" | "dark" | "buttonLight" | "buttonDark" | "all") => {
    const newValues = { ...values };
    if (section === "light" || section === "all") {
      lightColors.forEach((c) => { newValues[c.key] = c.defaultVal; });
    }
    if (section === "dark" || section === "all") {
      darkColors.forEach((c) => { newValues[c.key] = c.defaultVal; });
    }
    if (section === "buttonLight" || section === "all") {
      buttonColors.forEach((c) => { newValues[c.key] = c.defaultVal; });
    }
    if (section === "buttonDark" || section === "all") {
      darkButtonColors.forEach((c) => { newValues[c.key] = c.defaultVal; });
    }
    setValues(newValues);
    bulkUpdateMutation.mutate({
      group: "appearance",
      ...newValues,
    });
  };

  return (
    <PermissionGuard permission="settings.view">
      <>
        <PageLoader open={isLoading || bulkUpdateMutation.isPending} />

        {!isLoading && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
              <div className="flex items-center gap-4">
                <Link href="/admin/settings">
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs">
                      <Sparkles className="h-3 w-3" /> System Customization
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mt-1">Dashboard Color Theme</h1>
                  <p className="text-xs text-muted-foreground">
                    Customize professional brand colors, HSL accent palettes, and dark mode themes for the Admin Panel.
                  </p>
                </div>
              </div>

              <Button onClick={handleSave} isLoading={bulkUpdateMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Save Theme Colors
              </Button>
            </div>

            {/* Curated Presets Bar */}
            <Card className="border-primary/20 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Curated Professional Color Palettes
                </CardTitle>
                <CardDescription className="text-xs">
                  Click a preset below to apply synchronized Light & Dark mode color themes across the Admin Panel.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {PRESET_PALETTES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="flex items-center gap-2.5 rounded-lg border p-2.5 bg-background hover:border-primary transition-all text-xs font-semibold"
                  >
                    <span className="flex h-5 w-5 rounded-full border shadow-xs" style={{ backgroundColor: preset.light.primary_color }} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Light Mode Colors */}
              <Card>
                <CardHeader className="border-b pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">Light Mode Colors</CardTitle>
                      <CardDescription className="text-xs">Colors applied in light mode</CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" isLoading={bulkUpdateMutation.isPending} className="h-8 text-xs">
                          <RotateCcw className="h-3.5 w-3.5" /> Reset Light
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Light Mode Colors?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset all light mode colors to their default professional values.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleResetSection("light")}>
                            Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 gap-3">
                    {lightColors.map((item) => (
                      <div key={item.key} className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground">{item.label}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={values[item.key] || item.defaultVal}
                            onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                            className="w-12 h-9 cursor-pointer p-1 rounded-md"
                          />
                          <Input
                            type="text"
                            value={values[item.key] || item.defaultVal}
                            onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                            className="flex-1 h-9 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dark Mode Colors */}
              <Card>
                <CardHeader className="border-b pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">Dark Mode Colors</CardTitle>
                      <CardDescription className="text-xs">Colors applied in dark mode</CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" isLoading={bulkUpdateMutation.isPending} className="h-8 text-xs">
                          <RotateCcw className="h-3.5 w-3.5" /> Reset Dark
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Dark Mode Colors?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset all dark mode colors to their default professional values.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleResetSection("dark")}>
                            Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 gap-3">
                    {darkColors.map((item) => (
                      <div key={item.key} className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground">{item.label}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={values[item.key] || item.defaultVal}
                            onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                            className="w-12 h-9 cursor-pointer p-1 rounded-md"
                          />
                          <Input
                            type="text"
                            value={values[item.key] || item.defaultVal}
                            onChange={(e) => setValues({ ...values, [item.key]: e.target.value })}
                            className="flex-1 h-9 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </>
    </PermissionGuard>
  );
}