"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, AlertCircle, Copy, Check, ArrowLeft, ArrowRight } from "lucide-react";

const TOTAL_STEPS = 6;

const CURRENCY_OPTIONS = [
  { value: "GBP", label: "GBP - British Pound", symbol: "\u00a3" },
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "\u20ac" },
];

const LOCALE_OPTIONS: Record<string, string> = {
  GBP: "en-GB",
  USD: "en-US",
  EUR: "de-DE",
};

type TestStatus = "idle" | "testing" | "success" | "error";

interface StepStatus {
  woocommerce: TestStatus;
  supabase: TestStatus;
  stripe: TestStatus;
}

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    woocommerce: "idle",
    supabase: "idle",
    stripe: "idle",
  });

  // Step 1: Store Details
  const [storeName, setStoreName] = useState("My Store");
  const [storeDescription, setStoreDescription] = useState("Fast, modern shopping");
  const [currency, setCurrency] = useState("GBP");
  const [locale, setLocale] = useState("en-GB");

  // Step 2: WooCommerce
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wcConsumerKey, setWcConsumerKey] = useState("");
  const [wcConsumerSecret, setWcConsumerSecret] = useState("");
  const [wcProductCount, setWcProductCount] = useState<number | null>(null);
  const [wcError, setWcError] = useState("");

  // Step 3: Supabase
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState("");
  const [hasSchema, setHasSchema] = useState(false);
  const [supabaseError, setSupabaseError] = useState("");
  const [migrationSql, setMigrationSql] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);

  // Step 4: Stripe
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeMode, setStripeMode] = useState<"test" | "live" | null>(null);
  const [stripeError, setStripeError] = useState("");

  // Step 5: Admin
  const [adminPassword, setAdminPassword] = useState("");
  const [cronSecret, setCronSecret] = useState("");

  // Step 6: Save & Import
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ synced: number } | null>(null);
  const [importError, setImportError] = useState("");

  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol || "\u00a3";

  // Auto-set locale when currency changes
  useEffect(() => {
    setLocale(LOCALE_OPTIONS[currency] || "en-GB");
  }, [currency]);

  // Generate a random cron secret on mount
  useEffect(() => {
    setCronSecret(
      Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }, []);

  // Load migration SQL when reaching step 3
  const loadMigration = useCallback(async () => {
    if (migrationSql) return;
    try {
      const res = await fetch("/api/setup/migration");
      const data = await res.json();
      if (data.sql) setMigrationSql(data.sql);
    } catch {
      // Ignore - user can still proceed
    }
  }, [migrationSql]);

  useEffect(() => {
    if (step === 3) loadMigration();
  }, [step, loadMigration]);

  async function testWooCommerce() {
    setStepStatus((s) => ({ ...s, woocommerce: "testing" }));
    setWcError("");
    try {
      const res = await fetch("/api/setup/test-woocommerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wordpressUrl,
          consumerKey: wcConsumerKey,
          consumerSecret: wcConsumerSecret,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStepStatus((s) => ({ ...s, woocommerce: "success" }));
        setWcProductCount(data.productCount);
      } else {
        setStepStatus((s) => ({ ...s, woocommerce: "error" }));
        setWcError(data.error);
      }
    } catch (err) {
      setStepStatus((s) => ({ ...s, woocommerce: "error" }));
      setWcError(err instanceof Error ? err.message : "Connection failed");
    }
  }

  async function testSupabase() {
    setStepStatus((s) => ({ ...s, supabase: "testing" }));
    setSupabaseError("");
    try {
      const res = await fetch("/api/setup/test-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
          serviceRoleKey: supabaseServiceRoleKey,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStepStatus((s) => ({ ...s, supabase: "success" }));
        setHasSchema(data.hasSchema);
      } else {
        setStepStatus((s) => ({ ...s, supabase: "error" }));
        setSupabaseError(data.error);
      }
    } catch (err) {
      setStepStatus((s) => ({ ...s, supabase: "error" }));
      setSupabaseError(err instanceof Error ? err.message : "Connection failed");
    }
  }

  async function testStripe() {
    setStepStatus((s) => ({ ...s, stripe: "testing" }));
    setStripeError("");
    try {
      const res = await fetch("/api/setup/test-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishableKey: stripePublishableKey,
          secretKey: stripeSecretKey,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStepStatus((s) => ({ ...s, stripe: "success" }));
        setStripeMode(data.mode);
      } else {
        setStepStatus((s) => ({ ...s, stripe: "error" }));
        setStripeError(data.error);
      }
    } catch (err) {
      setStepStatus((s) => ({ ...s, stripe: "error" }));
      setStripeError(err instanceof Error ? err.message : "Connection failed");
    }
  }

  async function copySql() {
    await navigator.clipboard.writeText(migrationSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  }

  async function saveConfig() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storeDescription,
          currency,
          currencySymbol,
          locale,
          wordpressUrl,
          wcConsumerKey,
          wcConsumerSecret,
          supabaseUrl,
          supabaseAnonKey,
          supabaseServiceRoleKey,
          stripePublishableKey,
          stripeSecretKey,
          adminPassword,
          cronSecret,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
      } else {
        setSaveError(data.error || "Failed to save configuration");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function importProducts() {
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/setup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl,
          supabaseServiceRoleKey,
          wordpressUrl,
          wcConsumerKey,
          wcConsumerSecret,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ synced: data.synced });
      } else {
        setImportError(data.error || "Import failed");
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function StatusIcon({ status }: { status: TestStatus }) {
    if (status === "testing") return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
    if (status === "success") return <CheckCircle2 className="size-4 text-green-600" />;
    if (status === "error") return <AlertCircle className="size-4 text-red-500" />;
    return null;
  }

  function StepIndicator() {
    return (
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === step;
          const isCompleted = stepNum < step;
          return (
            <div key={stepNum} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-6 ${isCompleted ? "bg-green-500" : "bg-border"}`} />}
              <button
                type="button"
                onClick={() => setStep(stepNum)}
                className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="size-4" /> : stepNum}
              </button>
            </div>
          );
        })}
        <span className="ml-2 text-sm text-muted-foreground">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>
    );
  }

  function renderStep1() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
          <CardDescription>Basic information about your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="My Store"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeDescription">Description</Label>
            <Input
              id="storeDescription"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Fast, modern shopping"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.symbol})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Input
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en-GB"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderStep2() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            WooCommerce Connection
            <StatusIcon status={stepStatus.woocommerce} />
          </CardTitle>
          <CardDescription>Connect to your WordPress/WooCommerce store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wordpressUrl">WordPress URL</Label>
            <Input
              id="wordpressUrl"
              value={wordpressUrl}
              onChange={(e) => setWordpressUrl(e.target.value)}
              placeholder="https://your-store.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wcConsumerKey">Consumer Key</Label>
            <Input
              id="wcConsumerKey"
              value={wcConsumerKey}
              onChange={(e) => setWcConsumerKey(e.target.value)}
              placeholder="ck_xxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wcConsumerSecret">Consumer Secret</Label>
            <Input
              id="wcConsumerSecret"
              type="password"
              value={wcConsumerSecret}
              onChange={(e) => setWcConsumerSecret(e.target.value)}
              placeholder="cs_xxxxx"
            />
          </div>
          <Button
            onClick={testWooCommerce}
            disabled={!wordpressUrl || !wcConsumerKey || !wcConsumerSecret || stepStatus.woocommerce === "testing"}
            variant="outline"
          >
            {stepStatus.woocommerce === "testing" && <Loader2 className="size-4 animate-spin" />}
            Test Connection
          </Button>
          {stepStatus.woocommerce === "success" && (
            <p className="text-sm text-green-600">
              Connected successfully! Found {wcProductCount} product{wcProductCount !== 1 ? "s" : ""}.
            </p>
          )}
          {wcError && <p className="text-sm text-red-500">{wcError}</p>}
        </CardContent>
      </Card>
    );
  }

  function renderStep3() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Supabase Connection
            <StatusIcon status={stepStatus.supabase} />
          </CardTitle>
          <CardDescription>Connect to your Supabase project for product caching</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <Input
              id="supabaseUrl"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xxxxx.supabase.co"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supabaseAnonKey">Anon Key</Label>
            <Input
              id="supabaseAnonKey"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supabaseServiceRoleKey">Service Role Key</Label>
            <Input
              id="supabaseServiceRoleKey"
              type="password"
              value={supabaseServiceRoleKey}
              onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
              placeholder="eyJxxxxx"
            />
          </div>
          <Button
            onClick={testSupabase}
            disabled={!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || stepStatus.supabase === "testing"}
            variant="outline"
          >
            {stepStatus.supabase === "testing" && <Loader2 className="size-4 animate-spin" />}
            Test Connection
          </Button>
          {stepStatus.supabase === "success" && (
            <div className="space-y-2">
              <p className="text-sm text-green-600">Connected successfully!</p>
              {hasSchema ? (
                <Badge variant="secondary">Schema detected - migration already applied</Badge>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Schema not found</Badge>
                    <span className="text-sm text-muted-foreground">
                      Run this migration in the Supabase SQL Editor:
                    </span>
                  </div>
                  {migrationSql && (
                    <div className="relative">
                      <Button
                        onClick={copySql}
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-2 z-10"
                      >
                        {copiedSql ? <Check className="size-3" /> : <Copy className="size-3" />}
                        {copiedSql ? "Copied" : "Copy"}
                      </Button>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                        {migrationSql}
                      </pre>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    After running the migration, click &quot;Test Connection&quot; again to verify.
                  </p>
                </div>
              )}
            </div>
          )}
          {supabaseError && <p className="text-sm text-red-500">{supabaseError}</p>}
        </CardContent>
      </Card>
    );
  }

  function renderStep4() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stripe Payments
            <StatusIcon status={stepStatus.stripe} />
          </CardTitle>
          <CardDescription>Connect Stripe for payment processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripePublishableKey">Publishable Key</Label>
            <Input
              id="stripePublishableKey"
              value={stripePublishableKey}
              onChange={(e) => setStripePublishableKey(e.target.value)}
              placeholder="pk_test_xxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripeSecretKey">Secret Key</Label>
            <Input
              id="stripeSecretKey"
              type="password"
              value={stripeSecretKey}
              onChange={(e) => setStripeSecretKey(e.target.value)}
              placeholder="sk_test_xxxxx"
            />
          </div>
          <Button
            onClick={testStripe}
            disabled={!stripePublishableKey || !stripeSecretKey || stepStatus.stripe === "testing"}
            variant="outline"
          >
            {stepStatus.stripe === "testing" && <Loader2 className="size-4 animate-spin" />}
            Test Connection
          </Button>
          {stepStatus.stripe === "success" && (
            <p className="text-sm text-green-600">
              Connected successfully!{" "}
              <Badge variant={stripeMode === "live" ? "default" : "secondary"}>
                {stripeMode} mode
              </Badge>
            </p>
          )}
          {stripeError && <p className="text-sm text-red-500">{stripeError}</p>}
        </CardContent>
      </Card>
    );
  }

  function renderStep5() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin & Security</CardTitle>
          <CardDescription>Set up admin access and cron authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Choose a strong password"
            />
            <p className="text-xs text-muted-foreground">
              Used to access the admin panel at /admin
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cronSecret">Cron Secret</Label>
            <Input
              id="cronSecret"
              value={cronSecret}
              onChange={(e) => setCronSecret(e.target.value)}
              placeholder="Auto-generated"
            />
            <p className="text-xs text-muted-foreground">
              Used to authenticate cron job requests. Auto-generated for you.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderStep6() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save &amp; Import</CardTitle>
          <CardDescription>Review your configuration and import products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Configuration Summary</h3>
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Store</span>
                <span>{storeName} ({currency})</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">WooCommerce</span>
                <span className="flex items-center gap-1">
                  {wordpressUrl || "Not set"}
                  <StatusIcon status={stepStatus.woocommerce} />
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Supabase</span>
                <span className="flex items-center gap-1">
                  {supabaseUrl ? new URL(supabaseUrl).hostname : "Not set"}
                  <StatusIcon status={stepStatus.supabase} />
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stripe</span>
                <span className="flex items-center gap-1">
                  {stripeMode ? `${stripeMode} mode` : "Not tested"}
                  <StatusIcon status={stepStatus.stripe} />
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin</span>
                <span>{adminPassword ? "Password set" : "Not set"}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">1. Save Configuration</h3>
            <Button onClick={saveConfig} disabled={saving || saved}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saved ? "Configuration Saved" : "Save to .env.local"}
            </Button>
            {saved && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="size-4" />
                Configuration saved to .env.local
              </p>
            )}
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          </div>

          {/* Import Button */}
          {saved && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">2. Import Products</h3>
              <p className="text-sm text-muted-foreground">
                This will sync all products from WooCommerce into Supabase.
              </p>
              <Button
                onClick={importProducts}
                disabled={importing || !!importResult}
              >
                {importing && <Loader2 className="size-4 animate-spin" />}
                {importResult ? "Import Complete" : importing ? "Importing..." : "Import Products"}
              </Button>
              {importing && (
                <p className="text-sm text-muted-foreground">
                  Syncing products from WooCommerce... This may take a moment.
                </p>
              )}
              {importResult && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="size-4" />
                  Successfully synced {importResult.synced} product{importResult.synced !== 1 ? "s" : ""}.
                </p>
              )}
              {importError && <p className="text-sm text-red-500">{importError}</p>}
            </div>
          )}

          {/* Success state */}
          {importResult && (
            <div className="space-y-4">
              <Separator />
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Setup Complete!
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  Your store is configured and products are synced.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = "/"}
                  >
                    Visit Store
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = "/admin"}
                  >
                    Admin Panel
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> Restart your dev server for environment variable changes to take effect.
                  In production, redeploy your application.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Store Setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your headless WooCommerce storefront
          </p>
        </div>

        <StepIndicator />

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="size-4" />
            Previous
          </Button>
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={step === TOTAL_STEPS}
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
