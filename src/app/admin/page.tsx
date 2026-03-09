"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { SyncState } from "@/lib/types";

export default function AdminPage() {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [wcStatus, setWcStatus] = useState<"checking" | "ok" | "error">("checking");
  const [stripeStatus, setStripeStatus] = useState<"checking" | "ok" | "error">("checking");

  const fetchStatus = async () => {
    // Sync state
    const { data } = await supabase.from("sync_state").select("*").eq("id", 1).single();
    if (data) setSyncState(data as SyncState);

    // Product count
    const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
    setProductCount(count || 0);

    // WooCommerce connection
    try {
      const res = await fetch("/api/health/woocommerce");
      setWcStatus(res.ok ? "ok" : "error");
    } catch {
      setWcStatus("error");
    }

    // Stripe connection
    try {
      const res = await fetch("/api/health/stripe");
      setStripeStatus(res.ok ? "ok" : "error");
    } catch {
      setStripeStatus("error");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/admin/sync-now", { method: "POST" });
    await fetchStatus();
    setSyncing(false);
  };

  const handleFullResync = async () => {
    setSyncing(true);
    // Reset last_synced_at to force full sync
    await supabase.from("sync_state").update({ last_synced_at: null }).eq("id", 1);
    await fetch("/api/admin/sync-now", { method: "POST" });
    await fetchStatus();
    setSyncing(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ok":
      case "idle":
        return <Badge className="bg-green-500">Connected</Badge>;
      case "syncing":
        return <Badge className="bg-blue-500">Syncing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "checking":
        return <Badge variant="secondary">Checking...</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Store Admin</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              WooCommerce {statusBadge(wcStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {process.env.NEXT_PUBLIC_WORDPRESS_URL}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Stripe {statusBadge(stripeStatus)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test") ? "Test mode" : "Live mode"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Product Sync {syncState && statusBadge(syncState.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Products in Supabase</p>
              <p className="text-2xl font-bold">{productCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last synced</p>
              <p className="font-medium">
                {syncState?.last_synced_at
                  ? new Date(syncState.last_synced_at).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Products in last sync</p>
              <p className="font-medium">{syncState?.products_synced || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last completed</p>
              <p className="font-medium">
                {syncState?.completed_at
                  ? new Date(syncState.completed_at).toLocaleString()
                  : "Never"}
              </p>
            </div>
          </div>

          {syncState?.errors && (
            <p className="text-sm text-destructive">Error: {syncState.errors}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button variant="outline" onClick={handleFullResync} disabled={syncing}>
              Full Re-sync
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
