"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assets": "Aset",
  "/bast": "BAST",
  "/maintenance": "Pemeliharaan",
  "/categories": "Kategori",
  "/locations": "Lokasi",
  "/divisions": "Divisi",
  "/users": "Pengguna",
  "/reports": "Laporan",
  "/history": "Riwayat",
  "/asset-loans": "Peminjaman",
  "/damage-reports": "Barang Rusak",
  "/stock-opname": "Stock Opname",
  "/room-usage": "Penggunaan Ruangan",
  "/room-reports": "Laporan Kondisi Ruangan",
};

export function SiteHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || pageTitles[`/${pathname.split("/")[1]}`] || "EAMS";

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) print:hidden">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <h1 className="text-base font-medium">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
