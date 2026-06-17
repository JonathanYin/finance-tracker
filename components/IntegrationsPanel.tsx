"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { todayISO } from "@/lib/format";
import { useExpenses } from "@/lib/expenses-context";

declare global {
  interface Window {
    Plaid?: {
      create(options: {
        token: string;
        onSuccess: (publicToken: string) => void;
        onExit?: () => void;
      }): { open: () => void };
    };
  }
}

type ConnectedAccountSummary = {
  id: string;
  provider: string;
  institutionName: string;
  accountName?: string;
  accountMask?: string;
  accountType?: string;
  accountSubtype?: string;
  status: string;
  lastSyncedAt?: string;
  hasSyncCursor: boolean;
};

type IntegrationStatus = {
  connectedAccounts: ConnectedAccountSummary[];
  importDrafts: Array<{
    id: string;
    source: string;
    fileName?: string;
    merchant: string;
    amount: number;
    date: string;
    confidence: number;
    reviewStatus: string;
    createdAt: string;
  }>;
};

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(json.error ?? "Request failed.");
  }
  return json;
}

function loadPlaidScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Plaid) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Plaid failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Plaid failed to load."));
    document.body.appendChild(script);
  });
}

function formatSyncTime(iso?: string) {
  if (!iso) return "Never synced";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Last sync unknown";
  return `Last synced ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function IntegrationsPanel() {
  const { refresh } = useExpenses();
  const [status, setStatus] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState({
    merchant: "",
    amount: "",
    date: todayISO(),
  });
  const [file, setFile] = useState<File | null>(null);

  const refreshIntegrationStatus = useCallback(async () => {
    const json = await readJson<IntegrationStatus>(
      await fetch("/api/integrations/status", { cache: "no-store" }),
    );
    setIntegrationStatus(json);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshIntegrationStatus().catch((err) => {
        setStatus(
          err instanceof Error
            ? err.message
            : "Could not load integration status.",
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshIntegrationStatus]);

  const plaidAccounts = useMemo(
    () =>
      integrationStatus?.connectedAccounts.filter(
        (account) => account.provider === "plaid",
      ) ?? [],
    [integrationStatus],
  );
  const connectedAccountCount = plaidAccounts.length;
  const lastSyncedAt = plaidAccounts
    .map((account) => account.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  async function connectPlaid() {
    setBusy("connect");
    setStatus("Creating Plaid link session...");
    try {
      const { link_token } = await readJson<{ link_token: string }>(
        await fetch("/api/integrations/plaid/link-token", { method: "POST" }),
      );
      await loadPlaidScript();
      window.Plaid?.create({
        token: link_token,
        onSuccess: async (publicToken) => {
          setStatus("Connecting accounts...");
          await readJson(
            await fetch("/api/integrations/plaid/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public_token: publicToken }),
            }),
          );
          await refreshIntegrationStatus();
          setStatus("Accounts connected.");
          setBusy(null);
        },
        onExit: () => {
          setStatus("Plaid link closed.");
          setBusy(null);
        },
      }).open();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Plaid connection failed.");
      setBusy(null);
    }
  }

  async function syncPlaid() {
    setBusy("sync");
    setStatus("Syncing bank transactions...");
    try {
      const json = await readJson<{ imported: number }>(
        await fetch("/api/integrations/plaid/sync", { method: "POST" }),
      );
      await Promise.all([refresh(), refreshIntegrationStatus()]);
      setStatus(`Imported ${json.imported} bank transactions.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Plaid sync failed.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus("Choose a receipt file first.");
      return;
    }

    const formData = new FormData();
    formData.set("receipt", file);
    formData.set("merchant", receipt.merchant);
    formData.set("amount", receipt.amount);
    formData.set("date", receipt.date);

    setBusy("receipt");
    setStatus("Uploading receipt...");
    try {
      const json = await readJson<{ transactions: unknown[] }>(
        await fetch("/api/integrations/receipt/upload", {
          method: "POST",
          body: formData,
        }),
      );
      await Promise.all([refresh(), refreshIntegrationStatus()]);
      setStatus(
        json.transactions.length > 0
          ? "Receipt draft created for review."
          : "Receipt draft saved; add amount to create a transaction.",
      );
      setReceipt({ merchant: "", amount: "", date: todayISO() });
      setFile(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Receipt upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function syncGmail() {
    setBusy("gmail");
    setStatus("Checking Gmail configuration...");
    try {
      await readJson(await fetch("/api/integrations/gmail/sync", { method: "POST" }));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Gmail is not configured.");
    } finally {
      setBusy(null);
    }
  }

  async function resetLocalData() {
    const confirmed = window.confirm(
      "Reset all local transactions, connected accounts, and receipt drafts?",
    );
    if (!confirmed) return;

    setBusy("reset");
    setStatus("Resetting local data...");
    try {
      await readJson<{ ok: boolean }>(
        await fetch("/api/dev/reset", { method: "POST" }),
      );
      await Promise.all([refresh(), refreshIntegrationStatus()]);
      setStatus("Local test data reset.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(null);
    }
  }

  const inputClass =
    "h-10 w-full rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink outline-none placeholder:text-mute focus:border-hairline-strong";
  const secondaryButtonClass =
    "h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-lg bg-canvas p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Integrations
          </h2>
          <p className="text-sm text-body">
            Import bank activity, receipt uploads, and future Gmail receipts.
          </p>
        </div>
        <button
          type="button"
          onClick={resetLocalData}
          disabled={busy !== null}
          className={secondaryButtonClass}
        >
          Reset local data
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="rounded-md border border-hairline bg-canvas-soft p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">Bank sync</div>
              <div className="text-sm text-body">
                Plaid Link plus incremental transaction sync.
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs text-body">
                  {connectedAccountCount} connected
                </span>
                <span className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs text-body">
                  {formatSyncTime(lastSyncedAt)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={connectPlaid}
                disabled={busy !== null}
                className="h-9 rounded-sm bg-ink px-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connectedAccountCount > 0 ? "Connect another" : "Connect"}
              </button>
              <button
                type="button"
                onClick={syncPlaid}
                disabled={busy !== null || connectedAccountCount === 0}
                className={secondaryButtonClass}
              >
                Sync
              </button>
            </div>
          </div>

          {plaidAccounts.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {plaidAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-sm border border-hairline bg-canvas px-3 py-2"
                >
                  <div className="truncate text-sm font-medium text-ink">
                    {account.accountName ?? account.institutionName}
                    {account.accountMask ? ` • ${account.accountMask}` : ""}
                  </div>
                  <div className="text-xs text-body">
                    {[account.accountSubtype, account.status, account.hasSyncCursor && "cursor"]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={uploadReceipt}
          className="rounded-md border border-hairline bg-canvas-soft p-3"
        >
          <div className="text-sm font-medium text-ink">Receipt upload</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Merchant"
              value={receipt.merchant}
              onChange={(e) => setReceipt({ ...receipt, merchant: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={receipt.amount}
              onChange={(e) => setReceipt({ ...receipt, amount: e.target.value })}
              className={inputClass}
            />
            <input
              type="date"
              value={receipt.date}
              onChange={(e) => setReceipt({ ...receipt, date: e.target.value })}
              className={inputClass}
            />
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sm:col-span-2 file:mr-3 file:h-9 file:rounded-sm file:border-0 file:bg-ink file:px-3 file:text-sm file:font-medium file:text-on-primary"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className={secondaryButtonClass}
            >
              Upload
            </button>
          </div>
        </form>

        <div className="rounded-md border border-hairline bg-canvas-soft p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">Gmail receipts</div>
              <div className="text-sm text-body">
                Planned after Google OAuth and restricted-scope review.
              </div>
            </div>
            <button
              type="button"
              onClick={syncGmail}
              disabled={busy !== null}
              className={secondaryButtonClass}
            >
              Check
            </button>
          </div>
        </div>
      </div>

      {status && (
        <p className="mt-4 rounded-sm border border-hairline bg-canvas-soft px-3 py-2 text-sm text-body">
          {status}
        </p>
      )}
    </section>
  );
}
