/**
 * DevotionalList — displays the user's devotional bible collections.
 *
 * Grandmother Principle:
 * - "My Devotionals" not "Devotional Bible Collections"
 * - "notes" not "annotations" or "entries"
 * - Simple cards with title, type badge, and note count
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getDevotionalBibles } from "../lib/devotional-bibles";
import { SUPPORTED_TRANSLATIONS } from "../lib/constants";
import type { AuthState } from "../types/auth";
import type { DevotionalBible } from "../types/devotional-bible";

interface DevotionalListProps {
  auth: AuthState;
}

export function DevotionalList({ auth }: DevotionalListProps) {
  const [devotionals, setDevotionals] = useState<DevotionalBible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevotionals();
  }, []);

  async function loadDevotionals() {
    setLoading(true);
    try {
      const data = await getDevotionalBibles(supabase, auth.userId!);
      setDevotionals(data);
    } catch {
      setError("Couldn't load your devotionals. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function translationName(translationId: string): string {
    const t = SUPPORTED_TRANSLATIONS.find((tr) => tr.id === translationId);
    return t?.abbreviation ?? translationId;
  }

  return (
    <div>
      {/* Create button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-heading">My Devotionals</h2>
        <a
          href="/app/devotionals/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent
                     hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
        >
          + New devotional
        </a>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3" role="status">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-edge p-4">
              <div className="h-5 w-48 rounded bg-edge mb-2" />
              <div className="h-3 w-full rounded bg-edge" />
            </div>
          ))}
          <span className="sr-only">Loading devotionals...</span>
        </div>
      )}

      {/* Devotional cards */}
      {!loading && devotionals.length > 0 && (
        <div className="space-y-3">
          {devotionals.map((d) => (
            <a
              key={d.id}
              href={`/app/devotionals/${d.id}`}
              className="block rounded-lg border border-edge p-4 transition-colors
                         hover:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-heading">{d.title}</span>
                  <TypeBadge type={d.type} />
                  {d.publishStatus && <StatusBadge status={d.publishStatus} />}
                </div>
                <span className="text-xs text-faint">
                  {new Date(d.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span>{translationName(d.translation)}</span>
                <span aria-label={`${d.entryCount} notes`}>
                  {d.entryCount} note{d.entryCount !== 1 ? "s" : ""}
                </span>
              </div>
              {d.description && (
                <p className="mt-1 text-sm text-muted line-clamp-2">{d.description}</p>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && devotionals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted">
            You haven&apos;t created any devotionals yet.
          </p>
          <p className="mt-2 text-sm text-faint">
            A devotional is a collection of your notes, organized into a study guide.
          </p>
          <a
            href="/app/devotionals/new"
            className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-medium text-on-accent
                       hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Create your first devotional
          </a>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isOriginal = type === "original";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                  ${isOriginal
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  }`}
      title={isOriginal ? "All notes are yours" : "Notes from you and the community"}
    >
      {isOriginal ? "Original" : "Assembled"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  const labels: Record<string, string> = {
    pending: "Waiting for review",
    approved: "Published",
    rejected: "Changes needed",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
