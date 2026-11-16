'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  Key,
  Shield,
  HelpCircle,
  CheckCircle2,
  Lock,
  FileText,
  LayoutGrid,
  Zap,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/common/page-loader";
import {
  usePushNotificationConfigs,
  useCreatePushNotificationConfig,
  useUpdatePushNotificationConfig,
  useTestPushNotificationConnection,
  useDeletePushNotificationConfig,
  type PushNotificationConfig,
} from "@/hooks/use-push-notification-configs";
import { toast } from "@/lib/toast";

function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  if (diffSec < 2592000) {
    const weeks = Math.floor(diffSec / 604800);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  return date.toLocaleDateString();
}

export function PushNotificationConfigContent() {
  const router = useRouter();
  const { data: configs = [], isLoading } = usePushNotificationConfigs();
  const createMutation = useCreatePushNotificationConfig();
  const updateMutation = useUpdatePushNotificationConfig();
  const testMutation = useTestPushNotificationConnection();
  const deleteMutation = useDeletePushNotificationConfig();

  // Selected config ID (defaults to active config or first)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"json" | "manual">("json");

  // Form state
  const [name, setName] = useState("GpsCam");
  const [isActive, setIsActive] = useState(true);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("No file chosen");

  // Manual fields
  const [projectId, setProjectId] = useState("fb-analytics-d02ea");
  const [webApiKey, setWebApiKey] = useState("");
  const [appId, setAppId] = useState("");
  const [messagingSenderId, setMessagingSenderId] = useState("");
  const [authDomain, setAuthDomain] = useState("");
  const [storageBucket, setStorageBucket] = useState("");
  const [measurementId, setMeasurementId] = useState("");
  const [vapidKey, setVapidKey] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state when configs load or selectedId changes
  useEffect(() => {
    if (configs.length > 0) {
      const active = configs.find((c) => c.is_active) || configs[0];
      const target = selectedId ? configs.find((c) => c.id === selectedId) || active : active;
      if (target) {
        setSelectedId(target.id);
        setName(target.name || "GpsCam");
        setIsActive(Boolean(target.is_active));
        setProjectId(target.project_id || "");
        setWebApiKey(target.web_api_key || "");
        setAppId(target.app_id || "");
        setMessagingSenderId(target.messaging_sender_id || "");
        setAuthDomain(target.auth_domain || "");
        setStorageBucket(target.storage_bucket || "");
        setMeasurementId(target.measurement_id || "");
        setVapidKey(target.vapid_key || "");
        setSelectedFile(null);
        setFileName("No file chosen");
        setServiceAccountJson("");
      }
    } else if (!isLoading && configs.length === 0) {
      // Defaults for brand new first project
      setSelectedId(null);
      setName("GpsCam");
      setIsActive(true);
      setProjectId("fb-analytics-d02ea");
    }
  }, [configs, selectedId, isLoading]);

  const currentConfig: PushNotificationConfig | undefined = configs.find((c) => c.id === selectedId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".json")) {
        toast.error("Please select a valid .json file");
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);

      // Also read file content into textarea to show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setServiceAccountJson(text);
          try {
            const parsed = JSON.parse(text);
            if (parsed.project_id) {
              setProjectId(parsed.project_id);
            }
          } catch {
            // ignore
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setName("New Firebase Project");
    setIsActive(configs.length === 0);
    setProjectId("");
    setWebApiKey("");
    setAppId("");
    setMessagingSenderId("");
    setAuthDomain("");
    setStorageBucket("");
    setMeasurementId("");
    setVapidKey("");
    setServiceAccountJson("");
    setSelectedFile(null);
    setFileName("No file chosen");
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a Configuration Label / Name");
      return;
    }

    const payload = {
      name: name.trim(),
      is_active: isActive,
      service_account_json: serviceAccountJson.trim() || undefined,
      file: selectedFile,
      project_id: projectId.trim() || undefined,
      web_api_key: webApiKey.trim() || undefined,
      app_id: appId.trim() || undefined,
      messaging_sender_id: messagingSenderId.trim() || undefined,
      auth_domain: authDomain.trim() || undefined,
      storage_bucket: storageBucket.trim() || undefined,
      measurement_id: measurementId.trim() || undefined,
      vapid_key: vapidKey.trim() || undefined,
    };

    if (selectedId) {
      updateMutation.mutate(
        { id: selectedId, data: payload },
        {
          onSuccess: (saved) => {
            setSelectedFile(null);
            setFileName("No file chosen");
            setSelectedId(saved.id);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (saved) => {
          setSelectedFile(null);
          setFileName("No file chosen");
          setSelectedId(saved.id);
        },
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 w-full">
      <PageLoader open={isLoading || isSaving} />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {selectedId ? "Edit Firebase Project" : "New Firebase Project"}
            </h1>
            {isActive && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400 shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                Active Routing Project
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Update credentials, switch routing status, or upload a replacement Service Account JSON for{" "}
            <span className="font-semibold text-foreground">{name || "GpsCam"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {configs.length > 1 && (
            <select
              value={selectedId || ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="h-9 px-3 py-1 text-xs font-medium bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_active ? "(Active)" : ""}
                </option>
              ))}
            </select>
          )}

          {selectedId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateNew}
              className="h-9 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Project
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/settings")}
            className="h-9 px-4 text-xs font-medium"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            Update Configuration
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Main Form) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Project Details */}
          <Card className="rounded-xl border border-border/70 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Settings className="w-4 h-4 text-blue-600" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Configuration Label / Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="config-label" className="text-xs font-semibold text-foreground">
                    Configuration Label / Name <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {name.length} / 100
                  </span>
                </div>
                <Input
                  id="config-label"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="GpsCam"
                  className="h-10 text-sm border-border/80 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify this Firebase project in the admin console.
                </p>
              </div>

              {/* Set as active toggle */}
              <div className="flex items-start justify-between pt-3 border-t border-border/50">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="active-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                      Set as active project immediately upon saving
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, outgoing push notifications will immediately route through this Firebase project.
                  </p>
                </div>
                <Switch
                  id="active-toggle"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Credentials & Service Account */}
          <Card className="rounded-xl border border-border/70 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Key className="w-4 h-4 text-blue-600" />
                Credentials & Service Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Active Service Account Banner */}
              {(currentConfig?.has_service_account || currentConfig?.project_id) && (
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Service Account Loaded: Private key and credentials currently active.
                      </p>
                      <p className="text-xs text-emerald-700/90 dark:text-emerald-300/80">
                        Upload a new .json file below only if you wish to overwrite existing credentials.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide bg-emerald-600 text-white shadow-xs shrink-0">
                    Active Key
                  </span>
                </div>
              )}

              {/* Segmented Button Tab Switcher */}
              <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/60 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "json"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Upload Service Account JSON (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "manual"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Manual Fields & Web SDK
                </button>
              </div>

              {/* TAB 1: Upload Service Account JSON */}
              {activeTab === "json" && (
                <div className="space-y-4 pt-1">
                  {/* File Upload Box */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Upload New Firebase Service Account JSON (Optional)
                    </Label>
                    <div className="flex items-center gap-3 p-1.5 bg-background rounded-lg border border-border/80">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-medium bg-muted/70 hover:bg-muted"
                      >
                        Choose File
                      </Button>
                      <span className="text-xs text-muted-foreground truncate max-w-sm">
                        {fileName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave blank to retain current active Service Account key. Upload a new .json file to replace.
                    </p>
                  </div>

                  {/* Or Paste JSON */}
                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="paste-json" className="text-xs font-semibold text-foreground">
                      Or Paste Service Account JSON Content
                    </Label>
                    <Textarea
                      id="paste-json"
                      value={serviceAccountJson}
                      onChange={(e) => setServiceAccountJson(e.target.value)}
                      rows={6}
                      placeholder={`{ "type": "service_account", "project_id": "...", "private_key": "..." }`}
                      className="font-mono text-xs border-border/80 bg-background/50 focus:bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste new JSON content to replace current credentials.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Manual Fields & Web SDK */}
              {activeTab === "manual" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Firebase Project ID <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="fb-analytics-d02ea"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Web API Key <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={webApiKey}
                      onChange={(e) => setWebApiKey(e.target.value)}
                      placeholder="e.g. AIzaSyD..."
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      App ID (Mobile / Web) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="e.g. 1:123456789:android:abcdef"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Messaging Sender ID <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={messagingSenderId}
                      onChange={(e) => setMessagingSenderId(e.target.value)}
                      placeholder="e.g. 123456789012"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Auth Domain <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                      placeholder="e.g. geocam.firebaseapp.com"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Storage Bucket <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={storageBucket}
                      onChange={(e) => setStorageBucket(e.target.value)}
                      placeholder="e.g. geocam.appspot.com"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Measurement ID <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={measurementId}
                      onChange={(e) => setMeasurementId(e.target.value)}
                      placeholder="e.g. G-XXXXXXX"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      VAPID Key (Web Push) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={vapidKey}
                      onChange={(e) => setVapidKey(e.target.value)}
                      placeholder="e.g. BEIZ..."
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Status & Handshake) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Project Status */}
          <Card className="rounded-xl border border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-black">
                  ?
                </span>
                Project Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground font-medium">Connection Health</span>
                <span className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {currentConfig?.connection_status === "connected"
                    ? "Connected"
                    : currentConfig?.connection_status === "error"
                    ? "Error"
                    : currentConfig?.connection_status === "disconnected"
                    ? "Disconnected"
                    : "Connected"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                <span className="text-muted-foreground font-medium">Routing State</span>
                <span className="font-bold text-foreground">
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                <span className="text-muted-foreground font-medium">Last Verified</span>
                <span className="font-bold text-foreground">
                  {formatTimeAgo(currentConfig?.last_verified_at)}
                </span>
              </div>

              {selectedId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testMutation.isPending}
                  onClick={() => testMutation.mutate(selectedId)}
                  className="w-full mt-2 text-xs font-semibold h-8"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-2" />
                  )}
                  Verify Handshake Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Automated Handshake */}
          <Card className="rounded-xl border border-border/70 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Shield className="w-4 h-4 text-blue-600" />
                Automated Handshake
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When updated, our system validates the private key against Google Cloud OAuth2 endpoints before applying changes.
              </p>
            </CardContent>
          </Card>

          {/* Delete Project button if not only project */}
          {selectedId && configs.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${name}?`)) {
                  deleteMutation.mutate(selectedId);
                }
              }}
              className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete This Firebase Project
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Sticky/Fixed Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/settings")}
          className="h-10 px-5 text-xs font-medium"
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-10 px-6 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          Update Configuration
        </Button>
      </div>
    </div>
  );
}
