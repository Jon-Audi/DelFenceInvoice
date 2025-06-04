
import type React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            <div className="w-full max-w-screen-xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
