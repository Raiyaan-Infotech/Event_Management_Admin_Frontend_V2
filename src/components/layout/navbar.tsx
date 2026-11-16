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
import { useMailNotifications, useMarkNotificationsRead } from "@/hooks/use-admin-mail";

export default function AdminNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const { data: pendingCount = 0 } = usePendingCount();
  const { data: recentApprovals } = useApprovals({ is_active: 2, limit: 5 });
  const { data: notifData } = useMailNotifications();
  const markNotifRead = useMarkNotificationsRead();
  const mailUnread = notifData?.unread_count ?? 0;
  const mailNotifs = notifData?.notifications ?? [];

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
            {/* Mail Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Mail className="h-[18px] w-[18px]" />
                {mailUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-medium">
                    {mailUnread > 99 ? "99+" : mailUnread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px] p-0 border-border rounded-2xl shadow-xl mt-2 overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-sm">
                  Mail {mailUnread > 0 && <span className="ml-1.5 text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 font-black">{mailUnread}</span>}
                </h3>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/5 font-bold"
                  onClick={() => markNotifRead.mutate()}>
                  <CheckCheck className="size-3 mr-1" /> Mark all read
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  {mailNotifs.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">No notifications</div>
                  ) : mailNotifs.map((notif) => (
                    <Link key={notif.id} href={`/admin/mail?mailId=${notif.mail_id}`}
                      className="flex gap-3 p-3 rounded-lg hover:bg-muted transition-all group">
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                        <Mail className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[12px] font-bold text-foreground group-hover:text-primary transition-colors ${notif.is_read ? "opacity-70" : ""}`}>New Mail</span>
                            {!notif.is_read && <span className="size-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                            {notif.mail?.sent_at ? new Date(notif.mail.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className={`text-[11px] text-muted-foreground truncate ${notif.is_read ? "opacity-60" : ""}`}>
                          {notif.mail?.subject || 'No subject'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 text-center border-t border-border bg-card">
                <Link href="/admin/notifications">
                  <Button variant="link" className="text-xs text-primary font-bold h-auto p-0">View All Notifications</Button>
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

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
