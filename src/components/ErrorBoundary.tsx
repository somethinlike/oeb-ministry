/**
 * ErrorBoundary — catches React rendering errors and shows a friendly message.
 *
 * Grandmother Principle:
 * - "Something went wrong" not "Uncaught TypeError in componentDidMount"
 * - Offers a "Try again" button (refreshes the component)
 * - No stack traces in the UI (they go to the console for developers)
 */

import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback message */
  message?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log for developers — never show this to the user
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
          role="alert"
        >
          <p className="text-lg text-red-800">
            {this.props.message || "Something went wrong. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-lg bg-red-600 px-6 py-2 font-medium text-white
                       hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
