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
import type { UserTranslationManifest } from "../types/user-translation";
import {
  getUserTranslationManifests,
  deleteUserTranslation,
} from "../lib/user-translations";

interface UserTranslationManagerProps {
  /** Trigger a refresh of the list (increment to refresh) */
  refreshKey: number;
}

export function UserTranslationManager({ refreshKey }: UserTranslationManagerProps) {
  const [manifests, setManifests] = useState<UserTranslationManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getUserTranslationManifests()
      .then(setManifests)
      .catch(() => setManifests([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleDelete(translationId: string) {
    setDeletingId(translationId);
    try {
      await deleteUserTranslation(translationId);
      setManifests((prev) => prev.filter((m) => m.translation !== translationId));
    } catch {
      // Silently fail — the translation will remain in the list
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
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
              </p>
            </div>

            <div className="shrink-0">
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
