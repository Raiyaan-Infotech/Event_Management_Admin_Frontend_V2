"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Settings, User, Search, Clock, Mail, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import Breadcrumb from "@/components/layout/breadcrumb";
import { useAuth, useLogout } from "@/hooks";
import { usePendingCount, useApprovals } from "@/hooks/use-approvals";

export default function AdminNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: recentApprovals } = useApprovals({ is_active: 2, limit: 5 });
  const isWebsiteBuilder = pathname?.includes('website-builder') || pathname?.includes('website-preview');

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (fullName?: string) => {
    if (!fullName) return "AD";
    const parts = fullName.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts[parts.length - 1]?.[0] || "";
    return (first + last).toUpperCase() || "AD";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="flex h-14 items-center gap-3 px-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="h-5" />

        {/* Breadcrumb */}
        <div className="min-w-0 flex-1"><Breadcrumb /></div>

        {/* Search — full bar on md+, icon-only on mobile */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="h-8 w-[220px] bg-muted/40 pl-8"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Language / currency / theme */}
          <TopHeader />
          {/* Website Preview Button (Prominent in header right corner) */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 gap-1.5 px-3 text-xs"
          >
            <Link href="/website-preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview Website</span>
            </Link>
          </Button>
          {/* Pending Approvals Bell — super_admin / developer only */}
          {((user?.role?.level ?? 0) >= 100 ||
            user?.role?.slug === "super_admin" ||
            user?.role?.slug === "developer") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-[18px] w-[18px]" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-[340px] max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Pending Approvals</span>
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{pendingCount}</Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentApprovals?.data && recentApprovals.data.length > 0 ? (
                  recentApprovals.data.map((approval) => (
                    <DropdownMenuItem key={approval.id} asChild>
                      <Link href="/admin/approvals" className="flex items-start gap-3 py-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium text-sm truncate">
                            {approval.requester?.full_name} - {approval.action}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {approval.module_slug.replace("_", " ")} &middot; {approval.resource_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(approval.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">No pending approvals</div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/approvals" className="text-center justify-center text-primary font-medium">
                    View all approvals
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative ml-1 h-9 gap-2 rounded-lg px-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} alt="User" />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 flex-col items-start leading-tight lg:flex">
                  <span className="max-w-[140px] truncate text-[13px] font-semibold text-foreground">{user?.full_name}</span>
                  <span className="max-w-[140px] truncate text-[11px] font-normal text-muted-foreground">{user?.role?.name || user?.email}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-gray-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                    A
                  </div>
                  <div className="flex flex-col space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
