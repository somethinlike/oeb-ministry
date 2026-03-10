/**
 * EncryptionSetup — multi-step wizard for first-time note locking.
 *
 * Three steps:
 * 1. Introduction — explains what locking does (Tier 1 language)
 * 2. Passphrase — enter + confirm, with autocomplete for credential managers
 * 3. Recovery code — shown once, must acknowledge before finishing
 *
 * Also includes an UnlockPrompt for returning users who need to
 * enter their passphrase to read/write locked notes.
 */

import { useState, useCallback } from "react";
import { useEncryption } from "./EncryptionProvider";

// ── EncryptionSetup (first-time wizard) ──

interface EncryptionSetupProps {
  /** Called when setup completes successfully */
  onComplete: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

export function EncryptionSetup({ onComplete, onCancel }: EncryptionSetupProps) {
  const { setupEncryption } = useEncryption();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passphraseValid = passphrase.length >= 12;
  const passphrasesMatch = passphrase === confirm;
  const canProceedStep2 = passphraseValid && passphrasesMatch;

  const handleSetup = useCallback(async () => {
    setLoading(true);
    setError("");

    const code = await setupEncryption(passphrase);

    if (code) {
      setRecoveryCode(code);
      setStep(3);
    } else {
      setError("Something went wrong setting up note locking. Please try again.");
    }

    setLoading(false);
  }, [passphrase, setupEncryption]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(recoveryCode).catch(() => {
      // Clipboard API may not be available — user can manually copy
    });
  }, [recoveryCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-edge bg-panel p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Set up note locking"
      >
        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-heading">Lock your notes</h2>
            <p className="text-sm text-body leading-relaxed">
              Create a passphrase to lock your private notes. Only you will be
              able to read them — not even we can see what you write.
            </p>
            <details className="text-xs text-muted">
              <summary className="cursor-pointer hover:text-heading">
                Learn more
              </summary>
              <p className="mt-2 leading-relaxed">
                Your notes are scrambled on your device before they leave. The
                passphrase creates a unique key that only exists in your browser.
                Without the passphrase, the scrambled text is unreadable.
              </p>
            </details>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border border-input-border bg-panel px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Passphrase */}
        {step === 2 && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canProceedStep2) handleSetup();
            }}
          >
            <h2 className="text-xl font-semibold text-heading">
              Choose a passphrase
            </h2>
            <p className="text-xs text-muted">
              At least 12 characters. Your browser will offer to save this for you.
            </p>

            <div>
              <label htmlFor="oeb-encryption-passphrase" className="block text-sm font-medium text-heading mb-1">
                Passphrase
              </label>
              <input
                id="oeb-encryption-passphrase"
                name="encryption-passphrase"
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-heading placeholder:text-faint focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Enter a passphrase..."
              />
              {passphrase.length > 0 && !passphraseValid && (
                <p className="mt-1 text-xs text-danger">
                  At least 12 characters needed ({passphrase.length}/12)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="oeb-encryption-confirm" className="block text-sm font-medium text-heading mb-1">
                Confirm passphrase
              </label>
              <input
                id="oeb-encryption-confirm"
                name="encryption-passphrase-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-heading placeholder:text-faint focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Confirm your passphrase..."
              />
              {confirm.length > 0 && !passphrasesMatch && (
                <p className="mt-1 text-xs text-danger">
                  Passphrases don&apos;t match
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-input-border bg-panel px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canProceedStep2 || loading}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Setting up..." : "Continue"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Recovery Code */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-heading">
              Your recovery code
            </h2>
            <p className="text-sm text-body leading-relaxed">
              Save this code somewhere safe. If you forget your passphrase,
              this is the only way to get back into your locked notes.
            </p>

            <div className="rounded-lg border border-edge bg-surface-alt p-4 text-center">
              <code className="text-lg font-mono font-bold tracking-wider text-heading select-all">
                {recoveryCode}
              </code>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full rounded-lg border border-input-border bg-panel px-4 py-2 text-sm font-medium text-heading hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Copy to clipboard
            </button>

            <p className="text-xs text-danger leading-relaxed">
              If you lose both your passphrase and this code, your locked notes
              will be permanently unreadable. We cannot recover them for you.
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input-border text-accent focus:ring-ring"
              />
              <span className="text-sm text-body">
                I have saved my recovery code
              </span>
            </label>

            <button
              type="button"
              disabled={!acknowledged}
              onClick={onComplete}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finish setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── UnlockPrompt (returning user passphrase entry) ──

interface UnlockPromptProps {
  /** Called when unlock succeeds */
  onUnlocked: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

export function UnlockPrompt({ onUnlocked, onCancel }: UnlockPromptProps) {
  const { unlock } = useEncryption();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!passphrase) return;

      setLoading(true);
      setError("");

      const success = await unlock(passphrase);

      if (success) {
        onUnlocked();
      } else {
        setError("That passphrase didn't work. Please try again.");
      }

      setLoading(false);
    },
    [passphrase, unlock, onUnlocked],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4">
      <div
        className="w-full max-w-sm rounded-xl border border-edge bg-panel p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Unlock your notes"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold text-heading">
            Unlock your notes
          </h2>
          <p className="text-sm text-muted">
            Enter your passphrase to read and edit locked notes.
          </p>

          <div>
            <label htmlFor="oeb-unlock-passphrase" className="sr-only">
              Passphrase
            </label>
            <input
              id="oeb-unlock-passphrase"
              name="encryption-passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-heading placeholder:text-faint focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter your passphrase..."
            />
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-input-border bg-panel px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!passphrase || loading}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Unlocking..." : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
