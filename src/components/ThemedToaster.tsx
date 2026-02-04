"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return <Toaster richColors position="top-center" theme={resolvedTheme} />;
}
