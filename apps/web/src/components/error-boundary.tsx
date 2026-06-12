'use client';

import { Component, type ReactNode } from 'react';

/**
 * Client error boundary — catches render/runtime errors in the page tree (e.g.
 * a browser API that's missing in a WhatsApp/Instagram in-app webview) and shows
 * a friendly reload screen instead of a white page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override componentDidCatch(error: unknown) {
    console.error('[error-boundary]', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <h2 className="font-display text-xl font-bold text-navy-900">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-navy-700/60">This page failed to load on your browser. Please reload.</p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => { this.setState({ hasError: false }); if (typeof window !== 'undefined') window.location.reload(); }}
              className="rounded-lg bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700"
            >
              Reload page
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- hard reload from a broken tree */}
            <a href="/" className="rounded-lg border px-5 py-2.5 font-semibold text-navy-700 hover:bg-navy-50">Go home</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
