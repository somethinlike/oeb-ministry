/**
 * EncryptionSetup — multi-step wizard for first-time note locking.
 *
 * Three steps:
 * 1. Introduction — explains what locking does (Tier 1 language)
 * 2. Passphrase — enter + confirm, with autocomplete for credential managers
 * 3. Recovery code — shown once, must acknowledge before finishing
 *
 * Credential manager integration:
 * - Both forms include a read-only email field (`autocomplete="username"`)
 *   so managers can index the passphrase against the user's identity.
 * - Setup form uses `autocomplete="new-password"` (triggers "save password" prompt).
 * - Unlock form uses `autocomplete="current-password"` (triggers autofill).
 * - Field `name` attributes use standard values ("username", "password")
 *   for maximum compatibility across Chrome, Firefox, Safari/iOS Keychain,
 *   Android autofill, Bitwarden, 1Password, and LastPass.
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
  const { setupEncryption, userEmail } = useEncryption();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    navigator.clipboard.writeText(recoveryCode)
      .then(() => setCopied(true))
      .catch(() => {
        // Clipboard API may not be available — user can manually copy
      });
  }, [recoveryCode]);

  /** Download the recovery code as a plain text file */
  const handleDownloadCode = useCallback(() => {
    const content = [
      "OEB Ministry — Recovery Code",
      "=============================",
      "",
      `Account: ${userEmail ?? "Unknown"}`,
      `Date: ${new Date().toLocaleDateString()}`,
      "",
      `Recovery Code: ${recoveryCode}`,
      "",
      "Keep this file somewhere safe. If you forget your",
      "passphrase, this code is the only way to recover",
      "your locked notes.",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "oeb-ministry-recovery-code.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [recoveryCode, userEmail]);

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

        {/* Step 2: Passphrase
            The form structure is designed for maximum credential manager compatibility:
            - Read-only email field (autocomplete="username") gives managers an identity to index
            - Password field (autocomplete="new-password") triggers "save password" prompts
            - Standard name attributes ("username", "new-password") for heuristic-based managers
            - Form submit event fires even with preventDefault — browsers hook before the handler */}
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

            {/* Email field — read-only, gives credential managers an identity to index.
                Uses autocomplete="username" so managers pair it with the password below.
                Visually styled as informational text, not an editable input. */}
            {userEmail && (
              <div>
                <label htmlFor="oeb-encryption-email" className="block text-xs text-muted mb-1">
                  Account
                </label>
                <input
                  id="oeb-encryption-email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  value={userEmail}
                  readOnly
                  tabIndex={-1}
                  className="w-full rounded-lg border border-edge bg-surface-alt px-3 py-2 text-sm text-muted cursor-default focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="oeb-encryption-passphrase" className="block text-sm font-medium text-heading mb-1">
                Passphrase
              </label>
              <input
                id="oeb-encryption-passphrase"
                name="new-password"
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
                name="new-password-confirm"
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

            {/* Two save options: clipboard + download file.
                The download gives a belt-and-suspenders fallback for users
                who don't have a password manager or want a local backup. */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 rounded-lg border border-input-border bg-panel px-4 py-2 text-sm font-medium text-heading hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <button
                type="button"
                onClick={handleDownloadCode}
                className="flex-1 rounded-lg border border-input-border bg-panel px-4 py-2 text-sm font-medium text-heading hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                Download as file
              </button>
            </div>

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
  const { unlock, userEmail } = useEncryption();
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
        {/* Form with email + password fields for credential manager autofill.
            autocomplete="current-password" tells managers this is a login/unlock form
            (vs "new-password" which means registration). */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold text-heading">
            Unlock your notes
          </h2>
          <p className="text-sm text-muted">
            Enter your passphrase to read and edit locked notes.
          </p>

          {/* Email field — read-only, enables credential manager autofill.
              Without this, Chrome/Safari/iOS won't know which saved credential to offer. */}
          {userEmail && (
            <input
              name="username"
              type="email"
              autoComplete="username"
              value={userEmail}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
          )}

          <div>
            <label htmlFor="oeb-unlock-passphrase" className="sr-only">
              Passphrase
            </label>
            <input
              id="oeb-unlock-passphrase"
              name="password"
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
