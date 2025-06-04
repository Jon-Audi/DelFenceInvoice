
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Icon, type IconName } from "@/components/icons";
import { NAV_ITEMS, MATERIAL_CALCULATOR_LINK } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Icon name="PanelsTopLeft" className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden font-headline">
            Delaware Fence Solutions
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <Icon name={item.icon as IconName} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarSeparator />
           <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={MATERIAL_CALCULATOR_LINK.label}
              >
                <a href={MATERIAL_CALCULATOR_LINK.href} target="_blank" rel="noopener noreferrer">
                  <Icon name={MATERIAL_CALCULATOR_LINK.icon as IconName} />
                  <span>{MATERIAL_CALCULATOR_LINK.label}</span>
                  <Icon name="ExternalLink" className="ml-auto h-3 w-3 opacity-70 group-data-[collapsible=icon]:hidden" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenuButton asChild tooltip="Settings">
          <Link href="/settings">
            <Icon name="Settings" />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
