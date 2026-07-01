import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutMode, ChatMessage } from "@/types";

interface UIStore {
  layout: LayoutMode;
  setLayout: (l: LayoutMode) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      layout: "sidebar",
      setLayout: (layout) => set({ layout }),
      theme: "dark",
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          document.documentElement.classList.toggle("dark", next === "dark");
          return { theme: next };
        }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: "agentic-notes-ui" }
  )
);

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (m: ChatMessage) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  clearMessages: () => set({ messages: [] }),
}));
