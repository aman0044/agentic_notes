"use client";
import { AppShell } from "@/components/layout/AppShell";
import { NoteEditor } from "@/components/notes/NoteEditor";

export default function NewNotePage() {
  return (
    <AppShell>
      <div className="h-full">
        <NoteEditor />
      </div>
    </AppShell>
  );
}
