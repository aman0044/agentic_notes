"use client";
import { useUIStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { LayoutSwitcher } from "./LayoutSwitcher";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, actions }: Props) {
  const layout = useUIStore((s) => s.layout);

  if (layout === "topnav") {
    return (
      <div className="flex flex-col h-screen">
        <TopNav />
        <div className="flex-1 overflow-hidden">
          <PageContainer title={title} actions={actions} scrollable>
            {children}
          </PageContainer>
        </div>
      </div>
    );
  }

  if (layout === "focus") {
    return (
      <div className="h-screen overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {(title || actions) && (
            <div className="flex items-center justify-between mb-6">
              {title && <h1 className="text-2xl font-bold">{title}</h1>}
              <div className="flex items-center gap-2">
                {actions}
                <LayoutSwitcher />
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  // sidebar + compact both use sidebar, compact just collapses it
  return (
    <div className="flex h-screen overflow-hidden">
      {(layout === "sidebar" || layout === "compact") && <Sidebar />}
      <main className="flex-1 overflow-hidden flex flex-col">
        <PageContainer title={title} actions={actions} scrollable>
          {children}
        </PageContainer>
      </main>
    </div>
  );
}

function PageContainer({
  children,
  title,
  actions,
  scrollable,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div className={cn("flex flex-col h-full", scrollable && "overflow-hidden")}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          {title && <h1 className="text-xl font-semibold">{title}</h1>}
          <div className="flex items-center gap-2 ml-auto">
            {actions}
            <LayoutSwitcher />
          </div>
        </div>
      )}
      <div className={cn("flex-1", scrollable && "overflow-y-auto")}>
        {children}
      </div>
    </div>
  );
}
