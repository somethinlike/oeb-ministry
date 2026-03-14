/**
 * TranslationRestore — restores backed-up translations from Supabase.
 *
 * Shows a list of translations that exist in the user's server backup
 * but are missing from their local IndexedDB. Each can be restored
 * with one click (provided encryption is unlocked).
 *
 * Only rendered for admin/moderator users with encryption set up.
 *
 * Grandmother Principle:
 * - "Your backed-up Bibles" — clear heading, plain language
 * - Cloud icon indicates server backup
 * - "Restore" button per translation, progress feedback
 * - Explains what restore does in simple terms
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { listBackups, restoreTranslation, type TranslationBackup } from "../lib/translation-backup";
import { getUserTranslationManifests, saveUserTranslation } from "../lib/user-translations";
import { useEncryption } from "./EncryptionProvider";
import type { ParseResult } from "../types/user-translation";
import type { BookId, BookInfo } from "../types/bible";

interface TranslationRestoreProps {
  userId: string;
  /** Called after a translation is successfully restored to IndexedDB */
  onRestored: () => void;
}

export function TranslationRestore({ userId, onRestored }: TranslationRestoreProps) {
  const { cryptoKey, isUnlocked, hasEncryption } = useEncryption();
  const [backups, setBackups] = useState<TranslationBackup[]>([]);
  const [localIds, setLocalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // Fetch server backups and local translations on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [serverBackups, localManifests] = await Promise.all([
        listBackups(supabase, userId),
        getUserTranslationManifests(),
      ]);
      setBackups(serverBackups);
      setLocalIds(new Set(localManifests.map((m) => m.translation)));
    } catch {
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Only show backups that are NOT already in IndexedDB
  const restorableBackups = backups.filter((b) => !localIds.has(b.translationId));

  async function handleRestore(backup: TranslationBackup) {
    if (!cryptoKey) return;

    setRestoringId(backup.id);
    setError(null);
    setRestoredId(null);

    try {
      // Decrypt and fetch from Supabase
      const { manifest, chapters } = await restoreTranslation(
        supabase, userId, backup.id, cryptoKey,
      );

      // Build a ParseResult-compatible shape for saveUserTranslation.
      // Group chapters by book so saveUserTranslation can compute the book list.
      const bookMap = new Map<string, { bookId: BookId; originalName: string; chapters: { chapter: number; verses: typeof chapters[0]["verses"] }[] }>();
      for (const ch of chapters) {
        if (!bookMap.has(ch.book)) {
          bookMap.set(ch.book, {
            bookId: ch.book as BookId,
            originalName: ch.bookName,
            chapters: [],
          });
        }
        bookMap.get(ch.book)!.chapters.push({
          chapter: ch.chapter,
          verses: ch.verses,
        });
      }

      const parseResult: ParseResult = {
        books: Array.from(bookMap.values()),
        warnings: [],
      };

      await saveUserTranslation(manifest, parseResult);

      setRestoredId(backup.id);
      setLocalIds((prev) => new Set([...prev, backup.translationId]));
      onRestored();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong restoring this translation.",
      );
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) return null;

  // Nothing to show if there are no server backups at all
  if (backups.length === 0) return null;

  // All backups already exist locally
  if (restorableBackups.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted">
        {/* Cloud check icon */}
        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
        </svg>
        All backed-up translations are already on this device.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {restorableBackups.length === 1
          ? "1 backed-up translation can be restored to this device."
          : `${restorableBackups.length} backed-up translations can be restored to this device.`}
      </p>

      {!hasEncryption && (
        <p className="text-xs text-amber-600">
          Set up note locking in Security settings to restore your backed-up translations.
        </p>
      )}

      {hasEncryption && !isUnlocked && (
        <p className="text-xs text-amber-600">
          Enter your passphrase in Security settings to unlock and restore your translations.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <ul className="divide-y divide-edge" aria-label="Restorable translation backups">
        {restorableBackups.map((backup) => {
          const isRestoring = restoringId === backup.id;
          const justRestored = restoredId === backup.id;

          return (
            <li key={backup.id} className="flex items-center justify-between py-3 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-heading truncate">
                  {/* Cloud icon */}
                  <svg className="inline-block h-4 w-4 mr-1.5 text-accent align-text-bottom" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                  </svg>
                  <span className="font-semibold">{backup.abbreviation}</span>
                  {" — "}
                  {backup.name}
                </p>
                <p className="text-xs text-muted">
                  {(backup.books as BookInfo[]).length} books
                  {" · "}
                  Backed up {new Date(backup.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="shrink-0">
                {justRestored ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Restored
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRestore(backup)}
                    disabled={isRestoring || !isUnlocked || !cryptoKey}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Restore ${backup.name}`}
                  >
                    {isRestoring ? "Restoring..." : "Restore"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
