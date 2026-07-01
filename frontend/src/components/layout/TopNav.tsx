"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Brain, LayoutDashboard, FileText, Globe, Network, MessageSquare, Settings } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/links", label: "Links", icon: Globe },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6 gap-6 flex-shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">Agentic Notes</span>
      </div>
      <nav className="flex items-center gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
