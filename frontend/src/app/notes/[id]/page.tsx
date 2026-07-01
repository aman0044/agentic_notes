"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", Number(id)],
    queryFn: () => api.notes.get(Number(id)),
    enabled: !!id,
  });

  const [deleteClicked, setDeleteClicked] = useState(false);
  const deleteMut = useMutation({
    mutationFn: () => {
      setDeleteClicked(true);
      return api.notes.delete(Number(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      router.push("/notes");
    },
    onError: () => setDeleteClicked(false),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!note) {
    return (
      <AppShell title="Not Found">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Note not found.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      actions={
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { if (!deleteClicked && confirm("Delete this note?")) deleteMut.mutate(); }}
          disabled={deleteClicked}
        >
          {deleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </Button>
      }
    >
      <div className="h-full overflow-hidden">
        <NoteEditor note={note} />
      </div>
    </AppShell>
  );
}
