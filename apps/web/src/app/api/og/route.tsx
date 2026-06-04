import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

/**
 * Branded Open Graph image generator.
 *   /api/og?title=...&subtitle=...&tag=...
 * Used by job detail + blog pages; falls back to the DdotsMediaJobs brand card.
 */
export function GET(req: Request): ImageResponse {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') ?? 'DdotsMediaJobs').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') ?? 'UAE Jobs, Salaries & Career Tools').slice(0, 120);
  const tag = (searchParams.get('tag') ?? '').slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1d7a82 100%)',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', width: '56px', height: '56px', borderRadius: '14px', background: '#2a9aa4', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 800, color: '#fff' }}>
            D
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#e0f5f7', letterSpacing: '2px' }}>DDOTS MEDIA JOBS</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {tag ? (
            <div style={{ display: 'flex' }}>
              <span style={{ background: '#F5C842', color: '#0f172a', padding: '6px 18px', borderRadius: '999px', fontSize: '24px', fontWeight: 700 }}>{tag}</span>
            </div>
          ) : null}
          <div style={{ fontSize: '64px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: '32px', color: '#cbd5e1' }}>{subtitle}</div>
        </div>

        <div style={{ fontSize: '26px', color: '#8DC63F', fontWeight: 600 }}>ddotsmediajobs.com</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
