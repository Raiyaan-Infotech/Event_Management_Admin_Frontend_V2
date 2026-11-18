"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSettingsByGroup,
  useBulkUpdateSettings,
} from "@/hooks/use-settings";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { PageLoader } from '@/components/common/page-loader';

const ALL_DRIVERS = [
  { value: "local", label: "Local disk", plugin: null },
  { value: "s3", label: "Amazon S3", plugin: "amazon-s3" },
  { value: "cloudflare", label: "Cloudflare R2", plugin: "cloudflare-r2" },
  { value: "digitalocean", label: "DigitalOcean Spaces", plugin: "digitalocean-spaces" },
  { value: "wasabi", label: "Wasabi", plugin: "wasabi" },
];

export function MediaContent() {
  const { data: settings, isLoading } = useSettingsByGroup("media");
  const bulkUpdateMutation = useBulkUpdateSettings();

  const s3Active = true;
  const r2Active = true;
  const doActive = true;
  const wbActive = true;

  const pluginActiveMap: Record<string, boolean> = {
    "amazon-s3": s3Active,
    "cloudflare-r2": r2Active,
    "digitalocean-spaces": doActive,
    "wasabi": wbActive,
  };

  const drivers = ALL_DRIVERS.filter(
    (d) => d.plugin === null || pluginActiveMap[d.plugin]
  );

  const [values, setValues] = useState({
    driver: "s3",
    aws_access_key: "",
    aws_secret_key: "",
    aws_region: "",
    aws_bucket: "",
    aws_url: "",
    aws_endpoint: "",
    aws_account_id: "",
    custom_s3_path: "",
    use_path_style_endpoint: "no",
  });

  const [showPasswords, setShowPasswords] = useState({
    access_key: false,
    secret_key: false,
  });

  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, string> = {};
      settings.forEach((s) => {
        settingsMap[s.key] = s.value || "";
      });
      setValues({
        driver: settingsMap.driver || "s3",
        aws_access_key: settingsMap.aws_access_key || "",
        aws_secret_key: settingsMap.aws_secret_key || "",
        aws_region: settingsMap.aws_region || "",
        aws_bucket: settingsMap.aws_bucket || "",
        aws_url: settingsMap.aws_url || "",
        aws_endpoint: settingsMap.aws_endpoint || "",
        aws_account_id: settingsMap.aws_account_id || "",
        custom_s3_path: settingsMap.custom_s3_path || "",
        use_path_style_endpoint: settingsMap.use_path_style_endpoint || "no",
      });
    }
  }, [settings]);

  const handleSave = () => {
    bulkUpdateMutation.mutate({ group: "media", ...values });
  };

  const renderDriverFields = () => {
    if (values.driver === "local") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Local Storage</CardTitle>
            <CardDescription>
              Files will be stored on your local server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No additional configuration required. Files will be stored in the
              default storage directory.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Access Key */}
        <Card>
          <CardHeader>
            <CardTitle>Access Key</CardTitle>
            <CardDescription>
              {values.driver === "s3"
                ? "Your AWS Access Key ID"
                : "Your storage provider access key"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="aws_access_key">Access Key</Label>
              <div className="relative">
                <Input
                  id="aws_access_key"
                  type={showPasswords.access_key ? "text" : "password"}
                  placeholder="AKIAXXXXXXXXXXXXXXXX"
                  value={values.aws_access_key}
                  onChange={(e) =>
                    setValues({ ...values, aws_access_key: e.target.value })
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPasswords({ ...showPasswords, access_key: !showPasswords.access_key })}
                >
                  {showPasswords.access_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secret Key */}
        <Card>
          <CardHeader>
            <CardTitle>Secret Key</CardTitle>
            <CardDescription>
              {values.driver === "s3"
                ? "Your AWS Secret Access Key"
                : "Your storage provider secret key"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="aws_secret_key">Secret Key</Label>
              <div className="relative">
                <Input
                  id="aws_secret_key"
                  type={showPasswords.secret_key ? "text" : "password"}
                  placeholder="••••••••••••••••••••"
                  value={values.aws_secret_key}
                  onChange={(e) =>
                    setValues({ ...values, aws_secret_key: e.target.value })
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPasswords({ ...showPasswords, secret_key: !showPasswords.secret_key })}
                >
                  {showPasswords.secret_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account ID (Cloudflare R2) */}
        {values.driver === "cloudflare" && (
          <Card>
            <CardHeader>
              <CardTitle>Cloudflare Account ID</CardTitle>
              <CardDescription>
                Your Cloudflare account ID (used to construct the R2 endpoint)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="aws_account_id">Account ID</Label>
                <Input
                  id="aws_account_id"
                  type="text"
                  placeholder="your-cloudflare-account-id"
                  value={values.aws_account_id}
                  onChange={(e) =>
                    setValues({ ...values, aws_account_id: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* AWS Region */}
        <Card>
          <CardHeader>
            <CardTitle>
              {values.driver === "s3" ? "AWS Region" : "Region"}
            </CardTitle>
            <CardDescription>
              {values.driver === "s3"
                ? "The AWS region where your S3 bucket is located"
                : "The region where your storage bucket is located"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="aws_region">Region</Label>
              <Input
                id="aws_region"
                type="text"
                placeholder={values.driver === "s3" ? "eu-north-1" : "auto"}
                value={values.aws_region}
                onChange={(e) =>
                  setValues({ ...values, aws_region: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* AWS Bucket */}
        <Card>
          <CardHeader>
            <CardTitle>
              {values.driver === "s3" ? "AWS Bucket" : "Bucket Name"}
            </CardTitle>
            <CardDescription>The name of your storage bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="aws_bucket">Bucket</Label>
              <Input
                id="aws_bucket"
                type="text"
                placeholder="raiyaan-test"
                value={values.aws_bucket}
                onChange={(e) =>
                  setValues({ ...values, aws_bucket: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* AWS URL */}
        <Card>
          <CardHeader>
            <CardTitle>
              {values.driver === "s3" ? "AWS URL" : "Storage URL"}
            </CardTitle>
            <CardDescription>
              The public URL to access your stored files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="aws_url">URL</Label>
              <Input
                id="aws_url"
                type="url"
                placeholder="https://d2423c9j40z83w.cloudfront.net/"
                value={values.aws_url}
                onChange={(e) =>
                  setValues({ ...values, aws_url: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* AWS Endpoint (Optional) */}
        {values.driver !== "s3" && (
          <Card>
            <CardHeader>
              <CardTitle>
                {values.driver === "cloudflare"
                  ? "Cloudflare"
                  : values.driver === "digitalocean"
                    ? "DigitalOcean"
                    : values.driver === "wasabi"
                      ? "Wasabi"
                      : values.driver === "backblaze"
                        ? "Backblaze"
                        : ""}{" "}
                Endpoint (Optional)
              </CardTitle>
              <CardDescription>
                Custom endpoint URL for your storage provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="aws_endpoint">Endpoint</Label>
                <Input
                  id="aws_endpoint"
                  type="url"
                  placeholder="Optional"
                  value={values.aws_endpoint}
                  onChange={(e) =>
                    setValues({ ...values, aws_endpoint: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom S3 Path */}
        <Card>
          <CardHeader>
            <CardTitle>Custom S3 Path (Optional)</CardTitle>
            <CardDescription>
              Optional custom path in S3 bucket (e.g., uploads/media)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="custom_s3_path">Custom Path</Label>
              <Input
                id="custom_s3_path"
                type="text"
                placeholder="uploads/media"
                value={values.custom_s3_path}
                onChange={(e) =>
                  setValues({ ...values, custom_s3_path: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Use Path Style Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>Use path style endpoint</CardTitle>
            <CardDescription>
              Enable path-style endpoint URLs (required for some providers)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Path Style Endpoint</Label>
              <Select
                value={values.use_path_style_endpoint}
                onValueChange={(val) =>
                  setValues({ ...values, use_path_style_endpoint: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <PermissionGuard permission="media.view">
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
                <h1 className="text-2xl sm:text-3xl font-bold">Media Storage Settings</h1>
                <p className="text-muted-foreground mt-1">
                  Configure where and how your media files are stored
                </p>
              </div>
            </div>

            {/* Driver Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Driver</CardTitle>
                <CardDescription>Select your storage provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-md">
                  <Label>Storage Driver</Label>
                  <Select
                    value={values.driver}
                    onValueChange={(val) => setValues({ ...values, driver: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.value} value={driver.value}>
                          {driver.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Fields Based on Driver */}
            {renderDriverFields()}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} isLoading={bulkUpdateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save Media Settings
              </Button>
            </div>
          </div>
        )}
      </>
    </PermissionGuard>
  );
}