import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = "DdotsMediaJobs — UAE's WhatsApp Job Portal";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Homepage social-share image: dark-teal brand card. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a2a2b 0%, #083b3a 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 9999, background: '#8dc63f' }} />
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>DdotsMediaJobs</div>
        </div>
        <div style={{ marginTop: 20, fontSize: 40, fontWeight: 600, color: '#5eead4' }}>
          UAE&apos;s WhatsApp Job Portal
        </div>
        <div style={{ marginTop: 36, fontSize: 26, color: '#7fb3b5' }}>
          76 groups · 120,000+ members · Free to apply across all 7 emirates
        </div>
      </div>
    ),
    { ...size },
  );
}
