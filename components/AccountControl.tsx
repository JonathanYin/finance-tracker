"use client";

import { useState } from "react";
import { useExpenses } from "@/lib/expenses-context";

type AuthMode = "signin" | "signup";

export default function AccountControl() {
  const {
    authEnabled,
    authLoading,
    syncStatus,
    syncError,
    user,
    signOut,
  } = useExpenses();
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    const result = await signOut();
    if (result.error) setError(result.error);
  }

  if (!authEnabled) {
    return (
      <div className="rounded-sm border border-hairline bg-canvas px-3 py-2 text-xs text-body shadow-card">
        Guest mode
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-stretch gap-2 sm:items-end">
      {user ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 rounded-sm border border-hairline bg-canvas px-3 py-2 shadow-card">
            <div className="truncate text-xs font-medium text-ink">
              {user.email}
            </div>
            <div className="mt-0.5 font-mono text-[11px] uppercase text-mute">
              {syncLabel(syncStatus)}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={authLoading}
            className="h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2 disabled:cursor-not-allowed disabled:text-mute"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("signin");
            }}
            className="h-9 rounded-sm border border-hairline bg-canvas px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("signup");
            }}
            className="h-9 rounded-sm bg-ink px-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
          >
            Sign up
          </button>
        </div>
      )}

      {(syncError || error) && (
        <p className="max-w-64 text-xs text-error">{error ?? syncError}</p>
      )}

      {mode && (
        <AuthDialog
          mode={mode}
          onModeChange={setMode}
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}

function AuthDialog({
  mode,
  onModeChange,
  onClose,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const { signIn, signUp } = useExpenses();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "signup"
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);

    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.message) {
      setMessage(result.message);
      return;
    }
    onClose();
  }

  const inputClass =
    "h-10 w-full rounded-sm border border-hairline bg-canvas px-3 text-sm text-ink outline-none placeholder:text-mute focus:border-hairline-strong";
  const labelClass = "text-xs font-medium tracking-wide text-mute";

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-canvas p-5 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            {mode === "signup" ? "Create account" : "Sign in"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-2 py-1 text-sm text-body transition-colors hover:bg-canvas-soft-2 hover:text-ink"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              minLength={6}
              required
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        {message && <p className="mt-3 text-sm text-body">{message}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              onModeChange(mode === "signup" ? "signin" : "signup");
            }}
            className="text-sm text-body"
          >
            {mode === "signup" ? "Have an account?" : "Need an account?"}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-sm bg-ink px-4 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Working..."
              : mode === "signup"
                ? "Sign up"
                : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}

function syncLabel(status: string) {
  if (status === "cloud") return "Cloud";
  if (status === "importing") return "Importing";
  if (status === "loading") return "Loading";
  if (status === "error") return "Sync error";
  return "Guest";
}
