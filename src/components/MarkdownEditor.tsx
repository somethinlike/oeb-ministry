/**
 * MarkdownEditor — toolbar-driven writing area with live preview.
 *
 * Grandmother Principle:
 * - Users never see raw Markdown syntax
 * - Toolbar buttons (Bold, Italic, etc.) insert formatting for them
 * - Live preview shows "how it looks" as they write
 * - No "Markdown" label anywhere — it's just "your writing"
 *
 * Security:
 * - Preview rendered through react-markdown + rehype-sanitize
 * - No dangerouslySetInnerHTML anywhere
 */

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  /** Initial content (empty for new annotations) */
  initialContent?: string;
  /** Called when content changes */
  onChange: (content: string) => void;
  /** Placeholder text for empty editor */
  placeholder?: string;
}

/** Toolbar button config — each one wraps selected text with markdown syntax. */
interface ToolbarAction {
  label: string;
  ariaLabel: string;
  /** The icon (using simple text/unicode for accessibility) */
  icon: string;
  /** Wraps selected text: prefix + selected text + suffix */
  prefix: string;
  suffix: string;
  /** If true, the action works on a new line (headings, lists) */
  blockLevel?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: "B",
    ariaLabel: "Bold",
    icon: "B",
    prefix: "**",
    suffix: "**",
  },
  {
    label: "I",
    ariaLabel: "Italic",
    icon: "I",
    prefix: "_",
    suffix: "_",
  },
  {
    label: "H",
    ariaLabel: "Heading",
    icon: "H",
    prefix: "## ",
    suffix: "",
    blockLevel: true,
  },
  {
    label: "•",
    ariaLabel: "Bullet list",
    icon: "•",
    prefix: "- ",
    suffix: "",
    blockLevel: true,
  },
  {
    label: "\"",
    ariaLabel: "Quote",
    icon: "\"",
    prefix: "> ",
    suffix: "",
    blockLevel: true,
  },
];

export function MarkdownEditor({
  initialContent = "",
  onChange,
  placeholder = "Write your thoughts here...",
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleContentChange(newContent: string) {
    setContent(newContent);
    onChange(newContent);
  }

  function applyFormatting(action: ToolbarAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || "text";

    let newContent: string;
    let newCursorPos: number;

    if (action.blockLevel) {
      // For block-level actions, insert on a new line
      const beforeSelection = content.substring(0, start);
      const needsNewline =
        beforeSelection.length > 0 && !beforeSelection.endsWith("\n");

      const prefix = (needsNewline ? "\n" : "") + action.prefix;
      newContent =
        beforeSelection +
        prefix +
        selectedText +
        action.suffix +
        content.substring(end);

      newCursorPos = start + prefix.length + selectedText.length;
    } else {
      // For inline actions, wrap the selected text
      newContent =
        content.substring(0, start) +
        action.prefix +
        selectedText +
        action.suffix +
        content.substring(end);

      newCursorPos =
        start + action.prefix.length + selectedText.length;
    }

    handleContentChange(newContent);

    // Restore focus and set cursor position after React re-renders
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

  return (
    <div className="rounded-lg border border-gray-300">
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 border-b border-gray-200 px-2 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.ariaLabel}
            type="button"
            onClick={() => applyFormatting(action)}
            className="rounded px-2.5 py-1.5 text-sm font-bold text-gray-600
                       hover:bg-gray-100 hover:text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={action.ariaLabel}
            title={action.ariaLabel}
          >
            {action.icon}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`rounded px-3 py-1.5 text-sm font-medium
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     ${showPreview ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
          aria-pressed={showPreview}
        >
          {showPreview ? "Write" : "Preview"}
        </button>
      </div>

      {/* Editor / Preview area */}
      {showPreview ? (
        <div
          className="prose prose-sm max-w-none p-4 min-h-[200px]"
          aria-label="Preview of your writing"
        >
          {content ? (
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[200px] resize-y p-4 text-base
                     focus:outline-none rounded-b-lg"
          aria-label="Write your note"
        />
      )}
    </div>
  );
}
