import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rastro — Prospecção B2B de Empresas Locais';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D0D0D',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Topo: Logo & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#FFFFFF',
              color: '#111111',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 'bold',
            }}
          >
            R
          </div>
          <span
            style={{
              fontSize: '42px',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            Rastro
          </span>
          <div
            style={{
              marginLeft: '12px',
              backgroundColor: '#1C2E20',
              color: '#4ADE80',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '18px',
              fontWeight: 500,
              fontFamily: 'monospace',
            }}
          >
            B2B BRASIL
          </div>
        </div>

        {/* Centro: Título Forte & Subtítulo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 500,
              color: '#F5F5F5',
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: '-0.03em',
            }}
          >
            Encontre empresas locais em qualquer cidade do Brasil em 30 segundos.
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: '#A1A1AA',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Extraia contatos comerciais do Google Maps com link direto de WhatsApp e planilha Excel pronta para prospecção.
          </p>
        </div>

        {/* Rodapé do Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            borderTop: '1px solid #262626',
            paddingTop: '32px',
            color: '#71717A',
            fontSize: '18px',
            fontFamily: 'monospace',
          }}
        >
          <span>PIX Instantâneo · Download em Excel (.xlsx)</span>
          <span>leadmap-peach.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
