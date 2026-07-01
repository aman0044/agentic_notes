"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { KnowledgeGraph } from "@/components/graph/KnowledgeGraph";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GraphPage() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["graph-status"],
    queryFn: api.graph.status,
    refetchInterval: 10000,
  });

  const rebuildMut = useMutation({
    mutationFn: api.graph.rebuild,
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["graph"] });
        qc.invalidateQueries({ queryKey: ["graph-status"] });
      }, 3000);
    },
  });

  useQuery({
    queryKey: ["graph-search", search],
    queryFn: () => api.graph.search(search),
    enabled: search.length >= 2,
  });

  return (
    <AppShell
      title="Knowledge Graph"
      actions={
        <div className="flex items-center gap-2">
          {/* Connection status chip */}
          {status && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
              status.connected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            )}>
              {status.connected
                ? <CheckCircle2 className="w-3 h-3" />
                : <XCircle className="w-3 h-3" />}
              {status.connected
                ? `Neo4j · ${status.nodes} nodes · ${status.links} edges`
                : "Neo4j disconnected"}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => rebuildMut.mutate()}
            disabled={rebuildMut.isPending}
            title="Re-process all notes into the graph"
          >
            {rebuildMut.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {rebuildMut.isSuccess ? "Rebuilding…" : "Rebuild Graph"}
          </Button>

          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search graph…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      }
    >
      <div className="h-full relative overflow-hidden">
        {!status?.connected && (
          <div className="absolute inset-x-0 top-0 z-20 bg-destructive/10 border-b border-destructive/20 px-6 py-2 text-xs text-destructive flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Neo4j is not connected. Go to <strong>Settings → Neo4j</strong>, enter your credentials and click <strong>Test</strong> then <strong>Save</strong>.
          </div>
        )}
        <KnowledgeGraph />
      </div>
    </AppShell>
  );
}
