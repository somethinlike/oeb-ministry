/**
 * PublishedDevotionalsFeed — browse published devotional bibles from the community.
 *
 * Grandmother Principle:
 * - "Community Devotionals" not "Published Devotional Bible Feed"
 * - Simple cards with title, author, note count, fork count
 * - "Make your own copy" not "Fork this devotional"
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  getPublishedDevotionalBibles,
  forkDevotionalBible,
  getForkCount,
} from "../lib/devotional-bibles";
import { getProfileSlugsForUsers } from "../lib/user-profiles";
import { SUPPORTED_TRANSLATIONS } from "../lib/constants";
import type { DevotionalBible } from "../types/devotional-bible";

interface PublishedDevotionalsFeedProps {
  userId: string | null;
}

export function PublishedDevotionalsFeed({ userId }: PublishedDevotionalsFeedProps) {
  const [devotionals, setDevotionals] = useState<DevotionalBible[]>([]);
  const [forkCounts, setForkCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTranslation, setFilterTranslation] = useState("");
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [authorSlugs, setAuthorSlugs] = useState<Map<string, string>>(new Map());

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPublishedDevotionalBibles(supabase, {
        translation: filterTranslation || undefined,
        limit: 50,
      });
      setDevotionals(result);

      // Load fork counts for each devotional
      const counts = new Map<string, number>();
      await Promise.all(
        result.map(async (d) => {
          try {
            const count = await getForkCount(supabase, d.id);
            counts.set(d.id, count);
          } catch {
            // Non-critical — skip silently
          }
        }),
      );
      setForkCounts(counts);

      // Load profile slugs for author linking (non-blocking)
      try {
        const userIds = [...new Set(result.map((d) => d.userId))];
        const slugs = await getProfileSlugsForUsers(supabase, userIds);
        setAuthorSlugs(slugs);
      } catch {
        // Non-critical
      }
    } catch {
      setError("Couldn't load community devotionals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filterTranslation]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleFork(devotionalId: string) {
    if (!userId) {
      setError("Sign in to make your own copy.");
      return;
    }
    setForkingId(devotionalId);
    setError(null);
    try {
      const forked = await forkDevotionalBible(supabase, userId, devotionalId);
      window.location.href = `/app/devotionals/${forked.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your copy. Please try again.");
      setForkingId(null);
    }
  }

  function translationName(translationId: string): string {
    const t = SUPPORTED_TRANSLATIONS.find((tr) => tr.id === translationId);
    return t?.abbreviation ?? translationId;
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="filter-translation" className="text-sm text-muted">
          Filter by translation:
        </label>
        <select
          id="filter-translation"
          value={filterTranslation}
          onChange={(e) => setFilterTranslation(e.target.value)}
          className="rounded-lg border border-input-border bg-panel px-3 py-1.5 text-sm
                     focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All translations</option>
          {SUPPORTED_TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.abbreviation} — {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3" role="status">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-edge p-4">
              <div className="h-5 w-48 rounded bg-edge mb-2" />
              <div className="h-3 w-full rounded bg-edge mb-1" />
              <div className="h-3 w-32 rounded bg-edge" />
            </div>
          ))}
          <span className="sr-only">Loading community devotionals...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && devotionals.length === 0 && (
        <p className="text-center text-muted py-8">
          No community devotionals available yet. Be the first to share one!
        </p>
      )}

      {/* Cards */}
      {!loading && devotionals.length > 0 && (
        <div className="space-y-3">
          {devotionals.map((d) => {
            const forks = forkCounts.get(d.id) ?? 0;
            return (
              <div
                key={d.id}
                className="rounded-lg border border-edge p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/app/community/devotionals/${d.id}`}
                      className="font-medium text-heading hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    >
                      {d.title}
                    </a>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                        ${d.type === "original"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        }`}>
                        {d.type === "original" ? "Original" : "Assembled"}
                      </span>
                      <span>{translationName(d.translation)}</span>
                      <span>{d.entryCount} note{d.entryCount !== 1 ? "s" : ""}</span>
                      {d.authorDisplayName && (
                        <span>
                          by{" "}
                          {authorSlugs.has(d.userId) ? (
                            <a
                              href={`/profile/${authorSlugs.get(d.userId)}`}
                              className="text-accent hover:text-accent-hover underline"
                            >
                              {d.authorDisplayName}
                            </a>
                          ) : (
                            d.authorDisplayName
                          )}
                        </span>
                      )}
                      {forks > 0 && (
                        <span title={`${forks} ${forks === 1 ? "person has" : "people have"} made a copy`}>
                          {forks} {forks === 1 ? "copy" : "copies"}
                        </span>
                      )}
                    </div>
                    {d.description && (
                      <p className="mt-1 text-sm text-muted line-clamp-2">{d.description}</p>
                    )}
                  </div>

                  {/* Fork button */}
                  {userId && (
                    <button
                      type="button"
                      onClick={() => handleFork(d.id)}
                      disabled={forkingId === d.id}
                      className="shrink-0 rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent
                                 hover:bg-accent-soft disabled:opacity-50
                                 focus:outline-none focus:ring-2 focus:ring-ring"
                      title="Create your own editable copy of this devotional"
                    >
                      {forkingId === d.id ? "Copying..." : "Make a copy"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
