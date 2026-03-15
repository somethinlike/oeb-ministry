/**
 * UserTranslationGrid — client-side grid of user-uploaded Bible translations.
 *
 * Renders on the "Choose a Bible" page (/app/read) as a React island.
 * Loads manifests from IndexedDB and displays cards matching the built-in
 * translation grid style. Only renders if the user has uploaded translations.
 */

import { useState, useEffect } from "react";
import { getUserTranslationManifests } from "../lib/user-translations";
import type { UserTranslationManifest } from "../types/user-translation";

export function UserTranslationGrid() {
  const [translations, setTranslations] = useState<UserTranslationManifest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getUserTranslationManifests()
      .then((manifests) => {
        setTranslations(manifests);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Don't render anything until we've checked IndexedDB
  if (!loaded || translations.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-heading mb-4">Your Translations</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {translations.map((t) => (
          <a
            key={t.translation}
            href={`/app/read/${t.translation}`}
            className="rounded-lg border border-edge bg-panel p-6
                       hover:border-accent hover:bg-accent-soft
                       focus:outline-none focus:ring-2 focus:ring-ring
                       transition-colors duration-150"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-heading">{t.name}</h3>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                {t.abbreviation}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">{t.license}</p>
            <p className="text-xs text-faint mt-1">
              {t.books.length} books · Uploaded {new Date(t.uploadedAt).toLocaleDateString()}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
