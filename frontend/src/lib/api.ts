import type {
  Category, Note, NoteCreate, NoteUpdate,
  Link, GraphData, AppSettings, ChatMessage,
} from "@/types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

// Categories
export const api = {
  categories: {
    list: () => req<Category[]>("/categories"),
    create: (data: { name: string; color: string; icon: string }) =>
      req<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/categories/${id}`, { method: "DELETE" }),
  },

  notes: {
    list: (params?: {
      category_id?: number;
      tag?: string;
      search?: string;
      pinned?: boolean;
      limit?: number;
      offset?: number;
    }) => {
      const p = new URLSearchParams();
      if (params?.category_id != null) p.set("category_id", String(params.category_id));
      if (params?.tag) p.set("tag", params.tag);
      if (params?.search) p.set("search", params.search);
      if (params?.pinned != null) p.set("pinned", String(params.pinned));
      if (params?.limit) p.set("limit", String(params.limit));
      if (params?.offset) p.set("offset", String(params.offset));
      return req<Note[]>(`/notes/?${p}`);
    },
    get: (id: number) => req<Note>(`/notes/${id}`),
    create: (data: NoteCreate) =>
      req<Note>("/notes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: NoteUpdate) =>
      req<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => req<void>(`/notes/${id}`, { method: "DELETE" }),
    enrich: (id: number) =>
      req<Note>(`/notes/${id}/enrich`, { method: "POST" }),
  },

  links: {
    list: () => req<Link[]>("/links"),
    add: (url: string) =>
      req<Link>("/links", { method: "POST", body: JSON.stringify({ url }) }),
    delete: (id: number) => req<void>(`/links/${id}`, { method: "DELETE" }),
    reprocess: (id: number) =>
      req<Link>(`/links/${id}/reprocess`, { method: "POST" }),
  },

  graph: {
    get: () => req<GraphData>("/graph"),
    search: (q: string) => req<unknown[]>(`/graph/search?q=${encodeURIComponent(q)}`),
    status: () => req<{ connected: boolean; nodes?: number; links?: number; message?: string }>("/graph/status"),
    rebuild: () => req<{ status: string; notes_count: number }>("/graph/rebuild", { method: "POST" }),
    nodeContext: (label: string, name: string, note_id?: number) => {
      const p = new URLSearchParams({ label, name });
      if (note_id != null) p.set("note_id", String(note_id));
      return req<NodeContext>(`/graph/node-context?${p}`);
    },
  },

  chat: {
    ask: (question: string) =>
      req<{ answer: string }>("/chat/ask", {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
    chat: (messages: ChatMessage[], note_ids?: number[]) =>
      req<{ answer: string; notes_used: number }>("/chat", {
        method: "POST",
        body: JSON.stringify({ messages, note_ids }),
      }),
  },

  settings: {
    get: () => req<AppSettings>("/settings"),
    update: (data: Partial<AppSettings> & { anthropic_api_key?: string; google_api_key?: string; telegram_bot_token?: string; neo4j_password?: string }) =>
      req<{ status: string }>("/settings", { method: "PATCH", body: JSON.stringify(data) }),
    ollamaModels: () =>
      req<{ models: string[]; error?: string }>("/settings/ollama/models"),
    testNeo4j: (uri: string, user: string, password: string) =>
      req<{ ok: boolean; message: string }>("/settings/neo4j/test", {
        method: "POST",
        body: JSON.stringify({ uri, user, password }),
      }),
  },
};
