"use client";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LayoutMode } from "@/types";
import { PanelLeft, LayoutTemplate, AlignJustify, Maximize2, Moon, Sun } from "lucide-react";

const LAYOUTS: { mode: LayoutMode; icon: React.ElementType; label: string }[] = [
  { mode: "sidebar", icon: PanelLeft, label: "Sidebar" },
  { mode: "topnav", icon: LayoutTemplate, label: "Top Nav" },
  { mode: "compact", icon: AlignJustify, label: "Compact" },
  { mode: "focus", icon: Maximize2, label: "Focus" },
];

export function LayoutSwitcher() {
  const { layout, setLayout, theme, toggleTheme } = useUIStore();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border">
      {LAYOUTS.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setLayout(mode)}
          title={label}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            layout === mode
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
      >
        {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
