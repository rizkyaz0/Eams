"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Palette, Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const toggleMode = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    window.dispatchEvent(new CustomEvent("theme-transition-start", { detail: nextTheme }));
  };

  const changeAccent = (color: string) => {
    const root = document.documentElement;
    root.classList.remove("theme-zinc", "theme-blue", "theme-green", "theme-orange");
    if (color !== "zinc") {
      root.classList.add(`theme-${color}`);
    }
    localStorage.setItem("app-accent", color);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleMode} className="flex justify-between items-center cursor-pointer">
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          {theme === "dark" ? <Sun className="h-4 w-4 ml-2" /> : <Moon className="h-4 w-4 ml-2" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        <div className="flex gap-2 p-2">
          <button
            onClick={() => changeAccent("zinc")}
            className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 border shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Default Zinc"
          />
          <button
            onClick={() => changeAccent("blue")}
            className="w-6 h-6 rounded-full bg-blue-600 border shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Blue"
          />
          <button
            onClick={() => changeAccent("green")}
            className="w-6 h-6 rounded-full bg-green-600 border shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Green"
          />
          <button
            onClick={() => changeAccent("orange")}
            className="w-6 h-6 rounded-full bg-orange-500 border shadow-sm ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Orange"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
