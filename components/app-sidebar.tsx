"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, FileText, Users, Settings, Wrench, Building2, QrCode, Activity } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { cn } from "@/lib/utils";

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: any }) {
  const pathname = usePathname();
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const userRole = user?.role;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI", "EMPLOYEE"],
    },
    {
      title: "Assets",
      url: "/assets",
      icon: Package,
      isActive: pathname?.startsWith("/assets"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
    },
    {
      title: "BAST",
      url: "/bast",
      icon: FileText,
      isActive: pathname?.startsWith("/bast"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "EMPLOYEE"],
    },
    {
      title: "Maintenance",
      url: "/maintenance",
      icon: Wrench,
      isActive: pathname?.startsWith("/maintenance"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI"],
    },
    {
      title: "Categories",
      url: "/categories",
      icon: Package,
      isActive: pathname?.startsWith("/categories"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
    },
    {
      title: "Locations",
      url: "/locations",
      icon: Building2,
      isActive: pathname?.startsWith("/locations"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      isActive: pathname?.startsWith("/users"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI"],
    },
    {
      title: "Riwayat",
      url: "/history",
      icon: Activity,
      isActive: pathname?.startsWith("/history"),
      roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI"],
    },
  ];

  const filteredNavMain = navMain.filter((item) => !item.roles || !userRole || item.roles.includes(userRole));

  const navSecondary = [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: pathname?.startsWith("/settings"),
    },
  ];

  if (!mounted) {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader className="h-24" />
        <SidebarContent />
        <SidebarFooter className="h-16" />
      </Sidebar>
    );
  }

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props} className={cn("print:hidden", props.className)}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                <Link href="/dashboard">
                  <Building2 className="size-5!" />
                  <span className="text-base font-semibold">EAMS</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setScannerOpen(true)} className="mt-2 text-primary hover:text-primary">
                <QrCode className="size-5" />
                <span>Scan Asset QR</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={filteredNavMain} />
          <NavSecondary items={navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </>
  );
}
