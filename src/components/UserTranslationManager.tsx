/**
 * UserTranslationManager — lists and manages user-uploaded translations.
 *
 * Shows in the Settings page. Displays each uploaded translation with
 * its book count and a delete button.
 *
 * Grandmother Principle:
 * - Clear list with obvious actions
 * - Confirmation before deleting
 * - Shows upload date and book count for context
 */

import { useState, useEffect } from "react";
import type { UserTranslationManifest, StoredUserChapter } from "../types/user-translation";
import {
  getUserTranslationManifests,
  getUserTranslationManifest,
  deleteUserTranslation,
} from "../lib/user-translations";
import { getBackupStatus, backupTranslation, deleteBackup, type TranslationBackup } from "../lib/translation-backup";
import { supabase } from "../lib/supabase";
import { getDb } from "../lib/idb";

interface UserTranslationManagerProps {
  /** Trigger a refresh of the list (increment to refresh) */
  refreshKey: number;
  /** User ID (needed for backup features) */
  userId?: string | null;
  /** CryptoKey for encrypting backups */
  cryptoKey?: CryptoKey | null;
  /** Whether the user has the required role for backup */
  canBackup?: boolean;
}

export function UserTranslationManager({ refreshKey, userId, cryptoKey, canBackup }: UserTranslationManagerProps) {
  const [manifests, setManifests] = useState<UserTranslationManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Backup status: map from translation ID to backup info
  const [backupMap, setBackupMap] = useState<Map<string, TranslationBackup>>(new Map());
  const [backingUpId, setBackingUpId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getUserTranslationManifests()
      .then(async (m) => {
        setManifests(m);
        // Fetch backup status if user has backup capability
        if (userId && canBackup && m.length > 0) {
          const status = await getBackupStatus(supabase, userId, m.map((x) => x.translation));
          setBackupMap(status);
        }
      })
      .catch(() => setManifests([]))
      .finally(() => setLoading(false));
  }, [refreshKey, userId, canBackup]);

  async function handleDelete(translationId: string) {
    setDeletingId(translationId);
    try {
      // Delete server backup too, if it exists
      const backup = backupMap.get(translationId);
      if (backup && userId) {
        await deleteBackup(supabase, userId, backup.id).catch(() => {});
      }
      await deleteUserTranslation(translationId);
      setManifests((prev) => prev.filter((m) => m.translation !== translationId));
      setBackupMap((prev) => {
        const next = new Map(prev);
        next.delete(translationId);
        return next;
      });
    } catch {
      // Silently fail — the translation will remain in the list
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleBackup(translationId: string) {
    if (!userId || !cryptoKey) return;
    setBackingUpId(translationId);
    try {
      const manifest = await getUserTranslationManifest(translationId);
      if (!manifest) return;
      const db = await getDb();
      const index = db.transaction("user-translation-chapters", "readonly").store.index("by-translation");
      const allChapters: StoredUserChapter[] = await index.getAll(translationId);
      await backupTranslation(supabase, userId, manifest, allChapters, cryptoKey);
      // Refresh backup status
      const status = await getBackupStatus(supabase, userId, manifests.map((m) => m.translation));
      setBackupMap(status);
    } catch {
      // Silently fail
    } finally {
      setBackingUpId(null);
    }
  }

  if (loading) {
    return (
      <div className="py-4 text-sm text-muted" role="status">
        Loading your translations...
      </div>
    );
  }

  if (manifests.length === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No uploaded translations yet. Upload one below.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-edge" aria-label="Your uploaded translations">
      {manifests.map((m) => {
        const isConfirming = confirmDeleteId === m.translation;
        const isDeleting = deletingId === m.translation;

        const isBackedUp = backupMap.has(m.translation);
        const isBackingUp = backingUpId === m.translation;

        return (
          <li key={m.translation} className="flex items-center justify-between py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate">
                <span className="font-semibold">{m.abbreviation}</span>
                {" — "}
                {m.name}
              </p>
              <p className="text-xs text-muted">
                {m.books.length} books
                {m.uploadedAt && (
                  <>
                    {" · "}
                    Uploaded {new Date(m.uploadedAt).toLocaleDateString()}
                  </>
                )}
                {/* Backup status indicator (only for users with backup capability) */}
                {canBackup && isBackedUp && (
                  <>
                    {" · "}
                    <span className="inline-flex items-center gap-0.5 text-green-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                      </svg>
                      Backed up
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Back up button (shown for users with backup role + encryption, if not yet backed up) */}
              {canBackup && cryptoKey && !isBackedUp && (
                <button
                  type="button"
                  onClick={() => handleBackup(m.translation)}
                  disabled={isBackingUp}
                  className="rounded px-2 py-1 text-xs font-medium text-accent hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  aria-label={`Back up ${m.name}`}
                  title="Save an encrypted copy to your account"
                >
                  {isBackingUp ? "Backing up..." : "Back up"}
                </button>
              )}
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Delete?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.translation)}
                    disabled={isDeleting}
                    className="rounded px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    aria-label={`Confirm delete ${m.name}`}
                  >
                    {isDeleting ? "Deleting..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded px-2 py-1 text-xs font-medium text-muted hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Cancel delete"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(m.translation)}
                  className="rounded p-1.5 text-faint hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Delete ${m.name}`}
                  title="Delete this translation"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
