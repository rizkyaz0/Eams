"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    const savedAccent = localStorage.getItem("app-accent");
    if (savedAccent && savedAccent !== "zinc") {
      document.documentElement.classList.add(`theme-${savedAccent}`);
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
