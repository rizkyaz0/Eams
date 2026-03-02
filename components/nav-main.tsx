import Link from "next/link";
import { IconCirclePlusFilled, IconPlus, IconPackage, IconFileText, IconUserPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: any;
    isActive?: boolean;
  }[];
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
                  <span>Quick Create</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/assets?create=true" className="cursor-pointer">
                    <IconPackage className="mr-2 size-4 text-muted-foreground" />
                    <span>New Asset</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bast?create=true" className="cursor-pointer">
                    <IconFileText className="mr-2 size-4 text-muted-foreground" />
                    <span>New BAST</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/users?create=true" className="cursor-pointer">
                    <IconUserPlus className="mr-2 size-4 text-muted-foreground" />
                    <span>New User</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
