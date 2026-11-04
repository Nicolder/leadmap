import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { POST as postSearch } from '@/app/api/search/route';
import { GET as getSearchById } from '@/app/api/search/[id]/route';
import { POST as postPixCheckout } from '@/app/api/checkout/pix/route';
import { GET as getPaymentStatus } from '@/app/api/checkout/status/[paymentId]/route';
import { GET as getExport } from '@/app/api/export/[id]/route';
import { POST as postWebhook } from '@/app/api/webhooks/mercadopago/route';
import { describe, test, expect, registry } from './test-utils';

export function registerTier3Tests() {
  let createdJobIds: string[] = [];

  describe('Combination 1: Complete End-to-End User Conversion Funnel', () => {
    let funnelJobId: string;
    let funnelPaymentId: string;
    let totalLeadsFound: number;

    test('3.1 Step 1: User initiates search for "Clínica de Estética" in "Campinas - SP"', async () => {
      const searchReq = new NextRequest('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Clínica de Estética',
          location: 'Campinas - SP',
        }),
      });

      const searchRes = await postSearch(searchReq);
      expect(searchRes.status).toBe(200);

      const searchData = await searchRes.json();
      expect(searchData.jobId).toBeDefined();
      expect(searchData.totalFound).toBeGreaterThanOrEqual(15);

      funnelJobId = searchData.jobId;
      totalLeadsFound = searchData.totalFound;
      createdJobIds.push(funnelJobId);
    });

    test('3.2 Step 2: User arrives at results page, receiving 5 free leads and blurred remaining', async () => {
      expect(funnelJobId).toBeDefined();
      const previewReq = new NextRequest(`http://localhost:3000/api/search/${funnelJobId}`);
      const previewRes = await getSearchById(previewReq, { params: Promise.resolve({ id: funnelJobId }) });

      expect(previewRes.status).toBe(200);
      const data = await previewRes.json();

      expect(data.job.isPaid).toBe(false);
      expect(data.sampleLeads.length).toBe(5);
      expect(data.lockedCount).toBe(totalLeadsFound - 5);
      expect(data.lockedLeads.length).toBe(totalLeadsFound - 5);

      // Verify server-side security masking
      for (const locked of data.lockedLeads) {
        expect(locked.phone).toContain('****');
        expect(locked.whatsappUrl).toBe('#');
      }
    });

    test('3.3 Step 3: Unauthenticated user attempts direct Excel export before paying and gets 403', async () => {
      expect(funnelJobId).toBeDefined();
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${funnelJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: funnelJobId }) });

      expect(exportRes.status).toBe(403);
      const errorData = await exportRes.json();
      expect(errorData.error).toContain('bloqueado');
    });

    test('3.4 Step 4: User opens checkout modal, generating PIX QR Code for R$ 19.90', async () => {
      expect(funnelJobId).toBeDefined();
      const pixReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchJobId: funnelJobId,
          email: 'leadmap.buyer@empresa.com.br',
        }),
      });

      const pixRes = await postPixCheckout(pixReq);
      expect(pixRes.status).toBe(200);

      const pixData = await pixRes.json();
      expect(pixData.paymentId).toBeDefined();
      expect(pixData.amount).toBe(19.90);
      expect(pixData.qrCode.startsWith('00020126580014br.gov.bcb.pix')).toBeTruthy();
      expect(pixData.qrCodeBase64.length).toBeGreaterThan(50);
      expect(pixData.isSimulated).toBe(true);

      funnelPaymentId = pixData.paymentId;
    });

    test('3.5 Step 5: Frontend polls payment status, receiving pending status', async () => {
      expect(funnelPaymentId).toBeDefined();
      const statusReq = new NextRequest(`http://localhost:3000/api/checkout/status/${funnelPaymentId}`);
      const statusRes = await getPaymentStatus(statusReq, { params: Promise.resolve({ paymentId: funnelPaymentId }) });

      expect(statusRes.status).toBe(200);
      const statusData = await statusRes.json();
      expect(statusData.status).toBe('pending');
      expect(statusData.isPaid).toBe(false);
    });

    test('3.6 Step 6: Payment is approved via simulation webhook / simulateApprove parameter', async () => {
      expect(funnelPaymentId).toBeDefined();
      const approveReq = new NextRequest(
        `http://localhost:3000/api/checkout/status/${funnelPaymentId}?simulateApprove=true`
      );
      const approveRes = await getPaymentStatus(approveReq, {
        params: Promise.resolve({ paymentId: funnelPaymentId }),
      });

      expect(approveRes.status).toBe(200);
      const approveData = await approveRes.json();
      expect(approveData.status).toBe('approved');
      expect(approveData.isPaid).toBe(true);
    });

    test('3.7 Step 7: Results page updates, presenting full unlocked dataset without blur', async () => {
      expect(funnelJobId).toBeDefined();
      const unlockedReq = new NextRequest(`http://localhost:3000/api/search/${funnelJobId}`);
      const unlockedRes = await getSearchById(unlockedReq, { params: Promise.resolve({ id: funnelJobId }) });

      expect(unlockedRes.status).toBe(200);
      const data = await unlockedRes.json();

      expect(data.job.isPaid).toBe(true);
      expect(data.leads.length).toBe(totalLeadsFound);
      expect(data.lockedCount).toBe(0);

      // Verify all leads now have valid unmasked phone numbers
      for (const lead of data.leads) {
        if (lead.phone) {
          expect(lead.phone.includes('****')).toBeFalsy();
        }
      }
    });

    test('3.8 Step 8: User downloads Excel spreadsheet successfully with complete data', async () => {
      expect(funnelJobId).toBeDefined();
      const exportReq = new NextRequest(`http://localhost:3000/api/export/${funnelJobId}`);
      const exportRes = await getExport(exportReq, { params: Promise.resolve({ id: funnelJobId }) });

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const buffer = Buffer.from(await exportRes.arrayBuffer());
      expect(buffer.length).toBeGreaterThan(2000);

      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      expect(rows.length).toBe(totalLeadsFound);
    });
  });

  describe('Combination 2: Double Payment Prevention & Idempotency', () => {
    test('3.9 Once a SearchJob is paid, subsequent checkout requests are rejected cleanly', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Escola de Idiomas',
          location: 'Curitiba - PR',
          isPaid: true,
        },
      });
      createdJobIds.push(job.id);

      const checkoutReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id }),
      });
      const checkoutRes = await postPixCheckout(checkoutReq);
      expect(checkoutRes.status).toBe(200);

      const data = await checkoutRes.json();
      expect(data.isPaid).toBe(true);
      expect(data.message).toContain('desbloqueada');
    });
  });

  describe('Combination 3: Search Isolation & Payment Gate Integrity', () => {
    test('3.10 Approving Search A does NOT unlock Search B (zero permission leakage)', async () => {
      // Create Search A
      const jobA = await db.searchJob.create({
        data: {
          niche: 'Mecânica Automotiva',
          location: 'São Paulo - SP',
          isPaid: false,
          leads: {
            create: [{ name: 'Mecânica A', category: 'Mecânica', phone: '(11) 98888-0001' }],
          },
        },
      });
      createdJobIds.push(jobA.id);

      // Create Search B
      const jobB = await db.searchJob.create({
        data: {
          niche: 'Restaurante Vegetariano',
          location: 'Porto Alegre - RS',
          isPaid: false,
          leads: {
            create: [{ name: 'Restaurante B', category: 'Restaurante', phone: '(51) 98888-0002' }],
          },
        },
      });
      createdJobIds.push(jobB.id);

      // Create payment and approve ONLY Job A
      const paymentA = await db.payment.create({
        data: {
          searchJobId: jobA.id,
          mpPaymentId: `sim_jobA_${Date.now()}`,
          amount: 19.90,
          status: 'pending',
        },
      });

      const approveReq = new NextRequest(
        `http://localhost:3000/api/checkout/status/${paymentA.id}?simulateApprove=true`
      );
      await getPaymentStatus(approveReq, { params: Promise.resolve({ paymentId: paymentA.id }) });

      // Verify Job A export is permitted (200)
      const exportReqA = new NextRequest(`http://localhost:3000/api/export/${jobA.id}`);
      const exportResA = await getExport(exportReqA, { params: Promise.resolve({ id: jobA.id }) });
      expect(exportResA.status).toBe(200);

      // Verify Job B export is STRICTLY FORBIDDEN (403)
      const exportReqB = new NextRequest(`http://localhost:3000/api/export/${jobB.id}`);
      const exportResB = await getExport(exportReqB, { params: Promise.resolve({ id: jobB.id }) });
      expect(exportResB.status).toBe(403);
    });
  });

  describe('Combination 4: Webhook Resilience & Gateway Callback Handling', () => {
    test('3.11 Webhook handles empty notifications gracefully without throwing', async () => {
      const webhookReq = new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const webhookRes = await postWebhook(webhookReq);
      expect(webhookRes.status).toBe(200);
      const data = await webhookRes.json();
      expect(data.received).toBe(true);
    });

    test('3.12 Webhook handles unrecognized topic gracefully', async () => {
      const webhookReq = new NextRequest(
        'http://localhost:3000/api/webhooks/mercadopago?type=unknown_event&id=12345',
        { method: 'POST' }
      );

      const webhookRes = await postWebhook(webhookReq);
      expect(webhookRes.status).toBe(200);
      const data = await webhookRes.json();
      expect(data.received).toBe(true);
    });
  });
}

// Standalone execution support
if (process.argv[1]?.includes('tier3-combinations')) {
  registerTier3Tests();
  registry
    .run('Tier 3: Cross-Feature Combinations')
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
