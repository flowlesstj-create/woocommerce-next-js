"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { SyncState, WCShippingMethod, WCShippingZone } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Globe,
  CreditCard,
  Package,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowDownToLine,
  Truck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusDot({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    ok: { color: "bg-emerald-500", label: "Connected" },
    idle: { color: "bg-emerald-500", label: "Connected" },
    syncing: { color: "bg-sky-500 animate-pulse", label: "Syncing" },
    error: { color: "bg-rose-500", label: "Error" },
    checking: { color: "bg-slate-300 animate-pulse", label: "Checking" },
  };
  const { color, label } = config[status] || { color: "bg-slate-300", label: status };
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

interface ShippingZoneData {
  zone: WCShippingZone;
  methods: WCShippingMethod[];
}

export default function AdminPage() {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [wcStatus, setWcStatus] = useState<"checking" | "ok" | "error">("checking");
  const [stripeStatus, setStripeStatus] = useState<"checking" | "ok" | "error">("checking");
  const [shippingZones, setShippingZones] = useState<ShippingZoneData[] | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // AI settings
  const [aiProvider, setAiProvider] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiModels, setAiModels] = useState<{ id: string; name: string }[]>([]);
  const [aiModelsLoading, setAiModelsLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // SEO generation
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [seoResults, setSeoResults] = useState<{ productId: number; name: string; meta_title: string; meta_description: string; focus_keyword: string; og_title: string; error?: string }[]>([]);
  const [seoError, setSeoError] = useState<string | null>(null);

  const fetchStatus = async () => {
    const { data } = await supabase.from("sync_state").select("*").eq("id", 1).single();
    if (data) setSyncState(data as SyncState);

    const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
    setProductCount(count || 0);

    try {
      const res = await fetch("/api/health/woocommerce");
      setWcStatus(res.ok ? "ok" : "error");
    } catch {
      setWcStatus("error");
    }

    try {
      const res = await fetch("/api/health/stripe");
      setStripeStatus(res.ok ? "ok" : "error");
    } catch {
      setStripeStatus("error");
    }
  };

  const fetchShipping = async () => {
    try {
      const res = await fetch("/api/admin/shipping");
      const data = await res.json();
      if (data.ok) {
        setShippingZones(data.zones);
      } else {
        setShippingError(data.error);
      }
    } catch (err) {
      setShippingError(err instanceof Error ? err.message : "Failed to fetch shipping");
    }
  };

  const fetchAiSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings?keys=ai_provider,ai_api_key,ai_model");
      const data = await res.json();
      if (data.settings) {
        if (data.settings.ai_provider) setAiProvider(data.settings.ai_provider);
        if (data.settings.ai_api_key) setAiApiKey(data.settings.ai_api_key);
        if (data.settings.ai_model) setAiModel(data.settings.ai_model);
        // Fetch models if we have provider + key
        if (data.settings.ai_provider && data.settings.ai_api_key) {
          fetchModels(data.settings.ai_provider, data.settings.ai_api_key, data.settings.ai_model);
        }
      }
    } catch {
      // Settings table may not exist yet
    }
  };

  const fetchModels = async (provider: string, apiKey: string, currentModel?: string) => {
    setAiModelsLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/admin/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
        setAiModels([]);
      } else {
        setAiModels(data.models || []);
        // Keep current model if still valid, otherwise clear
        if (currentModel && data.models?.some((m: any) => m.id === currentModel)) {
          setAiModel(currentModel);
        } else if (!currentModel && data.models?.length) {
          setAiModel(data.models[0].id);
        }
      }
    } catch {
      setAiError("Failed to fetch models");
    } finally {
      setAiModelsLoading(false);
    }
  };

  const saveAiSettings = async () => {
    setAiSaving(true);
    setAiSaved(false);
    setAiError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ai_provider: aiProvider, ai_api_key: aiApiKey, ai_model: aiModel },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        setAiSaved(true);
        setTimeout(() => setAiSaved(false), 3000);
      }
    } catch {
      setAiError("Failed to save settings");
    } finally {
      setAiSaving(false);
    }
  };

  const [seoTotal, setSeoTotal] = useState(0);

  const generateSeoAll = async () => {
    setSeoGenerating(true);
    setSeoError(null);
    setSeoResults([]);
    setSeoTotal(0);
    try {
      const { data: products } = await supabase.from("products").select("id, name");
      if (!products?.length) {
        setSeoError("No products found");
        setSeoGenerating(false);
        return;
      }
      setSeoTotal(products.length);

      for (const product of products) {
        try {
          const res = await fetch("/api/admin/ai/generate-seo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [product.id] }),
          });
          const data = await res.json();
          if (data.error) {
            setSeoResults((prev) => [...prev, {
              productId: product.id, name: product.name,
              meta_title: "", meta_description: "", focus_keyword: "", og_title: "",
              error: data.error,
            }]);
          } else if (data.results?.[0]) {
            setSeoResults((prev) => [...prev, data.results[0]]);
          }
        } catch {
          setSeoResults((prev) => [...prev, {
            productId: product.id, name: product.name,
            meta_title: "", meta_description: "", focus_keyword: "", og_title: "",
            error: "Request failed",
          }]);
        }
      }
    } catch {
      setSeoError("Failed to generate SEO");
    } finally {
      setSeoGenerating(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchShipping();
    fetchAiSettings();
  }, []);

  // Poll sync_state while syncing
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("sync_state").select("*").eq("id", 1).single();
      if (data) {
        setSyncState(data as SyncState);
        if (data.status !== "syncing") {
          setSyncing(false);
          fetchStatus();
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [syncing]);

  const handleSync = async () => {
    setSyncing(true);
    fetch("/api/admin/sync-now", { method: "POST" });
  };

  const handleFullResync = async () => {
    setSyncing(true);
    await supabase.from("sync_state").update({ last_synced_at: null }).eq("id", 1);
    fetch("/api/admin/sync-now", { method: "POST" });
  };

  const syncDisplayStatus = syncState?.status === "syncing"
    ? "syncing"
    : syncState?.status === "error"
      ? "error"
      : "ok";

  const totalShippingMethods = shippingZones?.reduce((sum, z) => sum + z.methods.length, 0) || 0;
  const enabledShippingMethods = shippingZones?.reduce(
    (sum, z) => sum + z.methods.filter((m) => m.enabled).length,
    0
  ) || 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your store connections and product sync
        </p>
      </div>

      {/* Connection Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Globe className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">WooCommerce</h3>
              <StatusDot status={wcStatus} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {process.env.NEXT_PUBLIC_WORDPRESS_URL || "Not configured"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <CreditCard className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Stripe</h3>
              <StatusDot status={stripeStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test")
                ? "Test mode"
                : "Live mode"}
            </p>
          </div>
        </div>
      </div>

      {/* Product Sync */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Package className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Product Sync</h3>
              <p className="text-xs text-muted-foreground">
                {syncState?.status === "syncing"
                  ? "Sync in progress..."
                  : "WooCommerce to Supabase"}
              </p>
            </div>
          </div>
          <StatusDot status={syncDisplayStatus} />
        </div>

        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <StatBox
            icon={<Package className="size-3.5" />}
            label="Products"
            value={productCount}
          />
          <StatBox
            icon={<ArrowDownToLine className="size-3.5" />}
            label="Last sync count"
            value={syncState?.products_synced || 0}
          />
          <StatBox
            icon={<Clock className="size-3.5" />}
            label="Last synced"
            value={syncState?.last_synced_at ? timeAgo(syncState.last_synced_at) : "Never"}
          />
          <StatBox
            icon={<Clock className="size-3.5" />}
            label="Completed"
            value={syncState?.completed_at ? timeAgo(syncState.completed_at) : "Never"}
          />
        </div>

        {syncing && syncState?.status === "syncing" && (
          <div className="mx-6 mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {syncState.sync_phase === "fetching"
                  ? "Fetching products from WooCommerce..."
                  : syncState.sync_phase === "images"
                    ? "Downloading images to Supabase Storage..."
                    : syncState.sync_phase === "writing"
                      ? "Writing to database..."
                      : "Syncing..."}
              </span>
              {syncState.products_total ? (
                <span className="tabular-nums font-medium">
                  {syncState.products_synced} / {syncState.products_total}
                </span>
              ) : null}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full bg-sky-500 transition-all duration-500 ${
                  syncState.sync_phase === "images" || syncState.sync_phase === "writing"
                    ? "animate-pulse"
                    : ""
                }`}
                style={{
                  width:
                    syncState.sync_phase === "writing"
                      ? "90%"
                      : syncState.sync_phase === "images"
                        ? "70%"
                        : syncState.products_total
                          ? `${Math.min(60, (syncState.products_synced / syncState.products_total) * 60)}%`
                          : "30%",
                }}
              />
            </div>
          </div>
        )}

        {syncState?.errors && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {syncState.errors}
          </div>
        )}

        <div className="flex gap-2 px-6 py-4">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-sky-500 text-white hover:bg-sky-600"
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Button variant="outline" onClick={handleFullResync} disabled={syncing}>
            Full Re-sync
          </Button>
        </div>
      </div>

      {/* Shipping */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Truck className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Shipping</h3>
              <p className="text-xs text-muted-foreground">
                {shippingZones
                  ? `${enabledShippingMethods} active method${enabledShippingMethods !== 1 ? "s" : ""} across ${shippingZones.length} zone${shippingZones.length !== 1 ? "s" : ""}`
                  : "Loading from WooCommerce..."}
              </p>
            </div>
          </div>
          {shippingZones && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShippingZones(null);
                setShippingError(null);
                fetchShipping();
              }}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          )}
        </div>

        {shippingError && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {shippingError}
          </div>
        )}

        {shippingZones && (
          <div className="divide-y">
            {shippingZones.map(({ zone, methods }) => (
              <div key={zone.id} className="px-6 py-4">
                <h4 className="text-sm font-medium">{zone.name}</h4>
                {methods.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No shipping methods configured</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {methods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {method.enabled ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="size-3.5 text-muted-foreground" />
                          )}
                          <span className={method.enabled ? "" : "text-muted-foreground"}>
                            {method.settings.title?.value || method.method_title}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {method.method_id}
                          </span>
                        </div>
                        <span className="font-medium">
                          {method.method_id === "free_shipping"
                            ? "Free"
                            : method.settings.cost?.value
                              ? formatPrice(parseFloat(method.settings.cost.value))
                              : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!shippingZones && !shippingError && (
          <div className="flex items-center justify-center gap-2 px-6 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading shipping zones...
          </div>
        )}

        <div className="border-t px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Shipping zones and methods are managed in{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-admin/admin.php?page=wc-settings&tab=shipping`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              WooCommerce → Settings → Shipping
            </a>
            . Changes there are reflected here immediately.
          </p>
        </div>
      </div>

      {/* AI & SEO */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium">AI & SEO</h3>
              <p className="text-xs text-muted-foreground">
                Configure an AI provider to generate product SEO metadata
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Provider */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => {
                  setAiProvider(e.target.value);
                  setAiModels([]);
                  setAiModel("");
                  setAiError(null);
                }}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select provider...</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    setAiModels([]);
                    setAiModel("");
                  }}
                  placeholder={
                    aiProvider === "openai" ? "sk-..." :
                    aiProvider === "anthropic" ? "sk-ant-..." :
                    aiProvider === "deepseek" ? "sk-..." : "Enter API key"
                  }
                  className="pr-16"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  {aiProvider && aiApiKey && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={aiModelsLoading}
                      onClick={() => fetchModels(aiProvider, aiApiKey)}
                    >
                      {aiModelsLoading ? <Loader2 className="size-3 animate-spin" /> : "Fetch"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Model
                {aiModels.length > 0 && (
                  <span className="ml-1 text-muted-foreground/60">({aiModels.length} available)</span>
                )}
              </label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                disabled={!aiModels.length}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {aiModelsLoading ? "Loading models..." : aiModels.length ? "Select model..." : "Fetch models first"}
                </option>
                {aiModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {aiError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {aiError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={saveAiSettings}
              disabled={aiSaving || !aiProvider || !aiApiKey || !aiModel}
              className="bg-sky-500 text-white hover:bg-sky-600"
            >
              {aiSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : aiSaved ? (
                <Check className="size-4" />
              ) : null}
              {aiSaved ? "Saved" : "Save AI Settings"}
            </Button>
          </div>
        </div>

        {/* SEO Generation */}
        {aiProvider && aiApiKey && aiModel && (
          <div className="border-t px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Generate Product SEO</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate meta titles and descriptions for all products using {aiProvider === "anthropic" ? "Claude" : aiProvider === "openai" ? "OpenAI" : "DeepSeek"}
                </p>
              </div>
              <Button
                onClick={generateSeoAll}
                disabled={seoGenerating}
                variant="outline"
              >
                {seoGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {seoGenerating
                  ? `Generating ${seoResults.length + 1} of ${seoTotal}...`
                  : "Generate All"}
              </Button>
            </div>

            {seoError && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {seoError}
              </div>
            )}

            {seoResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {seoGenerating
                      ? `Generating... ${seoResults.length} of ${seoTotal}`
                      : `Generated ${seoResults.filter((r) => !r.error).length} of ${seoResults.length} products`}
                  </p>
                  {seoGenerating && seoTotal > 0 && (
                    <span className="text-xs tabular-nums font-medium text-muted-foreground">
                      {Math.round((seoResults.length / seoTotal) * 100)}%
                    </span>
                  )}
                </div>
                {seoTotal > 0 && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full bg-violet-500 transition-all duration-500 ${seoGenerating ? "animate-pulse" : ""}`}
                      style={{ width: `${(seoResults.length / seoTotal) * 100}%` }}
                    />
                  </div>
                )}
                <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg border p-3">
                  {seoResults.map((r) => (
                    <div key={r.productId} className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1.5">
                      {r.error ? (
                        <div className="text-rose-500">{r.name}: {r.error}</div>
                      ) : (
                        <>
                          <div className="font-medium">{r.name}</div>
                          <div className="grid gap-1 text-xs">
                            <div><span className="text-muted-foreground">Title:</span> <span className={r.meta_title.length > 60 ? "text-amber-600" : ""}>{r.meta_title}</span> <span className="text-muted-foreground/60">({r.meta_title.length}/50)</span></div>
                            <div><span className="text-muted-foreground">Description:</span> {r.meta_description} <span className="text-muted-foreground/60">({r.meta_description.length}/140)</span></div>
                            <div><span className="text-muted-foreground">Keyword:</span> <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700">{r.focus_keyword}</span></div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
