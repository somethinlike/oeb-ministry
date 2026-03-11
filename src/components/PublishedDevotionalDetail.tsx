/**
 * PublishedDevotionalDetail — read-only view of a published devotional bible.
 *
 * Shows the full list of annotations in order. Visitors can read
 * all entries and fork ("make a copy") to their own account.
 *
 * Grandmother Principle:
 * - "Make your own copy" not "Fork this devotional"
 * - Clean, readable layout — no editing controls
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  getDevotionalBibleWithEntries,
  forkDevotionalBible,
  getForkCount,
} from "../lib/devotional-bibles";
import { SUPPORTED_TRANSLATIONS, BOOK_BY_ID } from "../lib/constants";
import type { DevotionalBibleWithEntries } from "../types/devotional-bible";
import type { Annotation } from "../types/annotation";
import type { BookId } from "../types/bible";

interface PublishedDevotionalDetailProps {
  devotionalId: string;
  userId: string | null;
}

export function PublishedDevotionalDetail({ devotionalId, userId }: PublishedDevotionalDetailProps) {
  const [devotional, setDevotional] = useState<DevotionalBibleWithEntries | null>(null);
  const [entryAnnotations, setEntryAnnotations] = useState<Map<string, Annotation>>(new Map());
  const [forkCount, setForkCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forking, setForking] = useState(false);

  const loadDevotional = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDevotionalBibleWithEntries(supabase, devotionalId);
      if (!data || !data.isPublished || data.publishStatus !== "approved") {
        window.location.href = "/app/community";
        return;
      }
      setDevotional(data);

      // Load annotation details
      if (data.entries.length > 0) {
        const ids = data.entries.map((e) => e.annotationId);
        const { data: annotations } = await supabase
          .from("annotations")
          .select("*")
          .in("id", ids);

        const map = new Map<string, Annotation>();
        for (const row of annotations ?? []) {
          map.set(row.id, {
            id: row.id,
            userId: row.user_id,
            translation: row.translation,
            anchor: {
              book: row.book as BookId,
              chapter: row.chapter,
              verseStart: row.verse_start,
              verseEnd: row.verse_end,
            },
            contentMd: row.content_md,
            isPublic: row.is_public,
            isEncrypted: row.is_encrypted ?? false,
            encryptionIv: row.encryption_iv ?? null,
            crossReferences: [],
            verseText: row.verse_text ?? null,
            publishStatus: row.publish_status ?? null,
            publishedAt: row.published_at ?? null,
            rejectionReason: row.rejection_reason ?? null,
            authorDisplayName: row.author_display_name ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at,
          });
        }
        setEntryAnnotations(map);
      }

      // Load fork count
      const count = await getForkCount(supabase, devotionalId);
      setForkCount(count);
    } catch {
      setError("Couldn't load this devotional. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [devotionalId]);

  useEffect(() => {
    loadDevotional();
  }, [loadDevotional]);

  async function handleFork() {
    if (!userId) {
      window.location.href = `/auth/signin?returnUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setForking(true);
    setError(null);
    try {
      const forked = await forkDevotionalBible(supabase, userId, devotionalId);
      window.location.href = `/app/devotionals/${forked.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your copy. Please try again.");
      setForking(false);
    }
  }

  function formatVerseRef(annotation: Annotation): string {
    const bookInfo = BOOK_BY_ID.get(annotation.anchor.book);
    const name = bookInfo?.name ?? annotation.anchor.book;
    return annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
  }

  function translationName(translationId: string): string {
    const t = SUPPORTED_TRANSLATIONS.find((tr) => tr.id === translationId);
    return t?.name ?? translationId;
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status">
        <div className="animate-pulse h-8 w-64 rounded bg-edge" />
        <div className="animate-pulse h-4 w-96 rounded bg-edge" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-edge p-4">
              <div className="h-4 w-32 rounded bg-edge mb-2" />
              <div className="h-3 w-full rounded bg-edge" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading devotional...</span>
      </div>
    );
  }

  if (!devotional) return null;

  return (
    <div>
      {/* Back link */}
      <a
        href="/app/community"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-heading transition-colors mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Community
      </a>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-heading">{devotional.title}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
            ${devotional.type === "original"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            }`}>
            {devotional.type === "original" ? "Original" : "Assembled"}
          </span>
          <span>{translationName(devotional.translation)}</span>
          <span>{devotional.entryCount} note{devotional.entryCount !== 1 ? "s" : ""}</span>
          {devotional.authorDisplayName && (
            <span>by {devotional.authorDisplayName}</span>
          )}
          {forkCount > 0 && (
            <span>{forkCount} {forkCount === 1 ? "copy" : "copies"} made</span>
          )}
        </div>
        {devotional.description && (
          <p className="mt-2 text-muted">{devotional.description}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Fork button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleFork}
          disabled={forking}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent
                     hover:bg-accent-hover disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {forking ? "Creating your copy..." : "Make your own copy"}
        </button>
        <p className="mt-1 text-xs text-faint">
          Creates an editable copy in your devotionals that you can customize.
        </p>
      </div>

      {/* Entries */}
      {devotional.entries.length > 0 ? (
        <div className="space-y-3">
          {devotional.entries.map((entry, index) => {
            const annotation = entryAnnotations.get(entry.annotationId);
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-edge p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-faint font-mono">{index + 1}.</span>
                  {annotation ? (
                    <span className="font-medium text-heading text-sm">{formatVerseRef(annotation)}</span>
                  ) : (
                    <span className="text-sm text-faint italic">Loading...</span>
                  )}
                  {annotation?.authorDisplayName && annotation.userId !== devotional.userId && (
                    <span className="text-xs text-faint">by {annotation.authorDisplayName}</span>
                  )}
                </div>
                {annotation && (
                  <p className="text-sm text-body leading-relaxed">
                    {annotation.contentMd}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-muted py-8">This devotional has no entries.</p>
      )}
    </div>
  );
}
