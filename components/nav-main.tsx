import Link from "next/link";
import { IconCirclePlusFilled, IconPlus, IconPackage, IconFileText, IconUserPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon?: any;
  isActive?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function NavMain({
  groups,
}: {
  groups: NavGroup[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="bg-primary text-primary-foreground hover:bg-primary/50 relative hover:text-primary-foreground active:bg-primary/9 active:text-primary-foreground duration-200 ease-linear">
                  <IconCirclePlusFilled />
                  <span>Buat Cepat</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/assets?create=true" className="cursor-pointer">
                    <IconPackage className="mr-2 size-4 text-muted-foreground" />
                    <span>Aset Baru</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bast?create=true" className="cursor-pointer">
                    <IconFileText className="mr-2 size-4 text-muted-foreground" />
                    <span>BAST Baru</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/users?create=true" className="cursor-pointer">
                    <IconUserPlus className="mr-2 size-4 text-muted-foreground" />
                    <span>Pengguna Baru</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        {groups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {group.label && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} asChild isActive={item.isActive} className={cn(item.isActive && "bg-accent text-accent-foreground font-medium")}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}