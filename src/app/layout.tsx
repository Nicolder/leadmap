import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { Newsreader, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LeadMap — Prospecção B2B de Empresas Locais',
  description:
    'Extraia listas comerciais com telefone, WhatsApp, endereço e avaliações do Google Maps em qualquer cidade do Brasil. Baixe direto no Excel.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex flex-col bg-[#FBFBFA] text-[#111111] font-sans"
        suppressHydrationWarning
      >
        {pixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        {/* Barra Superior Minimalista */}
        <header className="w-full border-b border-[#EAEAEA] bg-white sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="w-7 h-7 bg-[#111111] text-white flex items-center justify-center rounded-[5px] text-xs font-mono font-medium">
                LM
              </span>
              <span className="font-serif text-xl tracking-tight text-[#111111] font-medium">
                LeadMap
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538]">
                B2B Brasil
              </span>
            </Link>

            <nav className="flex items-center gap-6 text-sm text-[#787774]">
              <Link href="/#como-funciona" className="hover:text-[#111111] transition-colors">
                Como Funciona
              </Link>
              <Link href="/#precos" className="hover:text-[#111111] transition-colors">
                Preços
              </Link>
              <Link
                href="/"
                className="bg-[#111111] text-white text-xs px-3.5 py-1.5 rounded-[5px] hover:bg-[#2F3437] transition-all active:scale-[0.98]"
              >
                Nova Busca
              </Link>
            </nav>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1">{children}</main>

        {/* Rodapé Minimalista Editorial */}
        <footer className="border-t border-[#EAEAEA] bg-white mt-24 py-12">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#787774]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#111111]">LeadMap</span>
              <span>—</span>
              <span>Ferramenta de prospecção e extração de dados públicos B2B.</span>
            </div>
            <div className="flex items-center gap-6">
              <span>Pagamentos processados com segurança via PIX (Mercado Pago)</span>
              <span>•</span>
              <span>2026</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
