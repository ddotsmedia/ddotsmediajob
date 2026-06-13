import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

/**
 * "Now hiring" social card generator.
 *   /api/og/hiring?title=...&company=...&salary=...&emirate=...&visa=1&urgent=1&format=story|linkedin
 */
export function GET(req: Request): ImageResponse {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') ?? 'We are hiring').slice(0, 80);
  const company = (searchParams.get('company') ?? '').slice(0, 60);
  const salary = (searchParams.get('salary') ?? '').slice(0, 40);
  const emirate = (searchParams.get('emirate') ?? '').slice(0, 40);
  const visa = searchParams.get('visa') === '1';
  const urgent = searchParams.get('urgent') === '1';
  const format = searchParams.get('format') === 'linkedin' ? 'linkedin' : 'story';
  const w = format === 'linkedin' ? 1200 : 1080;
  const h = format === 'linkedin' ? 627 : 1920;

  const Badge = ({ text }: { text: string }) => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '10px 22px', borderRadius: 999, fontSize: 30, fontWeight: 600 }}>{text}</div>
  );

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0f172a 0%, #1d7a82 100%)', padding: format === 'linkedin' ? '56px' : '88px 72px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {urgent && <div style={{ display: 'flex', background: '#E8622A', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 32, fontWeight: 800 }}>🚨 URGENT</div>}
            <div style={{ display: 'flex', background: '#2a9aa4', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 32, fontWeight: 800 }}>NOW HIRING</div>
          </div>
          <div style={{ display: 'flex', color: '#fff', fontSize: format === 'linkedin' ? 64 : 88, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          {company && <div style={{ display: 'flex', color: 'rgba(255,255,255,0.8)', fontSize: 40 }}>{company}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {salary && <div style={{ display: 'flex', color: '#F5C842', fontSize: 56, fontWeight: 800 }}>{salary}</div>}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {emirate && <Badge text={`📍 ${emirate}`} />}
            {visa && <Badge text="✓ Visa provided" />}
          </div>
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.9)', fontSize: 36, fontWeight: 700, marginTop: 12 }}>ddotsmediajobs.com</div>
        </div>
      </div>
    ),
    { width: w, height: h },
  );
}
