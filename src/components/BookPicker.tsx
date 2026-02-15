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
 */

import { useState } from "react";
import { BOOKS } from "../lib/constants";
import type { BookInfo } from "../types/bible";

interface BookPickerProps {
  translation: string;
}

export function BookPicker({ translation }: BookPickerProps) {
  const [filter, setFilter] = useState("");

  const filteredBooks = BOOKS.filter((book) =>
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
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg
                     focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
      </div>

      {/* Old Testament */}
      {otBooks.length > 0 && (
        <section aria-labelledby="ot-heading">
          <h2
            id="ot-heading"
            className="mb-3 text-lg font-semibold text-gray-700"
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
            className="mb-1 text-lg font-semibold text-gray-700"
          >
            Deuterocanon &amp; Apocrypha
          </h2>
          <p className="mb-3 text-sm text-gray-500">
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
            className="mb-3 text-lg font-semibold text-gray-700"
          >
            New Testament
          </h2>
          <BookGrid books={ntBooks} translation={translation} />
        </section>
      )}

      {/* No results message */}
      {filteredBooks.length === 0 && (
        <p className="text-center text-gray-500 py-8">
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
        <a
          key={book.id}
          href={`/app/read/${translation}/${book.id}`}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3
                     text-center font-medium text-gray-700
                     hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     transition-colors duration-150"
        >
          {book.name}
          <span className="block text-xs text-gray-400 mt-0.5">
            {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
          </span>
        </a>
      ))}
    </div>
  );
}
