/**
 * BookPicker — displays Bible books grouped by section.
 *
 * Groups books into Old Testament, Deuterocanon, and New Testament.
 * The Deuterocanon section only appears for translations that include
 * those books. Protestant-only Bibles just show OT and NT.
 *
 * Grandmother Principle:
 * - Large buttons for each book (easy to tap on mobile)
 * - Grouped with clear headers
 * - Simple filter/search bar at the top
 * - No jargon — Deuterocanon is labeled "Deuterocanon & Apocrypha"
 *   with a brief explanation available
 * - "Save offline" button on each book tile
 */

import { useState, useEffect } from "react";
import { BOOKS } from "../lib/constants";
import type { BookInfo } from "../types/bible";
import { cacheBookOffline, isBookCached } from "../lib/offline-books";
import { useHydrated } from "../hooks/useHydrated";
import { isUserTranslation, getUserTranslationManifest } from "../lib/user-translations";

interface BookPickerProps {
  translation: string;
}

export function BookPicker({ translation }: BookPickerProps) {
  const [filter, setFilter] = useState("");
  // For user translations, book list comes from IndexedDB manifest
  const [userBooks, setUserBooks] = useState<BookInfo[] | null>(null);

  useEffect(() => {
    if (!isUserTranslation(translation)) return;
    getUserTranslationManifest(translation)
      .then((manifest) => setUserBooks(manifest?.books ?? []))
      .catch(() => setUserBooks([]));
  }, [translation]);

  // Use user books if this is a user translation, otherwise the built-in BOOKS list
  const allBooks = isUserTranslation(translation)
    ? (userBooks ?? [])
    : BOOKS;

  const filteredBooks = allBooks.filter((book) =>
    book.name.toLowerCase().includes(filter.toLowerCase()),
  );

  // Group by testament section
  const otBooks = filteredBooks.filter((b) => b.testament === "OT");
  const dcBooks = filteredBooks.filter((b) => b.testament === "DC");
  const ntBooks = filteredBooks.filter((b) => b.testament === "NT");

  return (
    <div>
      {/* Search/filter bar */}
      <div className="mb-6">
        <label htmlFor="book-search" className="sr-only">
          Search for a book
        </label>
        <input
          id="book-search"
          type="search"
          placeholder="Search for a book..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-input-border px-4 py-3 text-lg
                     focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          autoComplete="off"
        />
      </div>

      {/* Old Testament */}
      {otBooks.length > 0 && (
        <section aria-labelledby="ot-heading">
          <h2
            id="ot-heading"
            className="mb-3 text-lg font-semibold text-body"
          >
            Old Testament
          </h2>
          <BookGrid books={otBooks} translation={translation} />
        </section>
      )}

      {/* Deuterocanon — only shown if the translation includes these books */}
      {dcBooks.length > 0 && (
        <section aria-labelledby="dc-heading" className="mt-8">
          <h2
            id="dc-heading"
            className="mb-1 text-lg font-semibold text-body"
          >
            Deuterocanon &amp; Apocrypha
          </h2>
          <p className="mb-3 text-sm text-muted">
            Additional books recognized by Catholic and Orthodox traditions
          </p>
          <BookGrid books={dcBooks} translation={translation} />
        </section>
      )}

      {/* New Testament */}
      {ntBooks.length > 0 && (
        <section aria-labelledby="nt-heading" className="mt-8">
          <h2
            id="nt-heading"
            className="mb-3 text-lg font-semibold text-body"
          >
            New Testament
          </h2>
          <BookGrid books={ntBooks} translation={translation} />
        </section>
      )}

      {/* No results message */}
      {filteredBooks.length === 0 && (
        <p className="text-center text-muted py-8">
          No books match &quot;{filter}&quot;
        </p>
      )}
    </div>
  );
}

/** Grid of book buttons — reused for OT, DC, and NT sections. */
function BookGrid({
  books,
  translation,
}: {
  books: BookInfo[];
  translation: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <BookTile key={book.id} book={book} translation={translation} />
      ))}
    </div>
  );
}

/** Single book tile with navigation link and offline save button. */
function BookTile({
  book,
  translation,
}: {
  book: BookInfo;
  translation: string;
}) {
  const hydrated = useHydrated();
  const [cached, setCached] = useState<boolean | null>(null);
  const [caching, setCaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check cache state on mount
  useEffect(() => {
    if (typeof caches === "undefined") return;
    isBookCached(translation, book.id, book.chapters).then(setCached);
  }, [translation, book.id, book.chapters]);

  // Auto-dismiss error after 4 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleSaveOffline(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (caching || cached) return;

    setError(null);
    setCaching(true);
    try {
      const chaptersStored = await cacheBookOffline(translation, book.id, book.chapters);
      if (chaptersStored === 0) {
        setError("This book isn't available yet in this translation");
      } else {
        setCached(chaptersStored === book.chapters);
      }
    } catch {
      setError("Something went wrong. Try again?");
    } finally {
      setCaching(false);
    }
  }

  return (
    <div className="relative">
      <a
        href={`/app/read/${translation}/${book.id}`}
        className="block rounded-lg border border-edge bg-panel px-4 py-3 pr-10
                   text-center font-medium text-body
                   hover:border-accent hover:bg-accent-soft hover:text-accent
                   focus:outline-none focus:ring-2 focus:ring-ring
                   transition-colors duration-150"
      >
        {book.name}
        <span className="block text-xs text-faint mt-0.5">
          {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
        </span>
      </a>
      {/* Error tooltip — shown briefly when book has no available chapters */}
      {error && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-10
                     rounded-lg bg-red-50 border border-red-200 px-3 py-1.5
                     text-xs text-red-700 whitespace-nowrap shadow-sm"
          role="alert"
        >
          {error}
        </div>
      )}
      {/* Save offline button — top-right corner */}
      {hydrated && typeof caches !== "undefined" && (
        <button
          type="button"
          onClick={handleSaveOffline}
          disabled={caching || cached === true}
          className="absolute top-1.5 right-1.5 p-1 rounded text-faint hover:text-accent
                     focus:outline-none focus:ring-2 focus:ring-ring
                     disabled:cursor-default"
          aria-label={cached ? `${book.name} saved offline` : `Save ${book.name} for offline reading`}
          title={cached ? "Saved offline" : "Save for offline reading"}
        >
          {caching ? (
            /* Spinner */
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
            </svg>
          ) : cached ? (
            /* Checkmark — cached */
            <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            /* Download icon — not cached */
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
