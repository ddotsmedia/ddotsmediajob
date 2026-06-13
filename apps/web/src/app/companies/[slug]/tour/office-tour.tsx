'use client';

import Script from 'next/script';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * 360° office tour using A-Frame (free WebVR), loaded from CDN only on this page.
 * Mobile: gyroscope look-around. Desktop: click + drag. The scene markup is
 * injected after A-Frame loads so its custom elements upgrade correctly.
 */
export function OfficeTour({ image, title }: { image: string; title: string }) {
  const [ready, setReady] = useState(false);
  const safeTitle = title.replace(/["'<>]/g, '');
  const safeImage = image.replace(/["'<>]/g, '');

  return (
    <>
      <Script src="https://aframe.io/releases/1.5.0/aframe.min.js" strategy="afterInteractive" onLoad={() => setReady(true)} />
      {ready ? (
        <div
          className="h-[80vh] w-full overflow-hidden rounded-xl"
          dangerouslySetInnerHTML={{
            __html: `<a-scene embedded style="height:100%;width:100%">
              <a-sky src="${safeImage}" rotation="0 -90 0"></a-sky>
              <a-text value="${safeTitle}" position="0 1.8 -3" align="center" color="#ffffff" width="6"></a-text>
              <a-camera><a-cursor color="#2a9aa4"></a-cursor></a-camera>
            </a-scene>`,
          }}
        />
      ) : (
        <div className="flex h-[80vh] items-center justify-center rounded-xl bg-navy-900 text-white">
          <Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Loading tour…</span>
        </div>
      )}
    </>
  );
}
