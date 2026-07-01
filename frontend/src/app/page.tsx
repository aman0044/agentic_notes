"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { NoteCard } from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Plus, FileText, Globe, Network, TrendingUp, Pin, Clock, Loader2,
} from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.notes.list({ limit: 20 }),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });
  const { data: links } = useQuery({
    queryKey: ["links"],
    queryFn: api.links.list,
  });

  const catMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c]));
  const pinned = (notes ?? []).filter((n) => n.is_pinned);
  const recent = (notes ?? []).slice(0, 6);

  const catCounts: Record<number, number> = {};
  (notes ?? []).forEach((n) => {
    if (n.category_id) catCounts[n.category_id] = (catCounts[n.category_id] || 0) + 1;
  });

  const stats = [
    { label: "Total Notes", value: notes?.length ?? 0, icon: FileText, color: "#6366f1" },
    { label: "Links Saved", value: links?.length ?? 0, icon: Globe, color: "#0ea5e9" },
    { label: "Categories", value: categories?.length ?? 0, icon: Network, color: "#8b5cf6" },
    { label: "Pinned", value: pinned.length, icon: Pin, color: "#f59e0b" },
  ];

  return (
    <AppShell
      title="Dashboard"
      actions={
        <Button asChild size="sm">
          <Link href="/notes/new"><Plus className="w-3.5 h-3.5" />New Note</Link>
        </Button>
      }
    >
      <div className="p-6 space-y-8 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Categories</h2>
              <Link href="/notes" className="text-xs text-muted-foreground hover:text-primary transition-colors">View all</Link>
            </div>
            <div className="space-y-1.5">
              {(categories ?? []).map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/notes?category=${cat.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors group">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm flex-1 group-hover:text-primary transition-colors">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">{catCounts[cat.id] ?? 0}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pinned */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-amber-500" />Pinned Notes
            </h2>
            {pinned.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No pinned notes yet. Pin important notes for quick access.</p>
            ) : (
              <div className="space-y-2">
                {pinned.slice(0, 4).map((n, i) => (
                  <NoteCard key={n.id} note={n} category={catMap[n.category_id!]} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />Recent Links
              </h2>
              <Link href="/links" className="text-xs text-muted-foreground hover:text-primary transition-colors">View all</Link>
            </div>
            <div className="space-y-2">
              {(links ?? []).slice(0, 4).map((l, i) => (
                <motion.a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-all block"
                >
                  {l.favicon && (
                    <img src={l.favicon} alt="" className="w-4 h-4 rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{l.title || l.url}</p>
                    {l.summary && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{l.summary}</p>}
                  </div>
                </motion.a>
              ))}
              {!links?.length && (
                <p className="text-xs text-muted-foreground p-3">No links saved yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Notes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Notes</h2>
            <Link href="/notes" className="text-sm text-muted-foreground hover:text-primary transition-colors">View all →</Link>
          </div>
          {notesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading notes...</span>
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs mt-1">Create your first note to get started</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/notes/new"><Plus className="w-3.5 h-3.5" />Create Note</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent.map((n, i) => (
                <NoteCard key={n.id} note={n} category={catMap[n.category_id!]} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
