"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { NoteCard } from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, SlidersHorizontal, Loader2, FileText, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NotesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | undefined>(
    params.get("category") ? Number(params.get("category")) : undefined
  );
  const [activeTag, setActiveTag] = useState<string | undefined>();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.categories.list });
  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", { search, category_id: activeCat, tag: activeTag }],
    queryFn: () => api.notes.list({ search: search || undefined, category_id: activeCat, tag: activeTag }),
  });

  const catMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c]));

  const allTags = Array.from(new Set((notes ?? []).flatMap((n) => n.tags))).slice(0, 20);

  return (
    <AppShell
      title="Notes"
      actions={
        <Button asChild size="sm">
          <Link href="/notes/new"><Plus className="w-3.5 h-3.5" />New Note</Link>
        </Button>
      }
    >
      <div className="flex h-full overflow-hidden">
        {/* Sidebar filter */}
        <div className="w-48 border-r border-border p-4 flex-shrink-0 overflow-y-auto space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveCat(undefined)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors",
                  !activeCat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                All Notes
              </button>
              {(categories ?? []).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id === activeCat ? undefined : cat.id)}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    activeCat === cat.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? undefined : tag)}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md transition-colors",
                      activeTag === tag ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : !notes?.length ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No notes found</p>
                <Button asChild size="sm">
                  <Link href="/notes/new"><Plus className="w-3.5 h-3.5" />Create Note</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {notes.map((n, i) => (
                  <NoteCard key={n.id} note={n} category={catMap[n.category_id!]} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
