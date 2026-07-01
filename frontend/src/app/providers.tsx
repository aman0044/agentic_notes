"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useUIStore } from "@/lib/store";

function ThemeSync() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } })
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      {children}
    </QueryClientProvider>
  );
}
