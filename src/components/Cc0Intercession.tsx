/**
 * CC0 Intercession — first-publish education flow.
 *
 * Shows once per user when they first try to share a note publicly.
 * Educates them about CC0 through examples of historical figures who
 * gave their creative work to God and the world freely.
 *
 * After seeing this once, users just see a small "Why CC0?" link on
 * subsequent publish attempts (tracked in user_preferences).
 *
 * Grandmother Principle:
 * - "Share with everyone" not "Publish as CC0"
 * - Plain language: "anyone can read, share, and build on it"
 * - The carousel uses stories, not legal terms
 */

import { useState, useCallback } from "react";

interface Cc0IntercessionProps {
  /** Called when user accepts and wants to proceed with sharing */
  onAccept: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/** Each historical figure who gave their creative work freely. */
interface FigureCard {
  name: string;
  years: string;
  role: string;
  story: string;
}

const FIGURES: FigureCard[] = [
  {
    name: "Fra Angelico",
    years: "c. 1395\u20131455",
    role: "Dominican friar & painter",
    story:
      "Fra Angelico painted some of the most beautiful frescoes in Christian history \u2014 " +
      "the walls of San Marco monastery in Florence. He never signed his work. He never " +
      "sold it. He painted as an act of prayer, and his art was given to anyone who walked " +
      "through the door. He believed that to paint the things of Christ, one must live with Christ.",
  },
  {
    name: "Andrei Rublev",
    years: "c. 1360\u20131430",
    role: "Russian icon painter",
    story:
      "Rublev painted the Trinity icon \u2014 widely considered the greatest work of Russian " +
      "art \u2014 not for a patron or a gallery, but for a monastery chapel. Icons weren\u2019t " +
      "\"art\" to be owned. They were windows into heaven, made to be shared with every person " +
      "who came to pray. His name wasn\u2019t even attached to his work for centuries.",
  },
  {
    name: "Fanny Crosby",
    years: "1820\u20131915",
    role: "Hymn writer",
    story:
      "Blind from infancy, Fanny Crosby wrote over 8,000 hymns \u2014 including \"Blessed " +
      "Assurance,\" \"To God Be the Glory,\" and \"Pass Me Not, O Gentle Savior.\" She was " +
      "paid modestly and gave most of it away. She said her blindness was a gift: " +
      "\"When I get to heaven, the first face that shall ever gladden my sight will be " +
      "that of my Savior.\"",
  },
  {
    name: "Antoni Gaud\u00ed",
    years: "1852\u20131926",
    role: "Architect of the Sagrada Familia",
    story:
      "Gaud\u00ed spent the last 12 years of his life working exclusively on the Sagrada " +
      "Familia basilica in Barcelona, living in his workshop, begging for donations to fund " +
      "the construction. He knew he would never see it finished. He didn\u2019t care. " +
      "\"My client is not in a hurry,\" he said, meaning God.",
  },
  {
    name: "Ephrem the Syrian",
    years: "c. 306\u2013373",
    role: "Theologian & hymnographer",
    story:
      "Ephrem wrote thousands of hymns, poems, and biblical commentaries \u2014 all in Syriac, " +
      "all freely shared with his community. He is the most prolific writer of the early " +
      "Church. When a famine struck, he organized food distribution for the poor. " +
      "He never sought recognition. The Church calls him the \"Harp of the Holy Spirit.\"",
  },
  {
    name: "Leo Tolstoy",
    years: "1828\u20131910",
    role: "Novelist & Christian philosopher",
    story:
      "After writing War and Peace and Anna Karenina \u2014 two of the greatest novels " +
      "ever written \u2014 Tolstoy renounced his copyright. He wanted his later works, " +
      "including The Kingdom of God Is Within You, to be freely available to everyone. " +
      "He gave up his estate and lived simply, believing that art and truth belong to all.",
  },
  {
    name: "Gerard Manley Hopkins",
    years: "1844\u20131889",
    role: "Jesuit priest & poet",
    story:
      "Hopkins wrote some of the most innovative poetry in the English language \u2014 " +
      "\"The Windhover,\" \"God\u2019s Grandeur,\" \"Pied Beauty\" \u2014 and never published " +
      "a word of it during his lifetime. He wrote for God, not for fame. His poems were " +
      "found after his death and shared by a friend. They changed English poetry forever.",
  },
];

export function Cc0Intercession({ onAccept, onCancel }: Cc0IntercessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const figure = FIGURES[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(FIGURES.length - 1, i + 1));
  }, []);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === FIGURES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-edge bg-panel p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Share your note with everyone"
      >
        <div className="space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-xl font-semibold text-heading">
              Share with everyone
            </h2>
            <p className="mt-2 text-sm text-body leading-relaxed">
              When you share a note, it becomes a gift to the world. Anyone can
              read it, share it, and build on it — no permission needed, no
              strings attached.
            </p>
            <p className="mt-1 text-sm text-body leading-relaxed">
              You're joining a long tradition of people who gave their best work
              freely.
            </p>
          </div>

          {/* Figure card */}
          <div className="rounded-lg border border-edge bg-surface-alt p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-heading">
                {figure.name}
              </h3>
              <span className="text-xs text-muted">
                {currentIndex + 1} / {FIGURES.length}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {figure.role} &middot; {figure.years}
            </p>
            <p className="mt-3 text-sm text-body leading-relaxed">
              {figure.story}
            </p>
          </div>

          {/* Navigation dots + arrows */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirst}
              className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-heading
                         disabled:opacity-30 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Previous person"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Dots */}
            <div className="flex gap-1.5" role="tablist" aria-label="Figures">
              {FIGURES.map((f, i) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    i === currentIndex ? "bg-accent" : "bg-edge"
                  }`}
                  role="tab"
                  aria-selected={i === currentIndex}
                  aria-label={f.name}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={isLast}
              className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-heading
                         disabled:opacity-30 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Next person"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Learn more link */}
          <p className="text-center text-xs text-muted">
            <a
              href="/open-source-theology"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-heading focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Read the full story of why we give freely
            </a>
          </p>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-input-border bg-panel px-4 py-2.5 text-sm font-medium
                         text-muted hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent
                         hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Share my note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Small inline "Why CC0?" reminder for users who have already seen the
 * full intercession. Shows as a subtle link.
 */
export function Cc0Reminder() {
  return (
    <a
      href="/open-source-theology"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted underline hover:text-heading
                 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Why is sharing free?
    </a>
  );
}
