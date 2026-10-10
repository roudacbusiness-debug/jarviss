"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Tooltip } from "radix-ui";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: "!bg-surface !text-fg !border-border !shadow-lg !rounded-xl",
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
