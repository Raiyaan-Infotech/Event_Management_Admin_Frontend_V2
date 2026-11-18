"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useSettingsByGroup,
  useBulkUpdateSettings,
} from "@/hooks/use-settings";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { PageLoader } from '@/components/common/page-loader';

export function WebsiteTrackingContent() {
  const { data: settings, isLoading } = useSettingsByGroup("analytics");
  const bulkUpdateMutation = useBulkUpdateSettings();

  const gtmEnabled = true;
  const ga4Enabled = true;

  const [values, setValues] = useState({
    tracking_type: "gtm",
    gtm_container_id: "",
    enable_gtm_debug: false,
    enable_gtm_events: false,
    ga4_measurement_id: "",
  });

  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value || "";
      });
      setValues({
        tracking_type: settingsMap.tracking_type || "gtm",
        gtm_container_id: settingsMap.gtm_container_id || "",
        enable_gtm_debug: settingsMap.enable_gtm_debug === "true",
        enable_gtm_events: settingsMap.enable_gtm_events === "true",
        ga4_measurement_id: settingsMap.ga4_measurement_id || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    bulkUpdateMutation.mutate({
      group: "analytics",
      tracking_type: values.tracking_type,
      gtm_container_id: values.gtm_container_id,
      enable_gtm_debug: String(values.enable_gtm_debug),
      enable_gtm_events: String(values.enable_gtm_events),
      ga4_measurement_id: values.ga4_measurement_id,
    });
  };

  return (
    <PermissionGuard permission="settings.view">
      <div className="space-y-6">
        <PageLoader open={isLoading || bulkUpdateMutation.isPending} />

        {!isLoading && (
          <>
            <div className="flex items-center gap-4">
              <Link href="/admin/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Analytics & Tracking Settings</h1>
                <p className="text-muted-foreground mt-1">
                  Configure Google Tag Manager or Google Analytics tracking
                </p>
              </div>
            </div>

            {/* Tracking Type Selection */}
            {(
              <Card>
                <CardContent className="pt-6">
                  <RadioGroup
                    value={values.tracking_type}
                    onValueChange={(val) =>
                      setValues({ ...values, tracking_type: val })
                    }
                    className="flex justify-center items-center gap-6"
                  >
                    {gtmEnabled && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gtm" id="gtm" />
                        <Label htmlFor="gtm" className="cursor-pointer font-normal">
                          Google Tag Manager (Recommended)
                        </Label>
                      </div>
                    )}

                    {ga4Enabled && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ga4" id="ga4" />
                        <Label htmlFor="ga4" className="cursor-pointer font-normal">
                          Google Analytics Only
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Google Tag Manager Configuration */}
            {gtmEnabled && values.tracking_type === "gtm" && (
              <>
                {/* Info Box */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-900">
                        Best for managing multiple tracking services (Google
                        Analytics, Facebook Pixel, etc.) in one place. Provides a
                        user-friendly interface without coding.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Setup Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Setup Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <div>
                          <strong>Create GTM Account:</strong> Go to{" "}
                          <a
                            href="https://tagmanager.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            tagmanager.google.com
                          </a>{" "}
                          and create a new container for your website
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <div>
                          <strong>Get Container ID:</strong> After creation, copy the
                          Container ID (format: GTM-XXXXXXX) from the top right corner
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <div>
                          <strong>Paste ID Below:</strong> Enter your Container ID in
                          the field below and save
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <div>
                          <strong>Configure Tags:</strong> Add your analytics tags
                          (Google Analytics, Facebook Pixel, etc.) in the GTM
                          dashboard
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">5.</span>
                        <div>
                          <strong>Publish Container:</strong> Click "Submit" in GTM to
                          publish your changes
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* GTM Container ID */}
                <Card>
                  <CardHeader>
                    <CardTitle>GTM Container ID</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-w-md">
                      <Input
                        id="gtm_container_id"
                        type="text"
                        placeholder="GTM-P3GQNVL3"
                        value={values.gtm_container_id}
                        onChange={(e) =>
                          setValues({ ...values, gtm_container_id: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your GTM Container ID (e.g., GTM-N7MIK3KH2). Find this
                        in the top right corner of your Google Tag Manager dashboard.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Enable GTM Debug Mode */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="enable_gtm_debug"
                        checked={values.enable_gtm_debug}
                        onCheckedChange={(checked) =>
                          setValues({
                            ...values,
                            enable_gtm_debug: checked as boolean,
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="enable_gtm_debug"
                          className="cursor-pointer font-medium"
                        >
                          Enable GTM Debug Mode
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enable debug mode to log GTM events to browser console and
                          troubleshoot tracking issues. Disable in production for
                          better performance.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Adding GA4 Tracking with GTM */}
                <Card>
                  <CardHeader>
                    <CardTitle>Adding GA4 Tracking with GTM</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">
                      After setting up your GTM container, add Google Analytics 4
                      tracking:
                    </p>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <div>
                          In GTM → click{" "}
                          <strong>Tags → New → Tag Configuration</strong>
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <div>
                          Choose <strong>Google Analytics: GA4 Configuration</strong>
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <div>
                          Enter your <strong>GA4 Measurement ID</strong> (get this
                          from Google Analytics → Admin → Data Streams → Web →
                          Measurement ID)
                          <div className="ml-4 mt-1 text-muted-foreground italic text-xs">
                            e.g., G-ABE123456
                          </div>
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <div>
                          Set <strong>Trigger → choose All Pages</strong> (so it fires
                          on every page)
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">5.</span>
                        <div>
                          <strong>Save the tag and Publish your GTM container</strong>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* How to Verify Your Setup */}
                <Card>
                  <CardHeader>
                    <CardTitle>How to Verify Your Setup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <div>
                          <strong>Save Configuration:</strong> Click Save Changes
                          button below
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <div>
                          <strong>Visit Your Site:</strong> Open your website in a new
                          incognito/private window
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <div>
                          <strong>Check GTM Preview Mode:</strong> In GTM dashboard,
                          click "Preview" to enable debugging
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <div>
                          <strong>Verify Tag Assistant:</strong> Install{" "}
                          <a
                            href="https://tagassistant.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Google Tag Assistant
                          </a>{" "}
                          Chrome extension to verify tags are firing
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">5.</span>
                        <div>
                          <strong>Check Browser Console:</strong> Press F12, go to
                          Console tab, look for GTM messages
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Common Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle>Common Issues:</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Tags Not Firing:</strong> Make sure you published
                          your container in GTM
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Wrong Container:</strong> Verify you're using the
                          correct Container ID for this domain
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Blocked by Ad Blocker:</strong> Test in incognito
                          mode without extensions
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Caching Issues:</strong> Clear browser cache or test
                          in incognito mode
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Enable Google Tag Manager Tracking Events */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="enable_gtm_events"
                        checked={values.enable_gtm_events}
                        onCheckedChange={(checked) =>
                          setValues({
                            ...values,
                            enable_gtm_events: checked as boolean,
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="enable_gtm_events"
                          className="cursor-pointer font-medium"
                        >
                          Enable Google Tag Manager Tracking Events
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          When enabled, e-commerce events will be tracked through
                          Google Tag Manager. Make sure you have configured Google Tag
                          Manager above.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Google Analytics Only Configuration */}
            {ga4Enabled && values.tracking_type === "ga4" && (
              <>
                {/* Info Box */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-900">
                        Simple setup for basic Google Analytics tracking. Choose this
                        if you only need Google Analytics and nothing else.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Setup Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Setup Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <div>
                          <strong>Create GA4 Property:</strong> Go to{" "}
                          <a
                            href="https://analytics.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Google Analytics
                          </a>{" "}
                          and create a new GA4 property
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <div>
                          <strong>Get Measurement ID:</strong> Navigate to Admin →
                          Data Streams → Select your stream → Copy the Measurement ID
                          (format: G-XXXXXXXXXX)
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <div>
                          <strong>Paste ID Below:</strong> Enter your Measurement ID
                          in the field below and save
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <div>
                          <strong>Verify Setup:</strong> Check "Realtime" report in
                          Google Analytics after saving
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Common Mistakes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Common Mistakes:</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>Using Property ID instead of Measurement ID</div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          Using old Universal Analytics ID (UA-XXXXX-X) - these are
                          deprecated
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          Not waiting 24-48 hours for data to appear in reports
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Google Analytics Only */}
                <Card>
                  <CardHeader>
                    <CardTitle>Google Analytics Only</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-w-md">
                      <Input
                        id="ga4_measurement_id"
                        type="text"
                        placeholder="Example: G-123ABC4567"
                        value={values.ga4_measurement_id}
                        onChange={(e) =>
                          setValues({ ...values, ga4_measurement_id: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your Google Analytics 4 Measurement ID. Find this in
                        Google Analytics under Admin → Data Streams → Your Stream →
                        Measurement ID.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* How to Verify Your Setup */}
                <Card>
                  <CardHeader>
                    <CardTitle>How to Verify Your Setup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <div>
                          <strong>Save Configuration:</strong> Click Save Changes
                          button below
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <div>
                          <strong>Visit Your Site:</strong> Open your website in a new
                          incognito/private window
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <div>
                          <strong>Check Realtime Report:</strong> Go to Google
                          Analytics → Reports → Realtime → Overview
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <div>
                          <strong>Wait for Data:</strong> You should see your visit
                          within 30 seconds
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold">5.</span>
                        <div>
                          <strong>Check Browser Console:</strong> Press F12, Network
                          tab, filter by "google-analytics" to see if requests are
                          sent
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Common Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle>Common Issues:</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>No Data Appearing:</strong> Wait 24-48 hours for
                          full reports (Realtime works immediately)
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Wrong ID Format:</strong> Must be G-XXXXXXXXXX not
                          UA-XXXXX-X
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Blocked by Ad Blocker:</strong> Test in incognito
                          mode without extensions
                        </div>
                      </li>
                      <li className="flex gap-2">
                        <span>•</span>
                        <div>
                          <strong>Multiple IDs:</strong> Only use one ID field - GA4
                          Measurement ID (starts with G-)
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} isLoading={bulkUpdateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Analytics Settings
              </Button>
            </div>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}