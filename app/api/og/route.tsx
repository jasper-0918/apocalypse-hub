import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

// Dynamic social share image. Text comes from query params so no DB access is
// needed on the edge: /api/og?title=...&subtitle=...
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') || 'Apocalypse Hub').slice(0, 90);
  const subtitle = (searchParams.get('subtitle') || 'Free Roblox Scripts & Key System').slice(0, 120);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #140406 0%, #0b0b0f 55%, #000000 100%)',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ff4b4b, #c81e1e)',
              transform: 'rotate(12deg)',
              marginRight: '22px',
            }}
          />
          <div style={{ color: '#ffffff', fontSize: '30px', fontWeight: 700 }}>Apocalypse Hub</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#ffffff', fontSize: '76px', fontWeight: 800, lineHeight: 1.05 }}>
            {title}
          </div>
          <div style={{ color: '#f87171', fontSize: '34px', fontWeight: 600, marginTop: '20px' }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '120px', height: '8px', borderRadius: '999px', background: '#ef4444' }} />
          <div style={{ color: '#a1a1aa', fontSize: '24px', marginLeft: '20px' }}>
            apocalypse-hub.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
