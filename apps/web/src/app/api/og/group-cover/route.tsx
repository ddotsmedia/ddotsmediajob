import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

/** WhatsApp group cover (1600x400). /api/og/group-cover?name=...&members=...&category=... */
export function GET(req: Request): ImageResponse {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get('name') ?? 'UAE Jobs Group').slice(0, 60);
  const members = (searchParams.get('members') ?? '').slice(0, 20);
  const category = (searchParams.get('category') ?? '').slice(0, 40);

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0f172a 0%, #2a9aa4 100%)', padding: '48px 56px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', color: 'rgba(255,255,255,0.85)', fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>DDOTS MEDIA JOBS</div>
        <div style={{ display: 'flex', color: '#fff', fontSize: 72, fontWeight: 800, lineHeight: 1 }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {members && <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 20px', borderRadius: 999, fontSize: 28, fontWeight: 600 }}>👥 {members} members</div>}
          {category && <div style={{ display: 'flex', background: '#F5C842', color: '#0f172a', padding: '8px 20px', borderRadius: 999, fontSize: 28, fontWeight: 700 }}>{category}</div>}
        </div>
      </div>
    ),
    { width: 1600, height: 400 },
  );
}
