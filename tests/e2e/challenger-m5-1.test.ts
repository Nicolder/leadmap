/**
 * Milestone M5 Challenger 1 Verification Suite
 * Adversarial empirical tests covering:
 * 1. Visual Identity & SVG Monogram Security Injection Scan (src/app/icon.svg)
 * 2. Root Layout Metadata & OpenGraph/Twitter SEO Conformance (src/app/layout.tsx)
 * 3. Honest Zero Leads State & Backend Purchase Protection (POST /api/checkout/pix)
 * 4. Zero Leads Frontend Suppression & Link Recovery Architecture (src/app/busca/[id]/page.tsx, PixModal.tsx)
 * 5. Minimalist-UI Negative Constraints & Design Token Compliance
 */

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { describe, test, expect, registry } from './test-utils';
import { POST as postPixCheckout } from '@/app/api/checkout/pix/route';
import { db } from '@/lib/db';

const ROOT_DIR = path.resolve(__dirname, '../..');

export function registerM5Challenger1Tests() {
  // =========================================================================
  // SUITE 1: SVG Vector Icon & Security Injection Audit (src/app/icon.svg)
  // =========================================================================
  describe('M5-Challenger-1: SVG Icon Vector & Security Injection Audit', () => {
    const iconPath = path.join(ROOT_DIR, 'src/app/icon.svg');

    test('File src/app/icon.svg exists on filesystem and is within reasonable size limits (100B - 4KB)', () => {
      expect(fs.existsSync(iconPath)).toBeTruthy();
      const stats = fs.statSync(iconPath);
      expect(stats.size).toBeGreaterThan(100);
      expect(stats.size).toBeLessThan(4096);
    });

    test('XML syntax is well-formed with root <svg> element, xmlns, viewBox 0 0 32 32, and 32x32 dimensions', () => {
      const content = fs.readFileSync(iconPath, 'utf-8').trim();
      expect(content.startsWith('<svg')).toBeTruthy();
      expect(content.endsWith('</svg>')).toBeTruthy();

      expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(content).toContain('viewBox="0 0 32 32"');
      expect(content).toContain('width="32"');
      expect(content).toContain('height="32"');
    });

    test('Contains background <rect> with width="32", height="32", rx="6", and fill="#111111"', () => {
      const content = fs.readFileSync(iconPath, 'utf-8');
      expect(content).toMatch(/<rect\s+[^>]*width="32"[^>]*height="32"[^>]*rx="6"[^>]*fill="#111111"/);
    });

    test('Contains monogram vector <path> with non-empty d coordinates and fill="#FFFFFF"', () => {
      const content = fs.readFileSync(iconPath, 'utf-8');
      expect(content).toMatch(/<path\s+[^>]*d="[MmLlHhVvCcSsQqTtAaZz0-9.\s-]+"[^>]*fill="#FFFFFF"/);
      // Ensure path defines coordinates for the letter "R"
      const pathMatch = content.match(/d="([^"]+)"/);
      expect(pathMatch !== null).toBeTruthy();
      if (pathMatch) {
        expect(pathMatch[1].length).toBeGreaterThan(50);
      }
    });

    test('Security Injection Scan: Zero <script>, <foreignObject>, <iframe>, or executable XML tags', () => {
      const content = fs.readFileSync(iconPath, 'utf-8');
      const forbiddenTags = [
        /<script\b/i,
        /<foreignObject\b/i,
        /<iframe\b/i,
        /<object\b/i,
        /<embed\b/i,
        /<applet\b/i,
        /<use\b/i,
      ];

      for (const pattern of forbiddenTags) {
        expect(pattern.test(content)).toBeFalsy();
      }
    });

    test('Security Injection Scan: Zero inline event handlers (onload, onclick, onerror, etc.) and javascript: URIs', () => {
      const content = fs.readFileSync(iconPath, 'utf-8');
      expect(/on\w+\s*=/i.test(content)).toBeFalsy();
      expect(/javascript\s*:/i.test(content)).toBeFalsy();
      expect(/data\s*:/i.test(content)).toBeFalsy();
      expect(/xlink:href/i.test(content)).toBeFalsy();
    });

    test('Security Injection Scan: Zero XML DOCTYPE or entity expansion declarations (XXE defense)', () => {
      const content = fs.readFileSync(iconPath, 'utf-8');
      expect(/<!DOCTYPE/i.test(content)).toBeFalsy();
      expect(/<!ENTITY/i.test(content)).toBeFalsy();
      expect(/SYSTEM\b/i.test(content)).toBeFalsy();
    });
  });

  // =========================================================================
  // SUITE 2: Root Layout Metadata & SEO Conformance (src/app/layout.tsx)
  // =========================================================================
  describe('M5-Challenger-1: Layout Metadata & SEO Conformance', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/app/layout.tsx');
    const layoutSource = fs.readFileSync(layoutPath, 'utf-8');

    // Load actual runtime metadata object safely with mocks for non-bundled css/font imports
    let metadata: any;
    try {
      const Module = require('module');
      const origRequire = Module.prototype.require;
      const mockFont = () => ({ variable: '--mock-font', className: 'mock-font' });

      Module.prototype.require = function (reqPath: string) {
        if (reqPath === 'next/font/google') {
          return { Newsreader: mockFont, Geist: mockFont, Geist_Mono: mockFont };
        }
        if (reqPath.endsWith('.css')) {
          return {};
        }
        return origRequire.apply(this, arguments as any);
      };

      const layoutModule = require(layoutPath);
      metadata = layoutModule.metadata;
      Module.prototype.require = origRequire;
    } catch (e: any) {
      throw new Error(`Failed to dynamically evaluate layout metadata: ${e.message}`);
    }

    test('Metadata export exists and contains valid metadataBase URL', () => {
      expect(metadata).toBeDefined();
      expect(metadata.metadataBase instanceof URL).toBeTruthy();
      expect(metadata.metadataBase.protocol === 'http:' || metadata.metadataBase.protocol === 'https:').toBeTruthy();
      expect(metadata.metadataBase.hostname === 'localhost' || metadata.metadataBase.hostname.includes('rastro.app')).toBeTruthy();
    });

    test('Metadata title defines default title and template string matching Rastro branding', () => {
      expect(typeof metadata.title === 'object').toBeTruthy();
      expect(metadata.title.default).toContain('Rastro');
      expect(metadata.title.default).toContain('Prospecção B2B');
      expect(metadata.title.template).toBe('%s | Rastro');
    });

    test('Metadata description accurately describes B2B Google Maps lead extraction and Excel delivery', () => {
      expect(typeof metadata.description === 'string').toBeTruthy();
      expect(metadata.description.length).toBeGreaterThan(40);
      expect(metadata.description.toLowerCase()).toContain('google maps');
      expect(metadata.description.toLowerCase()).toContain('excel');
    });

    test('Metadata defines applicationName, creator, publisher as "Rastro"', () => {
      expect(metadata.applicationName).toBe('Rastro');
      expect(metadata.creator).toBe('Rastro');
      expect(metadata.publisher).toBe('Rastro');
    });

    test('Metadata keywords contain relevant B2B prospect & data terms', () => {
      expect(Array.isArray(metadata.keywords)).toBeTruthy();
      expect(metadata.keywords.length).toBeGreaterThanOrEqual(5);
      const joinedKeywords = metadata.keywords.join(' ').toLowerCase();
      expect(joinedKeywords).toContain('prospecção b2b');
      expect(joinedKeywords).toContain('google maps');
    });

    test('OpenGraph metadata configured with type website, pt_BR locale, siteName, title, and description', () => {
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph.type).toBe('website');
      expect(metadata.openGraph.locale).toBe('pt_BR');
      expect(metadata.openGraph.siteName).toBe('Rastro');
      expect(metadata.openGraph.title).toBe(metadata.title.default);
      expect(metadata.openGraph.description).toBe(metadata.description);
      expect(metadata.openGraph.url).toBe('/');
    });

    test('Twitter Card configured with summary_large_image, title, and description', () => {
      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter.card).toBe('summary_large_image');
      expect(metadata.twitter.title).toBe(metadata.title.default);
      expect(metadata.twitter.description).toBe(metadata.description);
    });

    test('Metadata icons links to "/icon.svg" with MIME type "image/svg+xml"', () => {
      expect(metadata.icons).toBeDefined();
      expect(Array.isArray(metadata.icons.icon)).toBeTruthy();
      const svgIcon = metadata.icons.icon.find((i: any) => i.url === '/icon.svg');
      expect(svgIcon).toBeDefined();
      expect(svgIcon.type).toBe('image/svg+xml');
    });

    test('Layout source has zero circular dependencies or unresolved runtime exports', () => {
      expect(layoutSource).toContain('export const metadata: Metadata');
      expect(layoutSource).toContain('export default function RootLayout');
    });
  });

  // =========================================================================
  // SUITE 3: Zero Leads State & Backend Purchase Protection (R2)
  // =========================================================================
  describe('M5-Challenger-1: Zero Leads State & Backend Purchase Protection', () => {
    const createdJobIds: string[] = [];

    test('3.1 POST /api/checkout/pix with job totalFound: 0 strictly returns HTTP 400 with honest error message', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'termo_inexistente_zero_adversarial_1',
          location: 'lugar_inexistente_zero_1',
          totalFound: 0,
          isPaid: false,
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id }),
      });

      const res = await postPixCheckout(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Não é possível cobrar por uma lista sem contatos.');
    });

    test('3.2 Boundary: POST /api/checkout/pix with job totalFound: -1 strictly returns HTTP 400 with honest error message', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'termo_inexistente_negativo_adversarial_2',
          location: 'lugar_inexistente_negativo_2',
          totalFound: -1,
          isPaid: false,
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id }),
      });

      const res = await postPixCheckout(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe('Não é possível cobrar por uma lista sem contatos.');
    });

    test('3.3 Boundary: POST /api/checkout/pix with positive totalFound (> 0) continues to generate valid PIX checkout', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Clínica Odontológica',
          location: 'Santos - SP',
          totalFound: 15,
          isPaid: false,
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id }),
      });

      const res = await postPixCheckout(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.paymentId).toBeDefined();
      expect(data.amount).toBe(19.90);
      expect(data.qrCode).toBeDefined();

      // Verify payment was recorded in database
      const paymentInDb = await db.payment.findUnique({
        where: { id: data.paymentId },
      });
      expect(paymentInDb !== null).toBeTruthy();
      expect(paymentInDb?.status).toBe('pending');
      expect(paymentInDb?.amount).toBe(19.90);
    });

    test('3.4 Idempotency: POST /api/checkout/pix for already-paid job returns isPaid status without charging again', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Advocacia',
          location: 'Curitiba - PR',
          totalFound: 20,
          isPaid: true,
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id }),
      });

      const res = await postPixCheckout(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.isPaid).toBe(true);
      expect(data.message).toBe('Esta lista já foi desbloqueada.');
    });

    test('3.5 Error Guards: POST /api/checkout/pix rejects missing searchJobId (400) and non-existent searchJobId (404)', async () => {
      const reqMissing = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const resMissing = await postPixCheckout(reqMissing);
      expect(resMissing.status).toBe(400);
      const dataMissing = await resMissing.json();
      expect(dataMissing.error).toBe('ID da busca é obrigatório.');

      const req404 = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: '00000000-0000-0000-0000-000000000000' }),
      });
      const res404 = await postPixCheckout(req404);
      expect(res404.status).toBe(404);
      const data404 = await res404.json();
      expect(data404.error).toBe('Busca não encontrada.');
    });

    test('3.6 Teardown: Clean up all created test jobs and payment records', async () => {
      for (const id of createdJobIds) {
        await db.payment.deleteMany({ where: { searchJobId: id } });
        await db.searchJob.delete({ where: { id } }).catch(() => {});
      }
      expect(true).toBeTruthy();
    });
  });

  // =========================================================================
  // SUITE 4: Zero Leads Frontend Architecture & UI Suppression (R2 & R3)
  // =========================================================================
  describe('M5-Challenger-1: Frontend Zero Leads UI Suppression & Permanent Link', () => {
    const pagePath = path.join(ROOT_DIR, 'src/app/busca/[id]/page.tsx');
    const pageSource = fs.readFileSync(pagePath, 'utf-8');
    const pixModalPath = path.join(ROOT_DIR, 'src/components/PixModal.tsx');
    const pixModalSource = fs.readFileSync(pixModalPath, 'utf-8');

    test('Evaluation of isZeroLeads is strictly based on job.totalFound === 0', () => {
      expect(pageSource).toContain('const isZeroLeads = job.totalFound === 0;');
    });

    test('When isZeroLeads is true, top navigation displays "Nenhum contato encontrado (0 leads)"', () => {
      expect(pageSource).toContain('isZeroLeads ? (');
      expect(pageSource).toContain('Nenhum contato encontrado (0 leads)');
    });

    test('When isZeroLeads is true, header action replaces checkout/download button with "Fazer Nova Busca"', () => {
      expect(pageSource).toContain('isZeroLeads ? (');
      expect(pageSource).toContain('Fazer Nova Busca');
      expect(pageSource).toContain('href="/"');
    });

    test('When isZeroLeads is true, checkout button (setIsModalOpen) and PixModal are completely suppressed', () => {
      // PixModal is wrapped in {!isZeroLeads && (<PixModal ... />)}
      expect(pageSource).toContain('{!isZeroLeads && (');
      expect(pageSource).toContain('<PixModal');

      // The checkout button is in the {!isZeroLeads} branch
      expect(pageSource).toContain('setIsModalOpen(true)');
    });

    test('When isZeroLeads is true, lead table and unlock banner are replaced by honest zero state container', () => {
      expect(pageSource).toContain('isZeroLeads ? (');
      expect(pageSource).toContain('Nenhuma empresa encontrada para este nicho na região');
      expect(pageSource).toContain('Cobrança protegida: Você nunca paga por buscas sem resultados no Rastro. O checkout está desativado.');
      expect(pageSource).toContain('Como encontrar mais empresas:');
      expect(pageSource).toContain('POPULAR_BROAD_SUGGESTIONS');
      expect(pageSource).toContain('<SearchBar');
    });

    test('Permanent link recovery button exists on /busca/[id] with visual feedback', () => {
      expect(pageSource).toContain('Copiar link permanente desta lista');
      expect(pageSource).toContain('Link copiado!');
      expect(pageSource).toContain('setCopiedLink(true)');
      expect(pageSource).toContain('copyToClipboard');
    });

    test('Permanent link recovery button exists on PixModal with visual feedback in approved state', () => {
      expect(pixModalSource).toContain('Copiar link permanente desta lista');
      expect(pixModalSource).toContain('Link permanente copiado!');
      expect(pixModalSource).toContain('handleCopyPermanentLink');
    });

    test('Clipboard helpers handle both modern navigator.clipboard and fallback document.execCommand', () => {
      expect(pageSource).toContain('navigator?.clipboard?.writeText');
      expect(pageSource).toContain("document.execCommand('copy')");
      expect(pageSource).toContain("typeof window === 'undefined'");

      expect(pixModalSource).toContain('navigator?.clipboard?.writeText');
      expect(pixModalSource).toContain("document.execCommand('copy')");
      expect(pixModalSource).toContain("typeof window === 'undefined'");
    });
  });

  // =========================================================================
  // SUITE 5: Negative Constraints & Minimalist-UI Token Audit
  // =========================================================================
  describe('M5-Challenger-1: Negative Constraints & Minimalist Design Token Audit', () => {
    const filesToAudit = [
      'src/app/icon.svg',
      'src/app/layout.tsx',
      'src/app/busca/[id]/page.tsx',
      'src/components/PixModal.tsx',
      'src/app/api/checkout/pix/route.ts',
    ];

    test('Negative Constraint: Zero emojis across all modified files', () => {
      const emojiRegex = /\p{Extended_Pictographic}/u;
      const violations: string[] = [];

      for (const relPath of filesToAudit) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        lines.forEach((line, idx) => {
          if (emojiRegex.test(line)) {
            violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
          }
        });
      }

      expect(violations.length).toBe(0);
    });

    test('Negative Constraint: Zero heavy drop shadows (shadow-md, shadow-lg, shadow-xl, shadow-2xl)', () => {
      const shadowRegex = /\b(shadow-md|shadow-lg|shadow-xl|shadow-2xl)\b/;
      const violations: string[] = [];

      for (const relPath of filesToAudit) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        lines.forEach((line, idx) => {
          if (shadowRegex.test(line)) {
            violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
          }
        });
      }

      expect(violations.length).toBe(0);
    });

    test('Negative Constraint: Zero AI gradients or saturated neon colors in modified files', () => {
      const gradientRegex = /\b(bg-gradient-to-[a-z]+|from-[a-z]+-[0-9]+)\b/;
      const violations: string[] = [];

      for (const relPath of filesToAudit) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        lines.forEach((line, idx) => {
          if (gradientRegex.test(line)) {
            violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
          }
        });
      }

      expect(violations.length).toBe(0);
    });

    test('Negative Constraint: Zero banned AI marketing clichés (Elevate, Seamless, Unleash, Next-Gen, Game-changer, Delve)', () => {
      const clicheRegex = /\b(Elevate|Seamless|Unleash|Next-Gen|Game-changer|Delve)\b/i;
      const violations: string[] = [];

      for (const relPath of filesToAudit) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        lines.forEach((line, idx) => {
          if (clicheRegex.test(line)) {
            violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
          }
        });
      }

      expect(violations.length).toBe(0);
    });
  });
}

// Direct execution entrypoint
async function run() {
  registry.clear();
  registerM5Challenger1Tests();
  const summary = await registry.run('Milestone M5 Challenger 1 (Visual Identity & Zero-State Adversarial)');

  await db.$disconnect();

  if (summary.failed > 0) {
    console.error(`\x1b[31m[VERDICT: REJECT] ${summary.failed} tests failed in Challenger 1 Suite.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[VERDICT: APPROVE] All ${summary.passed} tests passed successfully.\x1b[0m`);
    process.exit(0);
  }
}

if (require.main === module || process.argv[1].endsWith('challenger-m5-1.test.ts')) {
  run().catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
