
"use client";

import type React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Icon } from '@/components/icons';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
     // This case should ideally be caught by the useEffect,
     // but as a fallback, show loading or redirect immediately.
     // Returning null or a loading spinner here prevents rendering children if redirect is pending.
    return (
         <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
         </div>
    );
  }
  
  // If user is logged in OR if we are on the login page itself (though this layout shouldn't wrap /login)
  // or if still loading but no decision can be made yet.
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            <div className="w-full max-w-[1440px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
