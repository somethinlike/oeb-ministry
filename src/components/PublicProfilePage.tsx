/**
 * PublicProfilePage — displays a user's public profile with their
 * published annotations and devotional bibles.
 *
 * Grandmother Principle:
 * - "{Name}'s Profile" not "User Content Aggregation View"
 * - Simple card layout matching the community feed style
 * - "Notes" and "Devotionals" tabs for browsing their work
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  getProfileBySlug,
  getPublishedAnnotationsByUser,
  getPublishedDevotionalsByUser,
} from "../lib/user-profiles";
import type { UserProfile } from "../types/user-profile";
import { BOOK_BY_ID } from "../lib/constants";
import { SUPPORTED_TRANSLATIONS } from "../lib/constants";

interface PublicProfilePageProps {
  slug: string;
}

export function PublicProfilePage({ slug }: PublicProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [devotionals, setDevotionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "devotionals">("notes");

  useEffect(() => {
    loadProfile();
  }, [slug]);

  async function loadProfile() {
    setLoading(true);
    setNotFound(false);
    try {
      const p = await getProfileBySlug(supabase, slug);
      if (!p) {
        setNotFound(true);
        return;
      }
      setProfile(p);

      // Load their published content in parallel
      const [anns, devs] = await Promise.all([
        getPublishedAnnotationsByUser(supabase, p.userId),
        getPublishedDevotionalsByUser(supabase, p.userId),
      ]);
      setAnnotations(anns);
      setDevotionals(devs);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-muted/20 animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted/20 animate-pulse" />
        <div className="h-32 rounded bg-muted/20 animate-pulse" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-heading mb-2">Profile not found</h2>
        <p className="text-sm text-muted mb-4">
          This profile doesn&rsquo;t exist or has been removed.
        </p>
        <a
          href="/app/community"
          className="text-sm text-accent hover:text-accent-hover underline"
        >
          Browse community content
        </a>
      </div>
    );
  }

  function formatVerseRef(ann: any): string {
    const bookInfo = BOOK_BY_ID.get(ann.book);
    const name = bookInfo?.name ?? ann.book;
    return ann.verse_start === ann.verse_end
      ? `${name} ${ann.chapter}:${ann.verse_start}`
      : `${name} ${ann.chapter}:${ann.verse_start}-${ann.verse_end}`;
  }

  function truncate(text: string, max = 200): string {
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "\u2026";
  }

  function translationName(abbr: string): string {
    return SUPPORTED_TRANSLATIONS.find((t) => t.id === abbr)?.name ?? abbr.toUpperCase();
  }

  const noteCount = annotations.length;
  const devCount = devotionals.length;

  return (
    <div className="space-y-6">
      {/* ── Profile header ── */}
      <div className="flex items-start gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={`${profile.displayName}'s avatar`}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-medium text-on-accent">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-heading">{profile.displayName}</h2>
          {profile.bio && (
            <p className="text-sm text-muted mt-1 max-w-lg">{profile.bio}</p>
          )}
          <p className="text-xs text-faint mt-2">
            Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-edge">
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-heading"
          }`}
        >
          Notes{noteCount > 0 ? ` (${noteCount})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("devotionals")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "devotionals"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-heading"
          }`}
        >
          Devotionals{devCount > 0 ? ` (${devCount})` : ""}
        </button>
      </div>

      {/* ── Notes tab ── */}
      {activeTab === "notes" && (
        <div className="space-y-3">
          {noteCount === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              {profile.displayName} hasn&rsquo;t shared any notes yet.
            </p>
          ) : (
            annotations.map((ann: any) => (
              <div
                key={ann.id}
                className="rounded-lg border border-edge bg-surface p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-heading">
                    {formatVerseRef(ann)}
                  </h3>
                </div>
                <p className="text-sm text-body leading-relaxed">
                  {truncate(ann.content_md)}
                </p>
                {ann.published_at && (
                  <p className="text-xs text-faint">
                    {new Date(ann.published_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Devotionals tab ── */}
      {activeTab === "devotionals" && (
        <div className="space-y-3">
          {devCount === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              {profile.displayName} hasn&rsquo;t shared any devotionals yet.
            </p>
          ) : (
            devotionals.map((d: any) => (
              <a
                key={d.id}
                href={`/app/community/devotionals/${d.id}`}
                className="block rounded-lg border border-edge bg-surface p-4 space-y-2
                           hover:border-accent/50 transition-colors"
              >
                <h3 className="font-semibold text-heading">{d.title}</h3>
                {d.description && (
                  <p className="text-sm text-muted">{truncate(d.description, 150)}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-faint">
                  <span className="rounded bg-muted/20 px-1.5 py-0.5 font-medium">
                    {d.type === "original" ? "Original" : "Assembled"}
                  </span>
                  <span>{translationName(d.translation)}</span>
                  <span>{d.entry_count} note{d.entry_count !== 1 ? "s" : ""}</span>
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
