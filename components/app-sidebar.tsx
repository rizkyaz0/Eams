"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, FileText, Users, Settings, Wrench, Building2, QrCode, Activity, BarChart3, ClipboardCheck, PackageX, ArrowLeftRight } from "lucide-react";

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

  type NavItem = {
    title: string;
    url: string;
    icon: any;
    isActive: boolean;
    roles: string[];
  };

  type NavGroupDef = {
    label?: string;
    items: NavItem[];
  };

  const navGroups: NavGroupDef[] = [
    {
      // Dashboard stands alone at top — no group label
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
          isActive: pathname === "/dashboard",
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI", "EMPLOYEE"],
        },
      ],
    },
    {
      label: "Aset",
      items: [
        {
          title: "Aset",
          url: "/assets",
          icon: Package,
          isActive: pathname?.startsWith("/assets") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
        {
          title: "BAST",
          url: "/bast",
          icon: FileText,
          isActive: pathname?.startsWith("/bast") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "EMPLOYEE"],
        },
        {
          title: "Peminjaman",
          url: "/asset-loans",
          icon: ArrowLeftRight,
          isActive: pathname?.startsWith("/asset-loans") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
        {
          title: "Barang Rusak",
          url: "/damage-reports",
          icon: PackageX,
          isActive: pathname?.startsWith("/damage-reports") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
      ],
    },
    {
      label: "Pemeliharaan",
      items: [
        {
          title: "Pemeliharaan",
          url: "/maintenance",
          icon: Wrench,
          isActive: pathname?.startsWith("/maintenance") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI"],
        },
        {
          title: "Stock Opname",
          url: "/stock-opname",
          icon: ClipboardCheck,
          isActive: pathname?.startsWith("/stock-opname") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
      ],
    },
    {
      label: "Master Data",
      items: [
        {
          title: "Kategori",
          url: "/categories",
          icon: Package,
          isActive: pathname?.startsWith("/categories") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
        {
          title: "Lokasi",
          url: "/locations",
          icon: Building2,
          isActive: pathname?.startsWith("/locations") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
        {
          title: "Divisi",
          url: "/divisions",
          icon: Building2,
          isActive: pathname?.startsWith("/divisions") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
        {
          title: "Pengguna",
          url: "/users",
          icon: Users,
          isActive: pathname?.startsWith("/users") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI"],
        },
      ],
    },
    {
      label: "Laporan",
      items: [
        {
          title: "Riwayat",
          url: "/history",
          icon: Activity,
          isActive: pathname?.startsWith("/history") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET", "TEKNISI"],
        },
        {
          title: "Laporan",
          url: "/reports",
          icon: BarChart3,
          isActive: pathname?.startsWith("/reports") || false,
          roles: ["SUPER_ADMIN", "ADMIN_INSTANSI", "STAFF_ASSET"],
        },
      ],
    },
  ];

  // Filter items by role within each group; drop empty groups
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || !userRole || item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0);

  const navSecondary = [
    {
      title: "Pengaturan",
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
                <span>Scan QR Aset</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain groups={filteredGroups} />
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