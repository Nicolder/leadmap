# Rastro — Prospecção B2B de Empresas Locais

Micro-SaaS para busca e extração de dados públicos de empresas locais no Brasil com link de WhatsApp, integração com PIX (Mercado Pago), banco PostgreSQL gerenciado no Neon e exportação direta em planilha Excel (.xlsx).

## 🚀 Tecnologias

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Estilização:** Tailwind CSS (Protocolo Minimalist Editorial UI)
- **Banco de Dados:** PostgreSQL (Neon.tech - AWS São Paulo) com Prisma ORM
- **Pagamentos:** Mercado Pago SDK (PIX Instantâneo com QR Code e Webhook)
- **Exportação:** XLSX (.xlsx formatado)
- **Fontes:** Newsreader (Editorial Serif) & Geist Sans / Mono

## ⚙️ Variáveis de Ambiente (.env)

Copie o `.env.example` para `.env` e configure:

```env
DATABASE_URL="postgresql://usuario:senha@seu-host.neon.tech/neondb?sslmode=require"
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-xxxxxxxxxxxx"
NEXT_PUBLIC_APP_URL="https://seusite.com.br"
NEXT_PUBLIC_META_PIXEL_ID=""
```

## 🛠️ Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Sincronizar o schema com o banco
npx prisma db push

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.
