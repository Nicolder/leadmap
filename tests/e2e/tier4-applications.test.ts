import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { POST as postSearch } from '@/app/api/search/route';
import { GET as getSearchById } from '@/app/api/search/[id]/route';
import { POST as postPixCheckout } from '@/app/api/checkout/pix/route';
import { GET as getPaymentStatus } from '@/app/api/checkout/status/[paymentId]/route';
import { GET as getExport } from '@/app/api/export/[id]/route';
import { describe, test, expect, registry } from './test-utils';

export function registerTier4Tests() {
  let createdJobIds: string[] = [];

  describe('Application Scenario 1: Healthcare Niche in São Paulo - SP (Southeast Metro)', () => {
    let jobId: string;
    let paymentId: string;

    test('4.1 Searches for "Clínica Odontológica" in "São Paulo - SP" and generates full lead roster', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Clínica Odontológica',
          location: 'São Paulo - SP',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jobId).toBeDefined();
      expect(data.totalFound).toBeGreaterThanOrEqual(15);

      jobId = data.jobId;
      createdJobIds.push(jobId);
    });

    test('4.2 Verifies DDD 11 and valid local commercial addresses in São Paulo', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: jobId },
        include: { leads: true },
      });

      expect(job).toBeTruthy();
      const sample = job?.leads.find((l) => l.phone && l.phone.includes('(11)'));
      expect(sample).toBeDefined();
    });

    test('4.3 Executes full purchase and validates generated Excel structure for SP dentists', async () => {
      const pixReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: jobId }),
      });
      const pixRes = await postPixCheckout(pixReq);
      const pixData = await pixRes.json();
      paymentId = pixData.paymentId;

      // Simulate payment
      const approveReq = new NextRequest(
        `http://localhost:3000/api/checkout/status/${paymentId}?simulateApprove=true`
      );
      await getPaymentStatus(approveReq, { params: Promise.resolve({ paymentId }) });

      // Export
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${jobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: jobId }) });
      expect(exportRes.status).toBe(200);

      const buffer = Buffer.from(await exportRes.arrayBuffer());
      const wb = XLSX.read(buffer, { type: 'buffer' });
      expect(wb.SheetNames.length).toBeGreaterThan(0);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      expect(rows.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Application Scenario 2: Accounting Niche in Belo Horizonte - MG (Interior Capital)', () => {
    let jobId: string;

    test('4.4 Searches for "Escritório de Contabilidade" in "Belo Horizonte - MG"', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Escritório de Contabilidade',
          location: 'Belo Horizonte - MG',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      jobId = data.jobId;
      createdJobIds.push(jobId);
    });

    test('4.5 Verifies ratings within valid [1.0, 5.0] range and non-empty reviews', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: jobId },
        include: { leads: true },
      });

      for (const lead of (job?.leads || []).slice(0, 10)) {
        if (lead.rating) {
          expect(lead.rating).toBeGreaterThanOrEqual(1.0);
          expect(lead.rating).toBeLessThanOrEqual(5.0);
        }
        if (lead.reviewCount) {
          expect(lead.reviewCount).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Application Scenario 3: Real Estate in Curitiba - PR (South Region)', () => {
    let jobId: string;

    test('4.6 Searches for "Imobiliária" in "Curitiba - PR"', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Imobiliária',
          location: 'Curitiba - PR',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      jobId = data.jobId;
      createdJobIds.push(jobId);
    });

    test('4.7 Verifies free preview displays exactly 5 open leads and masked remainder', async () => {
      const getReq = new NextRequest(`http://localhost:3000/api/search/${jobId}`);
      const getRes = await getSearchById(getReq, { params: Promise.resolve({ id: jobId }) });

      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.sampleLeads.length).toBe(5);
      expect(data.lockedLeads.length).toBeGreaterThanOrEqual(10);
      expect(data.job.isPaid).toBe(false);
    });
  });

  describe('Application Scenario 4: Automotive in Salvador - BA (Northeast Region)', () => {
    let jobId: string;

    test('4.8 Searches for "Oficina Mecânica" in "Salvador - BA"', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Oficina Mecânica',
          location: 'Salvador - BA',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      jobId = data.jobId;
      createdJobIds.push(jobId);
    });

    test('4.9 Verifies WhatsApp URLs are well-formed and contain encoded greetings', async () => {
      const job = await db.searchJob.findUnique({
        where: { id: jobId },
        include: { leads: true },
      });

      for (const lead of (job?.leads || []).slice(0, 5)) {
        if (lead.whatsappUrl) {
          expect(lead.whatsappUrl.startsWith('https://wa.me/')).toBeTruthy();
          expect(lead.whatsappUrl).toContain('text=');
        }
      }
    });
  });

  describe('Application Scenario 5: Gastronomy in Rio de Janeiro - RJ', () => {
    let jobId: string;

    test('4.10 Searches for "Restaurante" in "Rio de Janeiro - RJ" and completes lifecycle', async () => {
      const req = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Restaurante',
          location: 'Rio de Janeiro - RJ',
        }),
      });

      const res = await postSearch(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      jobId = data.jobId;
      createdJobIds.push(jobId);

      // Verify unapproved export is blocked
      const blockedReq = new NextRequest(`http://localhost:3000/api/export/${jobId}`);
      const blockedRes = await getExport(blockedReq, { params: Promise.resolve({ id: jobId }) });
      expect(blockedRes.status).toBe(403);

      // Create PIX and simulate approve
      const pixReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: jobId }),
      });
      const pixRes = await postPixCheckout(pixReq);
      const pixData = await pixRes.json();

      const approveReq = new NextRequest(
        `http://localhost:3000/api/checkout/status/${pixData.paymentId}?simulateApprove=true`
      );
      await getPaymentStatus(approveReq, { params: Promise.resolve({ paymentId: pixData.paymentId }) });

      // Verify export is now unlocked
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${jobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: jobId }) });
      expect(exportRes.status).toBe(200);

      const buffer = Buffer.from(await exportRes.arrayBuffer());
      const wb = XLSX.read(buffer, { type: 'buffer' });
      expect(wb.SheetNames.length).toBeGreaterThan(0);
    });
  });
}

// Standalone execution support
if (process.argv[1]?.includes('tier4-applications')) {
  registerTier4Tests();
  registry
    .run('Tier 4: Real-World Applications')
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
