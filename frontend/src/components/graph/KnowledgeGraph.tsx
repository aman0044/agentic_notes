"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { NODE_COLORS, timeAgo, cn } from "@/lib/utils";
import {
  Loader2, Network, ZoomIn, ZoomOut, RotateCcw, X, ExternalLink,
  FileText, Globe, Tag, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GraphNode, NodeContext } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const LABEL_ICONS: Record<string, React.ElementType> = {
  Note: FileText,
  Tag: Tag,
  Concept: Network,
  Person: Network,
  Organization: Globe,
  Place: Globe,
};

function NodePanel({
  context,
  onClose,
}: {
  context: NodeContext;
  onClose: () => void;
}) {
  const { entity, notes, relations } = context;
  const color = NODE_COLORS[entity.label] || "#6b7280";
  const Icon = LABEL_ICONS[entity.label] || Network;

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="absolute top-0 right-0 bottom-0 w-80 bg-card border-l border-border flex flex-col z-10 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-border flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
            {entity.label}
          </p>
          <p className="font-semibold text-sm leading-snug mt-0.5">{entity.name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Relations (for Note nodes) */}
      {relations && relations.length > 0 && (
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Entities in this note
          </p>
          <div className="flex flex-wrap gap-1">
            {relations.filter((r) => r.name).slice(0, 12).map((r, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${NODE_COLORS[r.label] || "#6b7280"}15`,
                  color: NODE_COLORS[r.label] || "#6b7280",
                }}
              >
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Referenced notes */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Network className="w-6 h-6 opacity-30" />
            <p className="text-xs">No notes reference this entity yet</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Referenced in {notes.length} note{notes.length !== 1 ? "s" : ""}
            </p>
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg border border-border bg-background/60 hover:border-primary/30 transition-colors"
              >
                {/* Source link favicon + URL */}
                {(note.link_url || note.source_url) && (
                  <div className="flex items-center gap-1.5 mb-2">
                    {note.link_favicon && (
                      <img
                        src={note.link_favicon}
                        alt=""
                        className="w-3.5 h-3.5 rounded flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <a
                      href={note.link_url || note.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline truncate flex items-center gap-0.5"
                    >
                      {new URL(note.link_url || note.source_url || "").hostname}
                      <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                    </a>
                  </div>
                )}

                <a href={`/notes/${note.id}`} className="block group">
                  <p className="font-medium text-xs leading-snug group-hover:text-primary transition-colors mb-1">
                    {note.title}
                  </p>
                  {note.summary && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {note.summary}
                    </p>
                  )}
                </a>

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[9px] px-1 py-0.5 bg-muted rounded text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-muted-foreground">{timeAgo(note.updated_at)}</span>
                  <a
                    href={`/notes/${note.id}`}
                    className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Open <ArrowRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function KnowledgeGraph() {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeContext, setNodeContext] = useState<NodeContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["graph"],
    queryFn: api.graph.get,
  });

  const handleNodeClick = useCallback(async (node: any) => {
    setSelectedNode(node);
    setNodeContext(null);
    setLoadingContext(true);
    try {
      const ctx = await api.graph.nodeContext(
        node.label,
        node.name || "",
        node.label === "Note" ? node.note_id : undefined,
      );
      setNodeContext(ctx);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  function handleZoomIn() { graphRef.current?.zoom(1.5, 400); }
  function handleZoomOut() { graphRef.current?.zoom(0.7, 400); }
  function handleReset() { graphRef.current?.zoomToFit(400, 40); }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading knowledge graph...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Network className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Graph unavailable</p>
        <p className="text-xs max-w-xs text-center">
          Start Neo4j with <code className="bg-muted px-1 rounded">docker compose up</code>, configure credentials in Settings, then click Rebuild Graph.
        </p>
      </div>
    );
  }

  if (!data.nodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Network className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Graph is empty</p>
        <p className="text-xs text-center max-w-xs">
          Create notes and click <strong>Rebuild Graph</strong> to extract entities and build the knowledge graph.
        </p>
      </div>
    );
  }

  const graphData = {
    nodes: data.nodes.map((n) => ({
      ...n,
      color: NODE_COLORS[n.label] || "#6b7280",
      val: n.label === "Note" ? 3 : n.label === "Concept" ? 2 : 1,
    })),
    links: data.links.map((l) => ({
      ...l,
      color: l.type === "RELATED_TO" ? "rgba(99,102,241,0.4)" : "rgba(148,163,184,0.2)",
      width: l.type === "RELATED_TO" ? 2 : 1,
    })),
  };

  const panelOpen = selectedNode !== null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5" style={{ right: panelOpen ? "332px" : "16px", transition: "right 0.3s" }}>
        <Button variant="outline" size="icon-sm" onClick={handleZoomIn}><ZoomIn className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="icon-sm" onClick={handleZoomOut}><ZoomOut className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="icon-sm" onClick={handleReset}><RotateCcw className="w-3.5 h-3.5" /></Button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 max-w-xs">
        {Object.entries(NODE_COLORS).map(([label, color]) => (
          <span
            key={label}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
            style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Loading context indicator */}
      {loadingContext && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-card border border-border rounded-full px-3 py-1.5 flex items-center gap-2 shadow-md text-xs">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          Loading context...
        </div>
      )}

      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={(n: any) => `${n.label}: ${n.name || n.title || ""}`}
        nodeColor={(n: any) => n.color}
        nodeRelSize={5}
        nodeVal={(n: any) => n.val}
        linkColor={(l: any) => l.color}
        linkWidth={(l: any) => l.width}
        linkDirectionalArrowLength={(l: any) => l.type === "RELATED_TO" ? 0 : 4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => { setSelectedNode(null); setNodeContext(null); }}
        backgroundColor="transparent"
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const isSelected = selectedNode?.id === node.id;
          const r = (node.val || 1) * 4 + (isSelected ? 2 : 0);

          // Glow for selected
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
            ctx.fillStyle = `${node.color}30`;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = node.color;
          ctx.fill();

          if (isSelected) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5 / globalScale;
            ctx.stroke();
          }

          const label = (node.name || node.title || "").slice(0, 22);
          if (globalScale > 0.6 && label) {
            const fontSize = Math.max(9 / globalScale, 2.5);
            ctx.font = `${isSelected ? "bold " : ""}${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.65)";
            ctx.textAlign = "center";
            ctx.fillText(label, node.x, node.y + r + fontSize + 1);
          }
        }}
      />

      {/* Side panel */}
      <AnimatePresence>
        {panelOpen && nodeContext && (
          <NodePanel
            context={nodeContext}
            onClose={() => { setSelectedNode(null); setNodeContext(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
