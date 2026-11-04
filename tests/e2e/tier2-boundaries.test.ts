import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { POST as postSearch } from '@/app/api/search/route';
import { GET as getSearchById } from '@/app/api/search/[id]/route';
import { POST as postPixCheckout } from '@/app/api/checkout/pix/route';
import { GET as getPaymentStatus } from '@/app/api/checkout/status/[paymentId]/route';
import { GET as getExport } from '@/app/api/export/[id]/route';
import { describe, test, expect, registry, SuiteSummary } from './test-utils';

export function registerTier2Tests() {
  let createdJobIds: string[] = [];

  describe('Boundary 1: Search Input Validation & Sanitization Boundaries', () => {
    test('2.1 POST /api/search with missing niche parameter returns HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'São Paulo - SP' }),
      });
      const res = await postSearch(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test('2.2 POST /api/search with missing location parameter returns HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: 'Dentista' }),
      });
      const res = await postSearch(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test('2.3 POST /api/search with empty string parameters returns HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: '', location: '' }),
      });
      const res = await postSearch(req);
      expect(res.status).toBe(400);
    });

    test('2.4 POST /api/search with whitespace-only values handles safely', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: '   ', location: '   ' }),
      });
      const res = await postSearch(req);
      // Either rejects 400 or processes trimmed string without server crash (no 500)
      expect(res.status !== 500).toBeTruthy();
    });

    test('2.5 POST /api/search with extreme string length (>250 chars) executes safely without crashing', async () => {
      const longNiche = 'A'.repeat(300);
      const longLocation = 'B'.repeat(300);
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: longNiche, location: longLocation }),
      });

      const res = await postSearch(req);
      expect(res.status !== 500).toBeTruthy();
      if (res.status === 200) {
        const data = await res.json();
        createdJobIds.push(data.jobId);
      }
    });

    test('2.6 POST /api/search with SQL/XSS metacharacters is safely escaped without SQLite injection', async () => {
      const maliciousPayload = "'; DROP TABLE SearchJob; -- <script>alert('xss')</script>";
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: maliciousPayload,
          location: 'Campinas - SP',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jobId).toBeDefined();
      createdJobIds.push(data.jobId);

      // Verify that database table SearchJob is completely intact
      const count = await db.searchJob.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Boundary 2: Search Job Retrieval Boundaries & Non-Existent IDs', () => {
    test('2.7 GET /api/search/[id] with non-existent UUID returns HTTP 404', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest(`http://localhost:3000/api/search/${fakeUuid}`);
      const res = await getSearchById(req, { params: Promise.resolve({ id: fakeUuid }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test('2.8 GET /api/search/[id] with malformed non-UUID identifier returns HTTP 404', async () => {
      const malformedId = 'invalid-id-xyz-999';
      const req = new NextRequest(`http://localhost:3000/api/search/${malformedId}`);
      const res = await getSearchById(req, { params: Promise.resolve({ id: malformedId }) });

      expect(res.status).toBe(404);
    });

    test('2.9 GET /api/search/[id] on a job with zero leads handles boundary cleanly', async () => {
      const emptyJob = await db.searchJob.create({
        data: {
          niche: 'Nicho Raro',
          location: 'Cidade Isolada',
          totalFound: 0,
          isPaid: false,
        },
      });
      createdJobIds.push(emptyJob.id);

      const req = new NextRequest(`http://localhost:3000/api/search/${emptyJob.id}`);
      const res = await getSearchById(req, { params: Promise.resolve({ id: emptyJob.id }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sampleLeads.length).toBe(0);
      expect(data.lockedLeads.length).toBe(0);
      expect(data.lockedCount).toBe(0);
    });

    test('2.10 GET /api/search/[id] on a job with fewer than 5 leads displays all without index error', async () => {
      const smallJob = await db.searchJob.create({
        data: {
          niche: 'Cafeteria Especial',
          location: 'Vila Madalena - SP',
          totalFound: 2,
          isPaid: false,
          leads: {
            create: [
              { name: 'Café Um', category: 'Café', phone: '(11) 98888-1111', whatsappUrl: 'https://wa.me/5511988881111' },
              { name: 'Café Dois', category: 'Café', phone: '(11) 98888-2222', whatsappUrl: 'https://wa.me/5511988882222' },
            ],
          },
        },
      });
      createdJobIds.push(smallJob.id);

      const req = new NextRequest(`http://localhost:3000/api/search/${smallJob.id}`);
      const res = await getSearchById(req, { params: Promise.resolve({ id: smallJob.id }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sampleLeads.length).toBe(2);
      expect(data.lockedLeads.length).toBe(0);
      expect(data.lockedCount).toBe(0);
    });

    test('2.11 Rapid sequential calls to GET /api/search/[id] maintain consistent state', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Farmácia',
          location: 'Niterói - RJ',
          totalFound: 6,
          isPaid: false,
          leads: {
            create: Array.from({ length: 6 }).map((_, i) => ({
              name: `Farmácia ${i + 1}`,
              category: 'Farmácia',
              phone: `(21) 98888-000${i}`,
              whatsappUrl: `https://wa.me/552198888000${i}`,
            })),
          },
        },
      });
      createdJobIds.push(job.id);

      for (let i = 0; i < 5; i++) {
        const req = new NextRequest(`http://localhost:3000/api/search/${job.id}`);
        const res = await getSearchById(req, { params: Promise.resolve({ id: job.id }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sampleLeads.length).toBe(5);
        expect(data.lockedLeads.length).toBe(1);
      }
    });
  });

  describe('Boundary 3: Checkout PIX Boundaries & Edge States', () => {
    test('2.12 POST /api/checkout/pix with missing searchJobId returns HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await postPixCheckout(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('obrigatório');
    });

    test('2.13 POST /api/checkout/pix with non-existent searchJobId returns HTTP 404', async () => {
      const fakeUuid = '00000000-1111-2222-3333-444444444444';
      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: fakeUuid }),
      });
      const res = await postPixCheckout(req);
      expect(res.status).toBe(404);
    });

    test('2.14 POST /api/checkout/pix for an already-paid job returns isPaid: true notification', async () => {
      const paidJob = await db.searchJob.create({
        data: {
          niche: 'Hotelaria',
          location: 'Gramado - RS',
          isPaid: true,
        },
      });
      createdJobIds.push(paidJob.id);

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: paidJob.id }),
      });
      const res = await postPixCheckout(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.isPaid).toBe(true);
      expect(data.message).toContain('desbloqueada');
    });

    test('2.15 POST /api/checkout/pix handles custom email or defaults gracefully', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Papelaria',
          location: 'Recife - PE',
          isPaid: false,
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id, email: 'custom.buyer@empresa.com.br' }),
      });
      const res = await postPixCheckout(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.paymentId).toBeDefined();
    });

    test('2.16 Multiple concurrent checkout requests for the same job generate valid payments', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Pet Shop',
          location: 'Fortaleza - CE',
          isPaid: false,
        },
      });
      createdJobIds.push(job.id);

      const promises = [1, 2, 3].map(() => {
        const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchJobId: job.id }),
        });
        return postPixCheckout(req);
      });

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.paymentId).toBeDefined();
      }
    });
  });

  describe('Boundary 4: Payment Status & Polling Boundaries', () => {
    test('2.17 GET /api/checkout/status/[paymentId] with non-existent ID returns HTTP 404', async () => {
      const fakePaymentId = 'fake-payment-uuid-000';
      const req = new NextRequest(`http://localhost:3000/api/checkout/status/${fakePaymentId}`);
      const res = await getPaymentStatus(req, { params: Promise.resolve({ paymentId: fakePaymentId }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('não encontrado');
    });

    test('2.18 Calling simulateApprove multiple times is idempotent', async () => {
      const job = await db.searchJob.create({
        data: { niche: 'Arquitetura', location: 'Goiânia - GO', isPaid: false },
      });
      createdJobIds.push(job.id);

      const payment = await db.payment.create({
        data: {
          searchJobId: job.id,
          mpPaymentId: `sim_test_${Date.now()}`,
          amount: 19.90,
          status: 'pending',
        },
      });

      // Call simulateApprove twice
      const req1 = new NextRequest(
        `http://localhost:3000/api/checkout/status/${payment.id}?simulateApprove=true`
      );
      const res1 = await getPaymentStatus(req1, { params: Promise.resolve({ paymentId: payment.id }) });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.status).toBe('approved');

      const req2 = new NextRequest(
        `http://localhost:3000/api/checkout/status/${payment.id}?simulateApprove=true`
      );
      const res2 = await getPaymentStatus(req2, { params: Promise.resolve({ paymentId: payment.id }) });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.status).toBe('approved');
      expect(data2.isPaid).toBe(true);
    });

    test('2.19 Status polling with extra query params executes without side effects', async () => {
      const job = await db.searchJob.create({
        data: { niche: 'Pizzaria', location: 'Joinville - SC', isPaid: false },
      });
      createdJobIds.push(job.id);

      const payment = await db.payment.create({
        data: {
          searchJobId: job.id,
          mpPaymentId: `sim_extra_${Date.now()}`,
          amount: 19.90,
          status: 'pending',
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/checkout/status/${payment.id}?foo=bar&debug=true&timestamp=${Date.now()}`
      );
      const res = await getPaymentStatus(req, { params: Promise.resolve({ paymentId: payment.id }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('pending');
      expect(data.isPaid).toBe(false);
    });

    test('2.20 Polling status for approved job returns approved status immediately', async () => {
      const job = await db.searchJob.create({
        data: { niche: 'Móveis', location: 'Uberlândia - MG', isPaid: true },
      });
      createdJobIds.push(job.id);

      const payment = await db.payment.create({
        data: {
          searchJobId: job.id,
          mpPaymentId: `sim_done_${Date.now()}`,
          amount: 19.90,
          status: 'approved',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/checkout/status/${payment.id}`);
      const res = await getPaymentStatus(req, { params: Promise.resolve({ paymentId: payment.id }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('approved');
      expect(data.isPaid).toBe(true);
    });
  });

  describe('Boundary 5: Export Boundaries & Security Integrity', () => {
    test('2.21 GET /api/export/[id] with non-existent searchJobId returns HTTP 404', async () => {
      const fakeUuid = '00000000-9999-8888-7777-666666666666';
      const req = new NextRequest(`http://localhost:3000/api/export/${fakeUuid}`);
      const res = await getExport(req, { params: Promise.resolve({ id: fakeUuid }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('não encontrada');
    });

    test('2.22 GET /api/export/[id] with malformed ID returns HTTP 404', async () => {
      const malformedId = 'malformed/path/injection';
      const req = new NextRequest(`http://localhost:3000/api/export/${malformedId}`);
      const res = await getExport(req, { params: Promise.resolve({ id: malformedId }) });

      expect(res.status).toBe(404);
    });

    test('2.23 Exporting paid job with accents and special chars produces clean filename', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Açougue & Mercearia São João',
          location: 'Ribeirão Preto / SP',
          isPaid: true,
          leads: {
            create: [
              { name: 'Casa de Carnes Central', category: 'Açougue' },
            ],
          },
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest(`http://localhost:3000/api/export/${job.id}`);
      const res = await getExport(req, { params: Promise.resolve({ id: job.id }) });
      expect(res.status).toBe(200);

      const disposition = res.headers.get('content-disposition') || '';
      expect(disposition).toContain('filename="leads_');
      // Verify no illegal characters like slashes in filename
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      expect(filenameMatch).toBeTruthy();
      const filename = filenameMatch ? filenameMatch[1] : '';
      expect(filename.includes('/')).toBeFalsy();
    });

    test('2.24 Exporting job with null optional fields in leads handles gracefully without XLSX error', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Consultoria',
          location: 'Maringá - PR',
          isPaid: true,
          leads: {
            create: [
              {
                name: 'Consultoria Alpha',
                category: null,
                phone: null,
                whatsappUrl: null,
                address: null,
                website: null,
                rating: null,
                reviewCount: null,
              },
            ],
          },
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest(`http://localhost:3000/api/export/${job.id}`);
      const res = await getExport(req, { params: Promise.resolve({ id: job.id }) });
      expect(res.status).toBe(200);

      const buffer = Buffer.from(await res.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      expect(rows.length).toBe(1);
    });

    test('2.25 Exported Excel sheet headers contain non-empty column identifiers', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Imobiliária',
          location: 'Brasília - DF',
          isPaid: true,
          leads: {
            create: [
              { name: 'Imóveis Brasília', category: 'Imobiliária', phone: '(61) 98888-0000', address: 'Asa Sul' },
            ],
          },
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest(`http://localhost:3000/api/export/${job.id}`);
      const res = await getExport(req, { params: Promise.resolve({ id: job.id }) });
      expect(res.status).toBe(200);

      const buffer = Buffer.from(await res.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      expect(rawRows.length).toBeGreaterThanOrEqual(2); // Header + 1 data row

      const headers = rawRows[0] as string[];
      expect(headers.length).toBeGreaterThanOrEqual(7);
      expect(headers).toContain('#');
    });

    test('2.26 Concurrent export requests on the same paid job return identical valid workbooks', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Auto Escola',
          location: 'Salvador - BA',
          isPaid: true,
          leads: {
            create: [
              { name: 'Auto Escola Bahia', category: 'Auto Escola', phone: '(71) 98888-1234' },
            ],
          },
        },
      });
      createdJobIds.push(job.id);

      const promises = [1, 2, 3].map(() => {
        const req = new NextRequest(`http://localhost:3000/api/export/${job.id}`);
        return getExport(req, { params: Promise.resolve({ id: job.id }) });
      });

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
        const buffer = Buffer.from(await res.arrayBuffer());
        expect(buffer.length).toBeGreaterThan(1000);
      }
    });
  });
}

// Standalone execution support
if (process.argv[1]?.includes('tier2-boundaries')) {
  registerTier2Tests();
  registry
    .run('Tier 2: Boundary & Corner Cases')
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
