export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  description?: string;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  slug: string;
  tags: string[];
  category_id?: number;
  summary?: string;
  is_pinned: boolean;
  source_url?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  title: string;
  content?: string;
  category_id?: number;
  tags?: string[];
  is_pinned?: boolean;
  source_url?: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  category_id?: number;
  tags?: string[];
  is_pinned?: boolean;
}

export interface Link {
  id: number;
  url: string;
  title?: string;
  summary?: string;
  favicon?: string;
  tags: string[];
  note_id?: number;
  scraped_at?: string;
  created_at: string;
}

export interface GraphNode {
  id: number;
  label: string;
  name: string;
  note_id?: number;
}

export interface GraphLink {
  source: number;
  target: number;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AppSettings {
  ai_provider: string;
  ollama_base_url: string;
  ollama_model: string;
  claude_model: string;
  gemini_model: string;
  has_anthropic_key: boolean;
  has_google_key: boolean;
  has_telegram_token: boolean;
  neo4j_uri: string;
  neo4j_user: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export type LayoutMode = "sidebar" | "topnav" | "compact" | "focus";

export interface NodeContextNote {
  id: number;
  title: string;
  summary?: string;
  tags: string[];
  source_url?: string;
  link_url?: string;
  link_favicon?: string;
  updated_at: string;
}

export interface NodeContext {
  entity: { label: string; name: string };
  notes: NodeContextNote[];
  relations?: { type: string; name: string; label: string }[];
}
