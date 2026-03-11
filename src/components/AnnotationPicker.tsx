/**
 * AnnotationPicker — modal for browsing and selecting annotations
 * to add to a devotional bible.
 *
 * Two tabs:
 * - "My Notes": user's own annotations (always shown)
 * - "Community Notes": public CC0 annotations (only for "assembled" type)
 *
 * Grandmother Principle:
 * - "Pick notes to add" not "Select annotations for inclusion"
 * - Already-added notes shown with a check mark
 * - Simple search bar at top
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { searchAnnotations, getPublicFeedAnnotations, searchPublicAnnotations } from "../lib/annotations";
import { BOOK_BY_ID } from "../lib/constants";
import type { Annotation } from "../types/annotation";
import type { DevotionalBibleType } from "../types/devotional-bible";
import type { BookId } from "../types/bible";

interface AnnotationPickerProps {
  devotionalBibleId: string;
  devotionalType: DevotionalBibleType;
  userId: string;
  existingEntryAnnotationIds: Set<string>;
  onAdd: (annotationIds: string[]) => void;
  onClose: () => void;
}

type Tab = "mine" | "community";

export function AnnotationPicker({
  devotionalType,
  userId,
  existingEntryAnnotationIds,
  onAdd,
  onClose,
}: AnnotationPickerProps) {
  const showCommunityTab = devotionalType === "assembled";
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAnnotations = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "mine") {
        if (query.trim()) {
          const results = await searchAnnotations(supabase, userId, query);
          setAnnotations(results);
        } else {
          // Load recent own annotations
          const { data } = await supabase
            .from("annotations")
            .select("*")
            .eq("user_id", userId)
            .is("deleted_at", null)
            .eq("is_encrypted", false)
            .order("updated_at", { ascending: false })
            .limit(30);

          setAnnotations(
            (data ?? []).map((row) => ({
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
            })),
          );
        }
      } else {
        // Community tab
        if (query.trim()) {
          const results = await searchPublicAnnotations(supabase, query);
          setAnnotations(results);
        } else {
          const results = await getPublicFeedAnnotations(supabase, { limit: 30 });
          setAnnotations(results);
        }
      }
    } catch {
      // Silently fail — user can retry by searching
    } finally {
      setLoading(false);
    }
  }, [activeTab, query, userId]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  function toggleSelection(id: string) {
    if (existingEntryAnnotationIds.has(id)) return; // Can't select already-added
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatVerseRef(annotation: Annotation): string {
    const bookInfo = BOOK_BY_ID.get(annotation.anchor.book);
    const name = bookInfo?.name ?? annotation.anchor.book;
    return annotation.anchor.verseStart === annotation.anchor.verseEnd
      ? `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}`
      : `${name} ${annotation.anchor.chapter}:${annotation.anchor.verseStart}-${annotation.anchor.verseEnd}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadAnnotations();
  }

  const selectableCount = selectedIds.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pick notes to add"
    >
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl bg-panel border border-edge shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h3 className="text-lg font-bold text-heading">Add notes</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:text-heading focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {showCommunityTab && (
          <div className="flex border-b border-edge">
            <TabButton
              label="My Notes"
              active={activeTab === "mine"}
              onClick={() => { setActiveTab("mine"); setQuery(""); }}
            />
            <TabButton
              label="Community Notes"
              active={activeTab === "community"}
              onClick={() => { setActiveTab("community"); setQuery(""); }}
            />
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 px-4 py-3 border-b border-edge">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeTab === "mine" ? "Search your notes..." : "Search community notes..."}
            className="flex-1 rounded-lg border border-input-border px-3 py-2 text-sm
                       focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent
                       hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Search
          </button>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-2" role="status">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="animate-pulse rounded border border-edge p-3">
                  <div className="h-3 w-32 rounded bg-edge mb-1.5" />
                  <div className="h-2 w-full rounded bg-edge" />
                </div>
              ))}
              <span className="sr-only">Loading notes...</span>
            </div>
          ) : annotations.length === 0 ? (
            <p className="text-center text-muted py-8">
              {query ? "No notes match your search." : "No notes available."}
            </p>
          ) : (
            <div className="space-y-2">
              {annotations.map((ann) => {
                const alreadyAdded = existingEntryAnnotationIds.has(ann.id);
                const isSelected = selectedIds.has(ann.id);
                return (
                  <label
                    key={ann.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer
                      ${alreadyAdded
                        ? "border-edge bg-surface-alt opacity-60 cursor-default"
                        : isSelected
                          ? "border-accent bg-accent-soft"
                          : "border-edge hover:border-accent"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={alreadyAdded || isSelected}
                      disabled={alreadyAdded}
                      onChange={() => toggleSelection(ann.id)}
                      className="mt-0.5 h-4 w-4 rounded border-input-border accent-accent"
                      aria-label={`${alreadyAdded ? "Already added" : "Select"} ${formatVerseRef(ann)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-heading text-sm">{formatVerseRef(ann)}</span>
                        {alreadyAdded && (
                          <span className="text-xs text-faint">Already added</span>
                        )}
                        {activeTab === "community" && ann.authorDisplayName && (
                          <span className="text-xs text-faint">by {ann.authorDisplayName}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted line-clamp-1 mt-0.5">{ann.contentMd}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-edge px-4 py-3">
          <span className="text-sm text-muted">
            {selectableCount > 0 ? `${selectableCount} selected` : "Select notes to add"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-input-border px-4 py-2 text-sm text-body
                         hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onAdd(Array.from(selectedIds))}
              disabled={selectableCount === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent
                         hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Add {selectableCount > 0 ? `${selectableCount} note${selectableCount !== 1 ? "s" : ""}` : "notes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors
        ${active
          ? "border-b-2 border-accent text-heading"
          : "text-muted hover:text-heading"
        }`}
      role="tab"
      aria-selected={active}
    >
      {label}
    </button>
  );
}
