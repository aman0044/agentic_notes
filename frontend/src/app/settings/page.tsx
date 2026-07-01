"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Cpu, Key, Network, Bot, Save, Loader2, CheckCircle2, RefreshCw, Brain,
  Plug, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = "ollama" | "claude" | "gemini";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const { data: ollamaModels, refetch: refetchOllama } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: api.settings.ollamaModels,
    enabled: false,
  });

  const [provider, setProvider] = useState<Provider>();
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [claudeModel, setClaudeModel] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [neo4jUri, setNeo4jUri] = useState("");
  const [neo4jUser, setNeo4jUser] = useState("");
  const [neo4jPass, setNeo4jPass] = useState("");
  const [neo4jStatus, setNeo4jStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingNeo4j, setTestingNeo4j] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateMut = useMutation({
    mutationFn: (data: Record<string, string>) => api.settings.update(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  async function handleTestNeo4j() {
    const uri = neo4jUri || settings?.neo4j_uri || "bolt://localhost:7687";
    const user = neo4jUser || settings?.neo4j_user || "neo4j";
    const pass = neo4jPass || "";
    if (!pass) { setNeo4jStatus({ ok: false, message: "Enter the password to test" }); return; }
    setTestingNeo4j(true);
    setNeo4jStatus(null);
    try {
      const result = await api.settings.testNeo4j(uri, user, pass);
      setNeo4jStatus(result);
    } catch (e: any) {
      setNeo4jStatus({ ok: false, message: e.message });
    } finally {
      setTestingNeo4j(false);
    }
  }

  function handleSave() {
    const updates: Record<string, string> = {};
    if (provider) updates.ai_provider = provider;
    if (ollamaUrl) updates.ollama_base_url = ollamaUrl;
    if (ollamaModel) updates.ollama_model = ollamaModel;
    if (anthropicKey) updates.anthropic_api_key = anthropicKey;
    if (claudeModel) updates.claude_model = claudeModel;
    if (googleKey) updates.google_api_key = googleKey;
    if (geminiModel) updates.gemini_model = geminiModel;
    if (telegramToken) updates.telegram_bot_token = telegramToken;
    if (neo4jUri) updates.neo4j_uri = neo4jUri;
    if (neo4jUser) updates.neo4j_user = neo4jUser;
    if (neo4jPass) updates.neo4j_password = neo4jPass;
    updateMut.mutate(updates);
  }

  if (isLoading) {
    return (
      <AppShell title="Settings">
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const activeProvider = provider ?? (settings?.ai_provider as Provider) ?? "ollama";

  const PROVIDERS: { id: Provider; name: string; desc: string; color: string }[] = [
    { id: "ollama", name: "Ollama", desc: "Local models, fully private", color: "#10b981" },
    { id: "claude", name: "Claude", desc: "Anthropic's powerful AI", color: "#6366f1" },
    { id: "gemini", name: "Gemini", desc: "Google's multimodal AI", color: "#0ea5e9" },
  ];

  return (
    <AppShell title="Settings">
      <div className="p-6 max-w-3xl space-y-6">

        {/* AI Provider */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-4 h-4 text-primary" />AI Provider
              </CardTitle>
              <CardDescription>Choose which AI model powers your note analysis and chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider selector */}
              <div className="grid grid-cols-3 gap-3">
                {PROVIDERS.map(({ id, name, desc, color }) => (
                  <button
                    key={id}
                    onClick={() => setProvider(id)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      activeProvider === id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-medium text-sm">{name}</span>
                      {activeProvider === id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>

              {/* Ollama config */}
              {activeProvider === "ollama" && (
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Ollama URL</label>
                      <Input
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder={settings?.ollama_base_url ?? "http://localhost:11434"}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                      <div className="flex gap-1">
                        <Input
                          value={ollamaModel}
                          onChange={(e) => setOllamaModel(e.target.value)}
                          placeholder={settings?.ollama_model ?? "llama3.1"}
                          className="text-sm flex-1"
                        />
                        <Button variant="outline" size="icon-sm" onClick={() => refetchOllama()} title="Fetch models">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {ollamaModels?.models && ollamaModels.models.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Available models:</p>
                      <div className="flex flex-wrap gap-1">
                        {ollamaModels.models.map((m) => (
                          <button
                            key={m}
                            onClick={() => setOllamaModel(m)}
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md border transition-colors",
                              ollamaModel === m
                                ? "bg-primary/10 border-primary text-primary"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {ollamaModels?.error && (
                    <p className="text-xs text-amber-500">⚠ Could not reach Ollama: {ollamaModels.error}</p>
                  )}
                </div>
              )}

              {/* Claude config */}
              {activeProvider === "claude" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                      <Key className="w-3 h-3" />Anthropic API Key
                      {settings?.has_anthropic_key && <Badge variant="success" className="ml-1">Saved</Badge>}
                    </label>
                    <Input
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder={settings?.has_anthropic_key ? "••••••••••••••• (saved)" : "sk-ant-..."}
                      type="password"
                      className="text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                    <select
                      value={claudeModel || settings?.claude_model}
                      onChange={(e) => setClaudeModel(e.target.value)}
                      className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="claude-sonnet-4-6">claude-sonnet-4-6 (recommended)</option>
                      <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (fast)</option>
                      <option value="claude-opus-4-8">claude-opus-4-8 (powerful)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Gemini config */}
              {activeProvider === "gemini" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                      <Key className="w-3 h-3" />Google API Key
                      {settings?.has_google_key && <Badge variant="success" className="ml-1">Saved</Badge>}
                    </label>
                    <Input
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                      placeholder={settings?.has_google_key ? "••••••••••••••• (saved)" : "AIza..."}
                      type="password"
                      className="text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                    <select
                      value={geminiModel || settings?.gemini_model}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="gemini-1.5-flash">gemini-1.5-flash (fast)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (powerful)</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Telegram */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="w-4 h-4 text-primary" />Telegram Bot
                {settings?.has_telegram_token && <Badge variant="success">Connected</Badge>}
              </CardTitle>
              <CardDescription>Control your notes via Telegram: /note, /search, /ask</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 block">
                <Key className="w-3 h-3" />Bot Token
              </label>
              <Input
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder={settings?.has_telegram_token ? "••••••••••••••• (saved)" : "123456:ABC-DEF..."}
                type="password"
                className="text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get a token from <strong>@BotFather</strong> on Telegram. Restart the backend after saving.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Neo4j */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="w-4 h-4 text-primary" />Neo4j Knowledge Graph
              </CardTitle>
              <CardDescription>
                Run <code className="bg-muted px-1 rounded text-xs">docker compose up</code> in the project root to start Neo4j (default password: <code className="bg-muted px-1 rounded text-xs">password123</code>)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">URI</label>
                  <Input
                    value={neo4jUri}
                    onChange={(e) => { setNeo4jUri(e.target.value); setNeo4jStatus(null); }}
                    placeholder={settings?.neo4j_uri ?? "bolt://localhost:7687"}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">User</label>
                  <Input
                    value={neo4jUser}
                    onChange={(e) => { setNeo4jUser(e.target.value); setNeo4jStatus(null); }}
                    placeholder={settings?.neo4j_user ?? "neo4j"}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Password</label>
                  <Input
                    value={neo4jPass}
                    onChange={(e) => { setNeo4jPass(e.target.value); setNeo4jStatus(null); }}
                    placeholder="password123"
                    type="password"
                    className="text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestNeo4j}
                    disabled={testingNeo4j}
                    className="w-full"
                  >
                    {testingNeo4j
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Plug className="w-3.5 h-3.5" />}
                    Test
                  </Button>
                </div>
              </div>

              {neo4jStatus && (
                <div className={cn(
                  "flex items-start gap-2 text-xs p-2.5 rounded-lg border",
                  neo4jStatus.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                )}>
                  {neo4jStatus.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                  {neo4jStatus.message}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={updateMut.isPending} className="w-32">
            {updateMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
              ? <><CheckCircle2 className="w-4 h-4" />Saved!</>
              : <><Save className="w-4 h-4" />Save Settings</>
            }
          </Button>
          {updateMut.isError && (
            <p className="text-xs text-destructive">Failed to save settings.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
