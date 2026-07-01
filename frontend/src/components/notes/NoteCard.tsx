"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Note, Category } from "@/types";
import { Pin, FileText } from "lucide-react";

interface Props {
  note: Note;
  category?: Category;
  index?: number;
}

export function NoteCard({ note, category, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <Link href={`/notes/${note.id}`} className="block group">
        <div
          className={cn(
            "p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md",
            "transition-all duration-200 group-hover:bg-card/80"
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {note.is_pinned && (
                <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" />
              )}
              <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {note.title}
              </h3>
            </div>
            {category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                {category.name}
              </span>
            )}
          </div>

          {note.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {note.summary}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5">
                  #{tag}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {timeAgo(note.updated_at)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
