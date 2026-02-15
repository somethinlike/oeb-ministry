/**
 * ChapterPicker — grid of chapter numbers for a selected book.
 *
 * Grandmother Principle:
 * - Large numbered buttons in a simple grid
 * - Book name shown as a header so user knows where they are
 * - Easy to tap on mobile
 */

import { BOOK_BY_ID } from "../lib/constants";
import type { BookId } from "../types/bible";

interface ChapterPickerProps {
  translation: string;
  book: string;
}

export function ChapterPicker({ translation, book }: ChapterPickerProps) {
  const bookInfo = BOOK_BY_ID.get(book as BookId);

  if (!bookInfo) {
    return <p className="text-gray-500">Book not found.</p>;
  }

  // Generate array [1, 2, 3, ..., N] for the chapter buttons
  const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-900">
        {bookInfo.name}
      </h2>
      <p className="mb-6 text-gray-600">
        Choose a chapter to start reading.
      </p>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
        {chapters.map((ch) => (
          <a
            key={ch}
            href={`/app/read/${translation}/${book}/${ch}`}
            className="flex h-12 w-full items-center justify-center rounded-lg
                       border border-gray-200 bg-white font-medium text-gray-700
                       hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       transition-colors duration-150"
            aria-label={`${bookInfo.name} chapter ${ch}`}
          >
            {ch}
          </a>
        ))}
      </div>
    </div>
  );
}
