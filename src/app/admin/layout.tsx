"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import AdminNavbar from "@/components/layout/navbar";
import AdminFooter from "@/components/layout/footer";
import { AppearanceProvider } from "@/components/providers/appearance-provider";
import { DynamicHead } from "@/components/providers/dynamic-head";
import { CompanyProvider } from "@/contexts/company-context";
import { useAuth } from "@/hooks/use-auth";

import { NavigationLoaderProvider } from "@/components/common/navigation-loader-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
    
    // Clear auth_pending flag once authenticated
    if (!isLoading && isAuthenticated) {
      if (typeof document !== 'undefined') {
        // Clear the temporary auth_pending cookie
        document.cookie = 'auth_pending=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax';
      }
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppearanceProvider>
      <DynamicHead />
      <CompanyProvider>
        <NavigationLoaderProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
              {/* Sidebar */}
              <AppSidebar />

              {/* Main Content */}
              <SidebarInset className="flex flex-col flex-1 min-w-0">
                {/* Navbar */}
                <AdminNavbar />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="p-3 sm:p-4 md:p-5">
                    {children}
                  </div>
                </main>

                {/* Footer */}
                <AdminFooter />
              </SidebarInset>
            </div>
          </SidebarProvider>
        </NavigationLoaderProvider>
      </CompanyProvider>
    </AppearanceProvider>
  );
}
