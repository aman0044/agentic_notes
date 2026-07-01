"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Globe, Loader2, Trash2, RefreshCw, ExternalLink, FileText, Link2,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function LinksPage() {
  const [url, setUrl] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const qc = useQueryClient();

  const { data: links, isLoading } = useQuery({
    queryKey: ["links"],
    queryFn: api.links.list,
  });

  const addMut = useMutation({
    mutationFn: (u: string) => api.links.add(u),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["links"] });
      setUrl("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => {
      setDeletingIds((prev) => new Set([...prev, id]));
      return api.links.delete(id);
    },
    onSettled: (_, __, id) => {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      qc.invalidateQueries({ queryKey: ["links"] });
    },
  });

  const reprocessMut = useMutation({
    mutationFn: (id: number) => api.links.reprocess(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    addMut.mutate(url.trim());
  }

  return (
    <AppShell title="Links">
      <div className="p-6 max-w-4xl space-y-6">
        {/* Add URL */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a URL to save and summarize..."
              className="pl-9"
              type="url"
            />
          </div>
          <Button type="submit" disabled={!url.trim() || addMut.isPending}>
            {addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save Link
          </Button>
        </form>

        {/* Links list */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading...</span>
          </div>
        ) : !links?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No links saved yet</p>
            <p className="text-xs mt-1">Paste a URL above to save and summarize it automatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {links.map((link, i) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {link.favicon ? (
                      <img
                        src={link.favicon}
                        alt=""
                        className="w-6 h-6 rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Globe className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {link.title || link.url}
                        </p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors truncate block"
                        >
                          {link.url}
                        </a>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(link.created_at)}</span>
                    </div>

                    {link.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {link.summary}
                      </p>
                    )}

                    {!link.scraped_at && (
                      <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                      </p>
                    )}

                    {link.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {link.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon-sm" title="Open link">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    {link.note_id && (
                      <a href={`/notes/${link.note_id}`}>
                        <Button variant="ghost" size="icon-sm" title="View note">
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => reprocessMut.mutate(link.id)}
                      disabled={reprocessMut.isPending}
                      title="Re-process"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => { if (!deletingIds.has(link.id)) deleteMut.mutate(link.id); }}
                      disabled={deletingIds.has(link.id)}
                      title="Delete"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}
