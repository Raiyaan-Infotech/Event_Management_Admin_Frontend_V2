"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Eye, EyeOff, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSettingsByGroup, useBulkUpdateSettings } from "@/hooks/use-settings";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { PageLoader } from '@/components/common/page-loader';

export function SocialLoginContent() {
  const { data: settings, isLoading } = useSettingsByGroup("social_login");
  const bulkUpdateMutation = useBulkUpdateSettings();

  const googleEnabled = true;
  const facebookEnabled = true;

  const [showSecrets, setShowSecrets] = useState({
    google: false,
    facebook: false,
  });

  const [values, setValues] = useState({
    google_enabled: false,
    google_client_id: "",
    google_client_secret: "",
    google_redirect_uri: "",
    facebook_enabled: false,
    facebook_app_id: "",
    facebook_app_secret: "",
    facebook_redirect_uri: "",
  });

  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value || "";
      });
      setValues({
        google_enabled: settingsMap.google_enabled === "true",
        google_client_id: settingsMap.google_client_id || "",
        google_client_secret: settingsMap.google_client_secret || "",
        google_redirect_uri: settingsMap.google_redirect_uri || "",
        facebook_enabled: settingsMap.facebook_enabled === "true",
        facebook_app_id: settingsMap.facebook_app_id || "",
        facebook_app_secret: settingsMap.facebook_app_secret || "",
        facebook_redirect_uri: settingsMap.facebook_redirect_uri || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    bulkUpdateMutation.mutate({
      group: "social_login",
      ...values,
      google_enabled: values.google_enabled.toString(),
      facebook_enabled: values.facebook_enabled.toString(),
    });
  };

  const toggleSecretVisibility = (provider: "google" | "facebook") => {
    setShowSecrets(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <PermissionGuard permission="settings.view">
      <>
        <PageLoader open={isLoading || bulkUpdateMutation.isPending} />
        {!isLoading && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Link href="/admin/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Social Login Settings</h1>
                <p className="text-muted-foreground mt-1">
                  Configure social authentication providers for your application
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Google OAuth Card */}
              {googleEnabled && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" className="w-6 h-6" fill="#4285F4">
                          <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                        </svg>
                        Google OAuth
                      </CardTitle>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Get Credentials <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <CardDescription>
                      Configure Google authentication for your users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="google_enabled" className="text-base font-medium">
                        Enable Google Login
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="google_enabled"
                          checked={values.google_enabled}
                          onCheckedChange={(checked) =>
                            setValues({ ...values, google_enabled: checked })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {values.google_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google_client_id">Client ID</Label>
                      <Input
                        id="google_client_id"
                        type="text"
                        placeholder="1234567890-abcdefg.apps.googleusercontent.com"
                        value={values.google_client_id}
                        onChange={(e) => setValues({ ...values, google_client_id: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google_client_secret">Client Secret</Label>
                      <div className="relative">
                        <Input
                          id="google_client_secret"
                          type={showSecrets.google ? "text" : "password"}
                          placeholder="GOCSPX-••••••••••••••••••••"
                          value={values.google_client_secret}
                          onChange={(e) => setValues({ ...values, google_client_secret: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => toggleSecretVisibility("google")}
                        >
                          {showSecrets.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google_redirect_uri">Redirect URI</Label>
                      <Input
                        id="google_redirect_uri"
                        type="url"
                        placeholder="https://yourdomain.com/auth/google/callback"
                        value={values.google_redirect_uri}
                        onChange={(e) => setValues({ ...values, google_redirect_uri: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add this URL to authorized redirect URIs in Google Cloud Console
                      </p>
                    </div>
                  </CardContent>
                </Card>

              )}

              {/* Facebook OAuth Card */}
              {facebookEnabled && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6" fill="#1877F2">
                          <path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.9 3.2 56.4 6.3V172c-6.2-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256z" />
                        </svg>
                        Facebook OAuth
                      </CardTitle>
                      <a
                        href="https://developers.facebook.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Get Credentials <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <CardDescription>
                      Configure Facebook authentication for your users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="facebook_enabled" className="text-base font-medium">
                        Enable Facebook Login
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="facebook_enabled"
                          checked={values.facebook_enabled}
                          onCheckedChange={(checked) =>
                            setValues({ ...values, facebook_enabled: checked })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {values.facebook_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook_app_id">App ID</Label>
                      <Input
                        id="facebook_app_id"
                        type="text"
                        placeholder="1234567890123456"
                        value={values.facebook_app_id}
                        onChange={(e) => setValues({ ...values, facebook_app_id: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook_app_secret">App Secret</Label>
                      <div className="relative">
                        <Input
                          id="facebook_app_secret"
                          type={showSecrets.facebook ? "text" : "password"}
                          placeholder="••••••••••••••••••••••••••••••••"
                          value={values.facebook_app_secret}
                          onChange={(e) => setValues({ ...values, facebook_app_secret: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => toggleSecretVisibility("facebook")}
                        >
                          {showSecrets.facebook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook_redirect_uri">Redirect URI</Label>
                      <Input
                        id="facebook_redirect_uri"
                        type="url"
                        placeholder="https://yourdomain.com/auth/facebook/callback"
                        value={values.facebook_redirect_uri}
                        onChange={(e) => setValues({ ...values, facebook_redirect_uri: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add this URL to Valid OAuth Redirect URIs in Facebook App Settings
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} isLoading={bulkUpdateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Social Login Settings
              </Button>
            </div>
          </div>
        )}
      </>
    </PermissionGuard>
  );
}