"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note, NoteCreate, NoteUpdate } from "@/types";
import {
  Save, Eye, Code2, X, Plus, Sparkles, Pin, PinOff, Loader2, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TextareaAutosize from "react-textarea-autosize";

interface Props {
  note?: Note;
  defaultCategoryId?: number;
}

type ViewMode = "edit" | "preview" | "split";

export function NoteEditor({ note, defaultCategoryId }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(note?.category_id ?? defaultCategoryId);
  const [isPinned, setIsPinned] = useState(note?.is_pinned ?? false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [saved, setSaved] = useState(false);

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.categories.list });

  const createMut = useMutation({
    mutationFn: (data: NoteCreate) => api.notes.create(data),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      router.push(`/notes/${n.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: NoteUpdate) => api.notes.update(note!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", note?.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const enrichMut = useMutation({
    mutationFn: () => api.notes.enrich(note!.id),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["note", note?.id] });
      setTags(n.tags);
    },
  });

  function handleSave() {
    if (!title.trim()) return;
    if (note) {
      updateMut.mutate({ title, content, tags, category_id: categoryId, is_pinned: isPinned });
    } else {
      createMut.mutate({ title, content, tags, category_id: categoryId, is_pinned: isPinned });
    }
  }

  function addTag(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!tags.includes(t)) setTags([...tags, t]);
      setTagInput("");
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border flex-shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 ml-2 bg-muted/60 rounded-lg p-0.5">
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs transition-colors capitalize",
                viewMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "edit" ? <><Code2 className="w-3 h-3 inline mr-1" />Edit</> :
               m === "preview" ? <><Eye className="w-3 h-3 inline mr-1" />Preview</> :
               "Split"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {note && (
            <Button
              variant="ghost" size="icon-sm"
              onClick={() => enrichMut.mutate()}
              disabled={enrichMut.isPending}
              title="AI enrich: generate summary and tags"
            >
              {enrichMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="ghost" size="icon-sm"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Unpin" : "Pin"}
            className={isPinned ? "text-amber-500" : ""}
          >
            {isPinned ? <Pin className="w-4 h-4" fill="currentColor" /> : <PinOff className="w-4 h-4" />}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || isPending}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border flex-shrink-0">
        <select
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">No category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              #{t}
              <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder="Add tag..."
            className="text-xs bg-transparent outline-none text-muted-foreground placeholder:text-muted-foreground/50 w-24"
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-5 pb-2 flex-shrink-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40"
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        />
      </div>

      {/* Content */}
      <div className={cn("flex-1 overflow-hidden", viewMode === "split" ? "flex gap-0" : "")}>
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={cn("h-full overflow-y-auto", viewMode === "split" ? "flex-1 border-r border-border" : "")}>
            <TextareaAutosize
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing in markdown..."
              className="w-full min-h-full px-6 py-3 bg-transparent outline-none text-sm font-mono leading-relaxed placeholder:text-muted-foreground/40 resize-none"
              minRows={20}
            />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={cn("h-full overflow-y-auto px-6 py-3", viewMode === "split" ? "flex-1" : "")}>
            <div className="prose-notes">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*No content*"}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
