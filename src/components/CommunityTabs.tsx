/**
 * CommunityTabs — tabbed view for community content (Notes + Devotionals).
 *
 * Grandmother Principle:
 * - "Notes" and "Devotionals" — clear, simple tab labels
 * - Default tab is "Notes" (existing behavior preserved)
 */

import { useState } from "react";
import { PublicFeed } from "./PublicFeed";
import { PublishedDevotionalsFeed } from "./PublishedDevotionalsFeed";

interface CommunityTabsProps {
  userId: string;
  defaultTab?: "notes" | "devotionals";
}

type Tab = "notes" | "devotionals";

export function CommunityTabs({ userId, defaultTab = "notes" }: CommunityTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-edge mb-6" role="tablist">
        <TabButton
          label="Notes"
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
        />
        <TabButton
          label="Devotionals"
          active={activeTab === "devotionals"}
          onClick={() => setActiveTab("devotionals")}
        />
      </div>

      {/* Tab content */}
      {activeTab === "notes" && <PublicFeed />}
      {activeTab === "devotionals" && <PublishedDevotionalsFeed userId={userId} />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors
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
