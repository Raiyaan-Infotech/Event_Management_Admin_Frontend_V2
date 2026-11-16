"use client";

import { useState } from "react";
import { ArrowLeft, Trash2, RefreshCw, Database, FileText, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { PermissionGuard } from "@/components/guards/permission-guard";

interface CacheItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  size: string;
}

const cacheItems: CacheItem[] = [
  {
    id: "application",
    label: "Application Cache",
    description: "Cached application data, compiled views, and framework cache",
    icon: Database,
    size: "12.4 MB",
  },
  {
    id: "config",
    label: "Configuration Cache",
    description: "Compiled configuration files for faster loading",
    icon: FileText,
    size: "256 KB",
  },
  {
    id: "views",
    label: "View Cache",
    description: "Compiled template and view files",
    icon: FileText,
    size: "4.2 MB",
  },
  {
    id: "images",
    label: "Image Cache",
    description: "Cached thumbnails and optimized images",
    icon: ImageIcon,
    size: "89.7 MB",
  },
];

export function CacheContent() {
  const [clearing, setClearing] = useState<string | null>(null);

  const handleClear = async (id: string) => {
    setClearing(id);
    // Simulate cache clearing
    setTimeout(() => {
      setClearing(null);
      toast.success(`${cacheItems.find(c => c.id === id)?.label} cleared successfully`);
    }, 1000);
  };

  const handleClearAll = () => {
    setClearing("all");
    setTimeout(() => {
      setClearing(null);
      toast.success("All caches cleared successfully");
    }, 1500);
  };

  return (
    <PermissionGuard minLevel={100}>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/platform">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Cache Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage and clear application caches
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleClearAll}
          disabled={clearing !== null}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {clearing === "all" ? "Clearing..." : "Clear All Cache"}
        </Button>
      </div>

      <div className="grid gap-4">
        {cacheItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{item.size}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClear(item.id)}
                    disabled={clearing !== null}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${clearing === item.id ? "animate-spin" : ""}`} />
                    {clearing === item.id ? "Clearing..." : "Clear"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </PermissionGuard>
  );
}
