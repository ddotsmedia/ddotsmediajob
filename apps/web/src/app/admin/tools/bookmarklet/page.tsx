'use client';

import { useRef, useEffect } from 'react';
import { Bookmark, MousePointerClick } from 'lucide-react';

const BOOKMARKLET =
  "javascript:(function(){var t=window.getSelection().toString()||(document.querySelector('[data-testid=\"msg-container\"] span.selectable-text:last-child')||{}).innerText||'';if(t){window.open('https://ddotsmediajobs.com/admin/quick-import?text='+encodeURIComponent(t));}else{alert('Select a message first or open a chat');}})();";

export default function BookmarkletPage() {
  const ref = useRef<HTMLAnchorElement>(null);
  // Set the javascript: href directly on the DOM node (React blocks it in JSX).
  useEffect(() => { ref.current?.setAttribute('href', BOOKMARKLET); }, []);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2"><Bookmark className="h-5 w-5 text-teal-500" /><h1 className="font-display text-2xl font-bold text-navy-900">WhatsApp Web Bookmarklet</h1></div>
      <p className="mt-1 text-navy-700/60">Import jobs straight from WhatsApp Web with one click.</p>

      <div className="mt-6 rounded-xl border bg-white p-6 text-center">
        <p className="mb-4 text-sm text-navy-700/70">Drag this button to your bookmarks bar:</p>
        <a
          ref={ref}
          onClick={(e) => e.preventDefault()}
          className="inline-flex cursor-move items-center gap-2 rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white shadow hover:bg-teal-700"
        >
          <MousePointerClick className="h-4 w-4" /> + Add Job to DdotsJobs
        </a>
      </div>

      <ol className="mt-6 space-y-2 text-sm text-navy-700/80">
        <li><strong>1.</strong> Drag the button above onto your browser&apos;s bookmarks bar.</li>
        <li><strong>2.</strong> Open <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">web.whatsapp.com</a> and open a chat or group.</li>
        <li><strong>3.</strong> Select the job message text (or just leave a chat open).</li>
        <li><strong>4.</strong> Click the bookmark — it opens Quick Import with the text pre-filled.</li>
        <li><strong>5.</strong> Tap <strong>Extract &amp; Fill</strong> → review the draft → publish.</li>
      </ol>

      <div className="mt-6 rounded-lg border bg-navy-50/40 p-4">
        <p className="text-xs font-medium text-navy-700/70">Bookmarklet code (if you need to copy it manually):</p>
        <code className="mt-2 block break-all rounded bg-white p-2 text-[11px] text-navy-700">{BOOKMARKLET}</code>
      </div>
    </div>
  );
}
