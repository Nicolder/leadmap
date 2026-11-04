import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { POST as postSearch } from '@/app/api/search/route';
import { GET as getSearchById } from '@/app/api/search/[id]/route';
import { POST as postPixCheckout } from '@/app/api/checkout/pix/route';
import { GET as getPaymentStatus } from '@/app/api/checkout/status/[paymentId]/route';
import { GET as getExport } from '@/app/api/export/[id]/route';
import { describe, test, expect, registry, SuiteSummary } from './test-utils';

export function registerTier1Tests() {
  const rootDir = process.cwd();
  let createdJobIds: string[] = [];

  describe('Feature 1-4: Frontend Architecture & Minimalist-UI Contracts', () => {
    test('1.1 PostCSS configuration defines TailwindCSS and Autoprefixer plugins', async () => {
      const postcssPath = path.join(rootDir, 'postcss.config.mjs');
      expect(fs.existsSync(postcssPath)).toBeTruthy();
      const content = fs.readFileSync(postcssPath, 'utf-8');
      expect(content).toContain('tailwindcss');
      expect(content).toContain('autoprefixer');
    });

    test('1.2 Tailwind configuration defines minimalist-ui warm monochrome and pastel tokens', async () => {
      const tailwindPath = path.join(rootDir, 'tailwind.config.ts');
      expect(fs.existsSync(tailwindPath)).toBeTruthy();
      const content = fs.readFileSync(tailwindPath, 'utf-8');
      expect(content).toContain('#FBFBFA'); // canvas
      expect(content).toContain('#FFFFFF'); // surface
      expect(content).toContain('#111111'); // charcoal
      expect(content).toContain('#787774'); // muted-gray
      expect(content).toContain('#EAEAEA'); // border-light
      expect(content).toContain('Newsreader'); // editorial serif
    });

    test('1.3 Root layout incorporates suppressHydrationWarning on html and body tags', async () => {
      const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
      expect(fs.existsSync(layoutPath)).toBeTruthy();
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toMatch(/<html[^>]*suppressHydrationWarning/);
      expect(content).toMatch(/<body[^>]*suppressHydrationWarning/);
    });

    test('1.4 Design system enforces zero emojis across all frontend components', async () => {
      const srcDir = path.join(rootDir, 'src');
      const filesToCheck = [
        path.join(srcDir, 'app/page.tsx'),
        path.join(srcDir, 'app/layout.tsx'),
        path.join(srcDir, 'app/busca/[id]/page.tsx'),
        path.join(srcDir, 'components/PixModal.tsx'),
        path.join(srcDir, 'components/SearchBar.tsx'),
      ];

      // Unicode ranges for common emojis
      const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

      for (const file of filesToCheck) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          const hasEmoji = emojiRegex.test(content);
          if (hasEmoji) {
            throw new Error(`File ${file} contains forbidden emoji characters.`);
          }
          expect(hasEmoji).toBeFalsy();
        }
      }
    });

    test('1.5 Design system enforces absence of heavy shadows and AI gradients', async () => {
      const srcDir = path.join(rootDir, 'src');
      const filesToCheck = [
        path.join(srcDir, 'app/page.tsx'),
        path.join(srcDir, 'app/busca/[id]/page.tsx'),
        path.join(srcDir, 'components/PixModal.tsx'),
        path.join(srcDir, 'components/SearchBar.tsx'),
      ];

      for (const file of filesToCheck) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          // Disallow heavy shadows: shadow-lg, shadow-xl, shadow-2xl
          const hasHeavyShadow = /shadow-(?:lg|xl|2xl)/.test(content);
          expect(hasHeavyShadow).toBeFalsy();

          // Disallow gradients: bg-gradient-to-, from-purple, etc.
          const hasAiGradient = /bg-gradient-to-|from-(?:purple|indigo|pink|cyan)/.test(content);
          expect(hasAiGradient).toBeFalsy();
        }
      }
    });
  });

  describe('Feature 5-7: Lead Search Engine & Relational Persistence', () => {
    let testJobId: string;

    test('2.1 POST /api/search creates search job and returns 200 with jobId and totalFound >= 15', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Clínica Odontológica',
          location: 'Campinas - SP',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jobId).toBeDefined();
      expect(typeof data.jobId).toBe('string');
      expect(data.niche).toBe('Clínica Odontológica');
      expect(data.location).toBe('Campinas - SP');
      expect(data.totalFound).toBeGreaterThanOrEqual(15);

      testJobId = data.jobId;
      createdJobIds.push(testJobId);
    });

    test('2.2 SearchJob and associated leads are persisted in SQLite database', async () => {
      expect(testJobId).toBeDefined();
      const job = await db.searchJob.findUnique({
        where: { id: testJobId },
        include: { leads: true },
      });

      expect(job).toBeTruthy();
      expect(job?.isPaid).toBe(false);
      expect(job?.leads.length).toBeGreaterThanOrEqual(15);
    });

    test('2.3 Extracted leads contain populated name, category, and address', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: testJobId },
        include: { leads: true },
      });

      const leads = job?.leads || [];
      expect(leads.length).toBeGreaterThan(0);

      const firstLead = leads[0];
      expect(firstLead.name.length).toBeGreaterThan(2);
      expect(firstLead.category).toBeDefined();
      expect(firstLead.address).toBeDefined();
      expect(firstLead.rating).toBeGreaterThan(0);
    });

    test('2.4 Extracted phone numbers adhere to Brazilian phone number format', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: testJobId },
        include: { leads: true },
      });

      const leads = job?.leads || [];
      // Supports national (XX) 9XXXX-XXXX / (XX) 3XXX-XXXX / (XX) 3XXXX-XXXX and international +55 XX XXXXX XXXX
      const phoneRegex = /^(?:\+55\s*)?(?:\(\d{2}\)|\d{2})?\s*(?:9\d{4}|\d{4,5})[-.\s]?\d{4}$/;

      for (const lead of leads.slice(0, 10)) {
        if (lead.phone) {
          expect(phoneRegex.test(lead.phone)).toBeTruthy();
        }
      }
    });

    test('2.5 WhatsApp deep link begins with https://wa.me/55 and contains valid query params', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: testJobId },
        include: { leads: true },
      });

      const leads = job?.leads || [];
      for (const lead of leads.slice(0, 5)) {
        if (lead.whatsappUrl) {
          expect(lead.whatsappUrl.startsWith('https://wa.me/55')).toBeTruthy();
          expect(lead.whatsappUrl).toContain('text=');
        }
      }
    });

    test('2.6 Location query resolves with valid Brazilian area code (DDD)', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: testJobId },
        include: { leads: true },
      });

      const samplePhone = job?.leads[0]?.phone || '';
      // Matches (XX) or +55 XX
      const dddMatch = samplePhone.match(/(?:\((\d{2})\)|\+55\s*(\d{2}))/);
      expect(dddMatch).toBeTruthy();
      const ddd = dddMatch ? (dddMatch[1] || dddMatch[2]) : '';
      expect(ddd.length).toBe(2);
    });
  });

  describe('Feature 8: Free Leads Preview & Masking Gate', () => {
    let previewJobId: string;

    test('3.1 GET /api/search/[id] for unpaid job returns HTTP 200 with job metadata and isPaid: false', async () => {
      // Create fresh job
      const postReq = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: 'Advocacia Tributária', location: 'São Paulo - SP' }),
      });
      const postRes = await postSearch(postReq);
      const postData = await postRes.json();
      previewJobId = postData.jobId;
      createdJobIds.push(previewJobId);

      const getReq = new NextRequest(`http://localhost:3000/api/search/${previewJobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: previewJobId }) });

      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.job.id).toBe(previewJobId);
      expect(data.job.isPaid).toBe(false);
    });

    test('3.2 Unpaid job provides exactly 5 open sampleLeads', async () => {
      const getReq = new NextRequest(`http://localhost:3000/api/search/${previewJobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: previewJobId }) });
      const data = await getRes.json();

      expect(Array.isArray(data.sampleLeads)).toBeTruthy();
      expect(data.sampleLeads.length).toBe(5);
      expect(data.unlockedCount).toBe(5);
    });

    test('3.3 Sample leads (first 5) have readable unmasked phones and actionable WhatsApp links', async () => {
      const getReq = new NextRequest(`http://localhost:3000/api/search/${previewJobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: previewJobId }) });
      const data = await getRes.json();

      for (const lead of data.sampleLeads) {
        expect(lead.phone).toBeDefined();
        expect(lead.phone.includes('****')).toBeFalsy();
        expect(lead.whatsappUrl.startsWith('https://wa.me/')).toBeTruthy();
      }
    });

    test('3.4 Locked leads (index >= 5) have server-masked phones with asterisks', async () => {
      const getReq = new NextRequest(`http://localhost:3000/api/search/${previewJobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: previewJobId }) });
      const data = await getRes.json();

      expect(Array.isArray(data.lockedLeads)).toBeTruthy();
      expect(data.lockedLeads.length).toBeGreaterThanOrEqual(10);

      for (const locked of data.lockedLeads.slice(0, 5)) {
        expect(locked.phone).toContain('****');
        expect(locked.isLocked).toBe(true);
      }
    });

    test('3.5 Locked leads have masked WhatsApp link (#) and obscured address info', async () => {
      const getReq = new NextRequest(`http://localhost:3000/api/search/${previewJobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: previewJobId }) });
      const data = await getRes.json();

      for (const locked of data.lockedLeads.slice(0, 5)) {
        expect(locked.whatsappUrl).toBe('#');
        expect(locked.address).toContain('***');
      }
    });
  });

  describe('Feature 9-10: Mercado Pago PIX Checkout & Status Simulation', () => {
    let checkoutJobId: string;
    let paymentId: string;

    test('4.1 POST /api/checkout/pix creates payment with amount R$ 19.90', async () => {
      const postReq = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: 'Restaurante', location: 'Santos - SP' }),
      });
      const postRes = await postSearch(postReq);
      const postData = await postRes.json();
      checkoutJobId = postData.jobId;
      createdJobIds.push(checkoutJobId);

      const pixReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: checkoutJobId }),
      });
      const pixRes = await postPixCheckout(pixReq);
      expect(pixRes.status).toBe(200);

      const pixData = await pixRes.json();
      expect(pixData.amount).toBe(19.90);
      paymentId = pixData.paymentId;
    });

    test('4.2 Payment response provides valid paymentId and mpPaymentId', async () => {
      expect(paymentId).toBeDefined();
      const paymentInDb = await db.payment.findUnique({ where: { id: paymentId } });
      expect(paymentInDb).toBeTruthy();
      expect(paymentInDb?.searchJobId).toBe(checkoutJobId);
      expect(paymentInDb?.amount).toBe(19.90);
    });

    test('4.3 Payment provides BACEN EMV-compliant PIX copia-e-cola string', async () => {
      const paymentInDb = await db.payment.findUnique({ where: { id: paymentId } });
      expect(paymentInDb?.qrCode).toBeDefined();
      expect(paymentInDb?.qrCode?.startsWith('00020126580014br.gov.bcb.pix')).toBeTruthy();
      expect(paymentInDb?.qrCode).toContain('19.90');
    });

    test('4.4 Payment provides base64-encoded QR code graphic payload', async () => {
      const paymentInDb = await db.payment.findUnique({ where: { id: paymentId } });
      expect(paymentInDb?.qrCodeBase64).toBeDefined();
      expect(paymentInDb?.qrCodeBase64?.length).toBeGreaterThan(50);
    });

    test('4.5 Placeholder token TEST-1234567890-abcdef activates simulated mode gracefully', async () => {
      const pixReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: checkoutJobId }),
      });
      // The job already has a pending payment or will create another
      const pixRes = await postPixCheckout(pixReq);
      const pixData = await pixRes.json();
      expect(pixData.isSimulated).toBe(true);
      expect(pixData.mpPaymentId.startsWith('sim_')).toBeTruthy();
    });

    test('4.6 GET /api/checkout/status/[paymentId] returns pending status initially', async () => {
      const statusReq = new NextRequest(`http://localhost:3000/api/checkout/status/${paymentId}`);
      const statusRes = await getPaymentStatus(statusReq, { params: Promise.resolve({ paymentId }) });
      expect(statusRes.status).toBe(200);

      const statusData = await statusRes.json();
      expect(statusData.status).toBe('pending');
      expect(statusData.isPaid).toBe(false);
    });

    test('4.7 GET /api/checkout/status/[paymentId]?simulateApprove=true approves payment', async () => {
      const statusReq = new NextRequest(
        `http://localhost:3000/api/checkout/status/${paymentId}?simulateApprove=true`
      );
      const statusRes = await getPaymentStatus(statusReq, { params: Promise.resolve({ paymentId }) });
      expect(statusRes.status).toBe(200);

      const statusData = await statusRes.json();
      expect(statusData.status).toBe('approved');
      expect(statusData.isPaid).toBe(true);
    });

    test('4.8 Simulated approval updates SearchJob.isPaid to true in SQLite', async () => {
      const updatedJob = await db.searchJob.findUnique({ where: { id: checkoutJobId } });
      expect(updatedJob?.isPaid).toBe(true);
    });

    test('4.9 Unlocked SearchJob returns all leads open in GET /api/search/[id]', async () => {
      const getReq = new NextRequest(`http://localhost:3000/api/search/${checkoutJobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: checkoutJobId }) });
      expect(getRes.status).toBe(200);

      const data = await getRes.json();
      expect(data.job.isPaid).toBe(true);
      expect(Array.isArray(data.leads)).toBeTruthy();
      expect(data.leads.length).toBeGreaterThanOrEqual(15);
      expect(data.lockedCount).toBe(0);
    });
  });

  describe('Feature 11-12: Excel (.xlsx) Export & Security Gate', () => {
    let paidJobId: string;
    let unpaidJobId: string;

    test('5.1 GET /api/export/[id] returns HTTP 403 Forbidden when isPaid is false', async () => {
      const postReq = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: 'Contabilidade', location: 'Curitiba - PR' }),
      });
      const postRes = await postSearch(postReq);
      const postData = await postRes.json();
      unpaidJobId = postData.jobId;
      createdJobIds.push(unpaidJobId);

      const exportReq = new NextRequest(`http://localhost:3000/api/export/${unpaidJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: unpaidJobId }) });

      expect(exportRes.status).toBe(403);
      const data = await exportRes.json();
      expect(data.error).toBeDefined();
      expect(data.error).toContain('bloqueado');
    });

    test('5.2 GET /api/export/[id] returns HTTP 200 with Excel content type when isPaid is true', async () => {
      // Create and approve a job
      const postReq = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: 'Academias', location: 'Florianópolis - SC' }),
      });
      const postRes = await postSearch(postReq);
      const postData = await postRes.json();
      paidJobId = postData.jobId;
      createdJobIds.push(paidJobId);

      // Approve job directly in database
      await db.searchJob.update({
        where: { id: paidJobId },
        data: { isPaid: true },
      });

      const exportReq = new NextRequest(`http://localhost:3000/api/export/${paidJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: paidJobId }) });

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    test('5.3 Export response includes Content-Disposition header with filename matching leads_*.xlsx', async () => {
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${paidJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: paidJobId }) });

      const disposition = exportRes.headers.get('content-disposition');
      expect(disposition).toBeDefined();
      expect(disposition).toContain('attachment;');
      expect(disposition).toContain('filename="leads_');
      expect(disposition).toContain('.xlsx"');
    });

    test('5.4 Exported buffer parses as valid Excel workbook with XLSX reader', async () => {
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${paidJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: paidJobId }) });

      const arrayBuffer = await exportRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      expect(buffer.length).toBeGreaterThan(1000);

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      expect(workbook.SheetNames.length).toBeGreaterThan(0);
      expect(workbook.SheetNames[0]).toContain('Leads');
    });

    test('5.5 Exported worksheet contains rows matching database lead count', async () => {
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${paidJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: paidJobId }) });

      const buffer = Buffer.from(await exportRes.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const dbLeadsCount = await db.lead.count({ where: { searchJobId: paidJobId } });
      expect(rows.length).toBe(dbLeadsCount);
    });
  });
}

// Standalone execution support
if (process.argv[1]?.includes('tier1-features')) {
  registerTier1Tests();
  registry
    .run('Tier 1: Feature Coverage')
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
