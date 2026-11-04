/**
 * Challenger 2 Adversarial Test Suite for Milestones M2 & M3
 *
 * Focus Areas:
 * 1. Server-Side Masking Security & Free Preview Gate (leads 6+ zero-leak proof)
 * 2. PIX Payment Lifecycle, Amount Check (R$ 19,90), Token Fallback, and Simulation Approval
 * 3. Excel Export (.xlsx) Binary Integrity, Security 403 Gate, and 10 Column Contract (including 'Cidade')
 * 4. Boundary & Adversarial Injection Conditions
 */

import { NextRequest } from 'next/server';
import { GET as getSearchJob } from '@/app/api/search/[id]/route';
import { POST as postCheckoutPix } from '@/app/api/checkout/pix/route';
import { GET as getPaymentStatus } from '@/app/api/checkout/status/[paymentId]/route';
import { GET as getExport } from '@/app/api/export/[id]/route';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

interface TestContext {
  passed: number;
  failed: number;
  failures: string[];
}

const ctx: TestContext = {
  passed: 0,
  failed: 0,
  failures: [],
};

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    ctx.passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err: any) {
    ctx.failed++;
    ctx.failures.push(`${name}: ${err.message || err}`);
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31mError:\x1b[0m ${err.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

export async function runChallengerM2M3Suite() {
  console.log(`\n============================================================`);
  console.log(`  CHALLENGER 2: ADVERSARIAL STRESS TEST (M2 & M3)`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`============================================================\n`);

  const createdJobIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // GROUP 1: SERVER-SIDE PREVIEW MASKING & ZERO DATA LEAKAGE
    // -------------------------------------------------------------
    console.log(`--- SECTION 1: Preview Security & Zero-Leakage Masking ---`);

    await runTest('1.1 Unpaid search payload: 5 open leads and all 6+ leads server-redacted', async () => {
      // Create job with 12 leads having strictly descending ratings and unique secret identifiers
      const job = await db.searchJob.create({
        data: {
          niche: 'Dentistas',
          location: 'Campinas - SP',
          totalFound: 12,
          isPaid: false,
          leads: {
            create: Array.from({ length: 12 }).map((_, i) => ({
              name: `Clínica Odonto ${i + 1}`,
              category: 'Dentista',
              phone: `(19) 98765-43${i < 10 ? '0' + i : i}`,
              whatsappUrl: `https://wa.me/55199876543${i < 10 ? '0' + i : i}`,
              address: `Avenida Francisco Glicério, ${100 + i * 10}, Cambuí, Campinas - SP`,
              website: `https://odontoclinica${i + 1}-secretdomain.com.br`,
              rating: 5.0 - i * 0.1,
              reviewCount: 10 + i * 5,
            })),
          },
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest(`http://localhost:3000/api/search/${job.id}`);
      const res = await getSearchJob(req, { params: Promise.resolve({ id: job.id }) });
      assert(res.status === 200, `Expected HTTP 200, got ${res.status}`);

      const rawJson = await res.text();
      const data = JSON.parse(rawJson);

      assert(data.job.isPaid === false, 'Expected job.isPaid to be false');
      assert(data.sampleLeads.length === 5, `Expected 5 sampleLeads, got ${data.sampleLeads.length}`);
      assert(data.lockedLeads.length === 7, `Expected 7 lockedLeads, got ${data.lockedLeads.length}`);
      assert(data.unlockedCount === 5, `Expected unlockedCount 5, got ${data.unlockedCount}`);
      assert(data.lockedCount === 7, `Expected lockedCount 7, got ${data.lockedCount}`);

      // Inspect sampleLeads (first 5: i = 0 to 4)
      for (let i = 0; i < 5; i++) {
        const lead = data.sampleLeads[i];
        assert(!lead.isLocked, `sampleLead[${i}] should not be isLocked`);
        assert(lead.phone.includes('(19) 98765-43'), `sampleLead[${i}] phone should be unmasked`);
        assert(lead.whatsappUrl.includes('https://wa.me/5519'), `sampleLead[${i}] WhatsApp should be real`);
        assert(lead.address.includes('Cambuí'), `sampleLead[${i}] address should have neighborhood`);
        assert(lead.website.includes('-secretdomain.com.br'), `sampleLead[${i}] website should be real`);
      }

      // Inspect lockedLeads (6 to 12: i = 5 to 11)
      for (let i = 0; i < 7; i++) {
        const lead = data.lockedLeads[i];
        assert(lead.isLocked === true, `lockedLead[${i}] must have isLocked === true`);
        assert(/\(\d{2}\)\s*9\*{4}-\*{4}/.test(lead.phone), `lockedLead[${i}] phone not masked: ${lead.phone}`);
        assert(lead.whatsappUrl === '#', `lockedLead[${i}] whatsappUrl must be '#', got: ${lead.whatsappUrl}`);
        assert(lead.address.endsWith('Bairro ***'), `lockedLead[${i}] address must end with 'Bairro ***': ${lead.address}`);
        assert(lead.website === 'https://***.com.br', `lockedLead[${i}] website must be 'https://***.com.br': ${lead.website}`);
      }

      // Adversarial Check: Deep search in raw HTTP payload text
      // Verify that secret data of leads in lockedLeads (i = 5 to 11) is nowhere in the payload string
      for (let i = 5; i < 12; i++) {
        const secretPhoneDigits = `98765-43${i < 10 ? '0' + i : i}`;
        const secretDomain = `odontoclinica${i + 1}-secretdomain.com.br`;
        const secretWhatsapp = `55199876543${i < 10 ? '0' + i : i}`;

        assert(
          !rawJson.includes(secretPhoneDigits),
          `VULNERABILITY DETECTED: Raw phone "${secretPhoneDigits}" leaked in HTTP payload for locked lead ${i + 1}!`
        );
        assert(
          !rawJson.includes(secretDomain),
          `VULNERABILITY DETECTED: Raw website domain "${secretDomain}" leaked in HTTP payload for locked lead ${i + 1}!`
        );
        assert(
          !rawJson.includes(secretWhatsapp),
          `VULNERABILITY DETECTED: Raw WhatsApp phone "${secretWhatsapp}" leaked in HTTP payload for locked lead ${i + 1}!`
        );
      }
    });

    await runTest('1.2 Edge Case: Job with exactly 5 leads has 0 locked leads', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Cafeterias',
          location: 'Santos - SP',
          totalFound: 5,
          isPaid: false,
          leads: {
            create: Array.from({ length: 5 }).map((_, i) => ({
              name: `Café Santos ${i + 1}`,
              category: 'Cafeteria',
              phone: `(13) 3234-567${i}`,
              address: `Rua XV de Novembro, ${i + 1}, Centro, Santos - SP`,
            })),
          },
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest(`http://localhost:3000/api/search/${job.id}`);
      const res = await getSearchJob(req, { params: Promise.resolve({ id: job.id }) });
      const data = await res.json();

      assert(data.sampleLeads.length === 5, `Expected 5 sampleLeads, got ${data.sampleLeads.length}`);
      assert(data.lockedLeads.length === 0, `Expected 0 lockedLeads, got ${data.lockedLeads.length}`);
      assert(data.lockedCount === 0, `Expected lockedCount 0, got ${data.lockedCount}`);
      assert(data.unlockedCount === 5, `Expected unlockedCount 5, got ${data.unlockedCount}`);
    });

    await runTest('1.3 Edge Case: Job with fewer than 5 leads (e.g. 2 leads)', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Livrarias Raras',
          location: 'Paraty - RJ',
          totalFound: 2,
          isPaid: false,
          leads: {
            create: [
              { name: 'Livraria Histórica 1', category: 'Livraria', phone: '(24) 3371-1111' },
              { name: 'Livraria Histórica 2', category: 'Livraria', phone: '(24) 3371-2222' },
            ],
          },
        },
      });
      createdJobIds.push(job.id);

      const req = new NextRequest(`http://localhost:3000/api/search/${job.id}`);
      const res = await getSearchJob(req, { params: Promise.resolve({ id: job.id }) });
      const data = await res.json();

      assert(data.sampleLeads.length === 2, `Expected 2 sampleLeads, got ${data.sampleLeads.length}`);
      assert(data.lockedLeads.length === 0, `Expected 0 lockedLeads, got ${data.lockedLeads.length}`);
      assert(data.lockedCount === 0, `Expected lockedCount 0, got ${data.lockedCount}`);
      assert(data.unlockedCount === 2, `Expected unlockedCount 2, got ${data.unlockedCount}`);
    });

    // -------------------------------------------------------------
    // GROUP 2: PIX CHECKOUT LIFECYCLE & FALLBACK SIMULATION
    // -------------------------------------------------------------
    console.log(`\n--- SECTION 2: PIX Checkout Lifecycle, Pricing & Simulation ---`);

    let activeJobId = '';
    let generatedPaymentId = '';

    await runTest('2.1 POST /api/checkout/pix rejects missing searchJobId with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await postCheckoutPix(req);
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const data = await res.json();
      assert(data.error === 'ID da busca é obrigatório.', `Unexpected error msg: ${data.error}`);
    });

    await runTest('2.2 POST /api/checkout/pix rejects non-existent job ID with HTTP 404', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: 'non-existent-uuid-999999' }),
      });
      const res = await postCheckoutPix(req);
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await runTest('2.3 POST /api/checkout/pix creates PIX charge: R$ 19,90, fallback token simulation', async () => {
      const job = await db.searchJob.create({
        data: {
          niche: 'Academias',
          location: 'Belo Horizonte - MG',
          totalFound: 10,
          isPaid: false,
          leads: {
            create: Array.from({ length: 10 }).map((_, i) => ({
              name: `Academia Fit ${i + 1}`,
              category: 'Academia',
              phone: `(31) 3200-000${i}`,
            })),
          },
        },
      });
      createdJobIds.push(job.id);
      activeJobId = job.id;

      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: job.id, email: 'gestor@academiafit.com' }),
      });
      const res = await postCheckoutPix(req);
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      const data = await res.json();
      assert(typeof data.paymentId === 'string' && data.paymentId.length > 0, 'paymentId must be string');
      assert(data.amount === 19.90, `Expected amount 19.90, got ${data.amount}`);
      assert(data.isSimulated === true, 'Placeholder token must trigger isSimulated: true');
      assert(data.mpPaymentId.startsWith('sim_'), `mpPaymentId must start with 'sim_', got ${data.mpPaymentId}`);
      assert(data.qrCode.startsWith('00020126580014br.gov.bcb.pix'), 'qrCode must adhere to BACEN PIX standard format');
      assert(data.qrCode.includes('540519.90'), 'qrCode EMV string must include the 19.90 transaction amount');
      assert(typeof data.qrCodeBase64 === 'string' && data.qrCodeBase64.length > 20, 'qrCodeBase64 must be populated');

      // Verify DB record
      const dbPayment = await db.payment.findUnique({ where: { id: data.paymentId } });
      assert(!!dbPayment, 'Payment record must exist in SQLite db');
      assert(dbPayment!.amount === 19.90, `DB payment amount must be 19.90, got ${dbPayment!.amount}`);
      assert(dbPayment!.status === 'pending', `DB payment status must be pending, got ${dbPayment!.status}`);
      assert(dbPayment!.searchJobId === job.id, 'DB payment searchJobId mismatch');

      generatedPaymentId = data.paymentId;
    });

    await runTest('2.4 GET /api/checkout/status/[paymentId] returns pending before approval', async () => {
      assert(!!generatedPaymentId, 'Missing paymentId from previous step');
      const req = new NextRequest(`http://localhost:3000/api/checkout/status/${generatedPaymentId}`);
      const res = await getPaymentStatus(req, { params: Promise.resolve({ paymentId: generatedPaymentId }) });
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      const data = await res.json();
      assert(data.status === 'pending', `Expected status 'pending', got ${data.status}`);
      assert(data.isPaid === false, `Expected isPaid false, got ${data.isPaid}`);
      assert(data.jobId === activeJobId, `Expected jobId ${activeJobId}, got ${data.jobId}`);
    });

    await runTest('2.5 GET /api/checkout/status/[paymentId]?simulateApprove=true flips isPaid to true', async () => {
      assert(!!generatedPaymentId, 'Missing paymentId from previous step');
      const req = new NextRequest(
        `http://localhost:3000/api/checkout/status/${generatedPaymentId}?simulateApprove=true`
      );
      const res = await getPaymentStatus(req, { params: Promise.resolve({ paymentId: generatedPaymentId }) });
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      const data = await res.json();
      assert(data.status === 'approved', `Expected status 'approved', got ${data.status}`);
      assert(data.isPaid === true, `Expected isPaid true, got ${data.isPaid}`);
      assert(data.jobId === activeJobId, `Expected jobId ${activeJobId}, got ${data.jobId}`);

      // Verify DB state
      const dbPayment = await db.payment.findUnique({ where: { id: generatedPaymentId } });
      assert(dbPayment!.status === 'approved', 'DB payment status must be updated to approved');

      const dbJob = await db.searchJob.findUnique({ where: { id: activeJobId } });
      assert(dbJob!.isPaid === true, 'DB searchJob isPaid must be updated to true');
    });

    await runTest('2.6 Subsequent polling without query param retains approved & isPaid: true', async () => {
      const req = new NextRequest(`http://localhost:3000/api/checkout/status/${generatedPaymentId}`);
      const res = await getPaymentStatus(req, { params: Promise.resolve({ paymentId: generatedPaymentId }) });
      const data = await res.json();
      assert(data.status === 'approved', `Expected status 'approved', got ${data.status}`);
      assert(data.isPaid === true, `Expected isPaid true, got ${data.isPaid}`);
    });

    await runTest('2.7 POST /api/checkout/pix on already paid job returns unlock message without new charge', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: activeJobId }),
      });
      const res = await postCheckoutPix(req);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.isPaid === true, 'Expected isPaid true');
      assert(data.message === 'Esta lista já foi desbloqueada.', `Expected unlocked msg, got: ${data.message}`);
    });

    await runTest('2.8 Unlocked search job now serves 100% of leads unmasked via /api/search/[id]', async () => {
      const req = new NextRequest(`http://localhost:3000/api/search/${activeJobId}`);
      const res = await getSearchJob(req, { params: Promise.resolve({ id: activeJobId }) });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = await res.json();

      assert(data.job.isPaid === true, 'Expected job.isPaid true');
      assert(Array.isArray(data.leads), 'Expected leads array');
      assert(data.leads.length === 10, `Expected 10 unmasked leads, got ${data.leads.length}`);
      assert(data.unlockedCount === 10, `Expected unlockedCount 10, got ${data.unlockedCount}`);
      assert(data.lockedCount === 0, `Expected lockedCount 0, got ${data.lockedCount}`);

      // Confirm all 10 leads are fully visible
      for (const lead of data.leads) {
        assert(!lead.phone.includes('*'), `Lead phone should not contain asterisks: ${lead.phone}`);
      }
    });

    // -------------------------------------------------------------
    // GROUP 3: EXCEL EXPORT INTEGRITY & SECURITY GATES
    // -------------------------------------------------------------
    console.log(`\n--- SECTION 3: Excel (.xlsx) Export Integrity & 10 Columns ---`);

    await runTest('3.1 Export Security Gate: Unpaid job strictly blocked with HTTP 403 Forbidden', async () => {
      const unpaidJob = await db.searchJob.create({
        data: {
          niche: 'Imobiliárias',
          location: 'Curitiba - PR',
          totalFound: 6,
          isPaid: false,
          leads: {
            create: [{ name: 'Imobiliária Batel', phone: '(41) 3011-2233' }],
          },
        },
      });
      createdJobIds.push(unpaidJob.id);

      const req = new NextRequest(`http://localhost:3000/api/export/${unpaidJob.id}`);
      const res = await getExport(req, { params: Promise.resolve({ id: unpaidJob.id }) });

      assert(res.status === 403, `Expected HTTP 403, got ${res.status}`);
      const data = await res.json();
      assert(data.error.includes('Acesso bloqueado'), `Expected error message about blocked access, got: ${data.error}`);
    });

    await runTest('3.2 Export Security Gate: Tampering query params (?bypass=1, ?force=true) still returns 403', async () => {
      const unpaidJobId = createdJobIds[createdJobIds.length - 1];
      const req = new NextRequest(`http://localhost:3000/api/export/${unpaidJobId}?bypass=1&force=true&isPaid=true`);
      const res = await getExport(req, { params: Promise.resolve({ id: unpaidJobId }) });
      assert(res.status === 403, `Tampering attempt did not return 403, got ${res.status}`);
    });

    await runTest('3.3 Export Security Gate: Non-existent job ID returns HTTP 404', async () => {
      const req = new NextRequest(`http://localhost:3000/api/export/unknown-fake-id-12345`);
      const res = await getExport(req, { params: Promise.resolve({ id: 'unknown-fake-id-12345' }) });
      assert(res.status === 404, `Expected HTTP 404, got ${res.status}`);
    });

    await runTest('3.4 Paid Job Excel Export: Headers, MIME type, Content-Disposition, and 10 Columns', async () => {
      // activeJobId was paid in Section 2
      const req = new NextRequest(`http://localhost:3000/api/export/${activeJobId}`);
      const res = await getExport(req, { params: Promise.resolve({ id: activeJobId }) });

      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const contentType = res.headers.get('content-type');
      assert(
        contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        `Unexpected Content-Type: ${contentType}`
      );

      const contentDisposition = res.headers.get('content-disposition');
      assert(
        !!contentDisposition && contentDisposition.includes('attachment; filename='),
        `Unexpected Content-Disposition: ${contentDisposition}`
      );
      assert(contentDisposition!.includes('.xlsx'), 'Filename in header must have .xlsx extension');

      // Parse binary workbook buffer
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert(buffer.length > 1000, `Workbook buffer too small: ${buffer.length} bytes`);

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      assert(workbook.SheetNames.includes('Leads Extraídos'), `Expected sheet 'Leads Extraídos', found: ${workbook.SheetNames}`);

      const sheet = workbook.Sheets['Leads Extraídos'];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      assert(rows.length === 10, `Expected 10 rows in Excel, got ${rows.length}`);

      // Verify the EXACT 10 COLUMNS in order
      const expectedColumns = [
        '#',
        'Nome do Negócio',
        'Categoria',
        'Endereço',
        'Cidade',
        'Telefone',
        'Link WhatsApp',
        'Website',
        'Nota Google',
        'Avaliações',
      ];

      const firstRow = rows[0];
      const actualKeys = Object.keys(firstRow);

      for (const col of expectedColumns) {
        assert(actualKeys.includes(col), `Missing expected Excel column: "${col}". Found: ${actualKeys.join(', ')}`);
      }

      assert(
        actualKeys.length === expectedColumns.length,
        `Expected exactly ${expectedColumns.length} columns, found ${actualKeys.length}: ${actualKeys.join(', ')}`
      );

      // Verify column 'Cidade' specifically matches the search location
      for (const r of rows) {
        assert(r['Cidade'] === 'Belo Horizonte - MG', `Column 'Cidade' expected 'Belo Horizonte - MG', got: "${r['Cidade']}"`);
      }
    });

    await runTest('3.5 Excel Export Graceful Fallbacks for Null/Undefined Lead Fields', async () => {
      // Create a paid job with sparse leads (null/undefined fields)
      const sparseJob = await db.searchJob.create({
        data: {
          niche: 'Mecânicas',
          location: 'Ribeirão Preto - SP',
          totalFound: 1,
          isPaid: true,
          leads: {
            create: [
              {
                name: 'Auto Mecânica Express',
                category: null,
                phone: null,
                address: null,
                whatsappUrl: null,
                website: null,
                rating: null,
                reviewCount: null,
              },
            ],
          },
        },
      });
      createdJobIds.push(sparseJob.id);

      const req = new NextRequest(`http://localhost:3000/api/export/${sparseJob.id}`);
      const res = await getExport(req, { params: Promise.resolve({ id: sparseJob.id }) });
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['Leads Extraídos']);
      assert(rows.length === 1, `Expected 1 row, got ${rows.length}`);

      const r = rows[0];
      assert(r['#'] === 1, `Expected '#' 1, got ${r['#']}`);
      assert(r['Nome do Negócio'] === 'Auto Mecânica Express', `Name mismatch`);
      assert(r['Categoria'] === 'Mecânicas', `Fallback category expected 'Mecânicas', got: ${r['Categoria']}`);
      assert(r['Endereço'] === 'Não informado', `Fallback address expected 'Não informado', got: ${r['Endereço']}`);
      assert(r['Cidade'] === 'Ribeirão Preto - SP', `Cidade expected 'Ribeirão Preto - SP', got: ${r['Cidade']}`);
      assert(r['Telefone'] === 'Não informado', `Fallback phone expected 'Não informado', got: ${r['Telefone']}`);
      assert(r['Website'] === 'Sem site cadastrado', `Fallback website expected 'Sem site cadastrado', got: ${r['Website']}`);
      assert(r['Nota Google'] === '-', `Fallback rating expected '-', got: ${r['Nota Google']}`);
      assert(r['Avaliações'] === 0, `Fallback reviews expected 0, got: ${r['Avaliações']}`);
    });

    // -------------------------------------------------------------
    // GROUP 4: ADVERSARIAL STRESS & CONCURRENCY ATTACK VECTORS
    // -------------------------------------------------------------
    console.log(`\n--- SECTION 4: Adversarial Stress & Concurrency Attack Vectors ---`);

    await runTest('4.1 Injection attack vectors on search and export IDs handle safely', async () => {
      const maliciousIds = [
        "' OR '1'='1",
        "../../etc/passwd",
        "<script>alert(1)</script>",
        "null",
        "undefined",
        "00000000-0000-0000-0000-000000000000'--",
      ];

      for (const id of maliciousIds) {
        const searchReq = new NextRequest(`http://localhost:3000/api/search/${encodeURIComponent(id)}`);
        const searchRes = await getSearchJob(searchReq, { params: Promise.resolve({ id }) });
        assert(searchRes.status === 404, `Search API with injection ID "${id}" must return 404, got ${searchRes.status}`);

        const exportReq = new NextRequest(`http://localhost:3000/api/export/${encodeURIComponent(id)}`);
        const exportRes = await getExport(exportReq, { params: Promise.resolve({ id }) });
        assert(exportRes.status === 404, `Export API with injection ID "${id}" must return 404, got ${exportRes.status}`);
      }
    });

    await runTest('4.2 High-volume lead masking: 50 leads correctly split 5 open and 45 masked', async () => {
      const bulkJob = await db.searchJob.create({
        data: {
          niche: 'Farmácias',
          location: 'Goiânia - GO',
          totalFound: 50,
          isPaid: false,
          leads: {
            create: Array.from({ length: 50 }).map((_, i) => ({
              name: `Farmácia Popular ${i + 1}`,
              category: 'Farmácia',
              phone: `(62) 3200-${String(1000 + i).slice(0, 4)}`,
              address: `Avenida Goiás, ${i + 1}, Setor Central, Goiânia - GO`,
              website: `https://farmacia${i + 1}.com.br`,
              rating: 5.0 - (i % 10) * 0.1,
              reviewCount: 50 - i,
            })),
          },
        },
      });
      createdJobIds.push(bulkJob.id);

      const req = new NextRequest(`http://localhost:3000/api/search/${bulkJob.id}`);
      const res = await getSearchJob(req, { params: Promise.resolve({ id: bulkJob.id }) });
      const data = await res.json();

      assert(data.sampleLeads.length === 5, `Expected 5 sampleLeads, got ${data.sampleLeads.length}`);
      assert(data.lockedLeads.length === 45, `Expected 45 lockedLeads, got ${data.lockedLeads.length}`);
      assert(data.unlockedCount === 5, `Expected unlockedCount 5, got ${data.unlockedCount}`);
      assert(data.lockedCount === 45, `Expected lockedCount 45, got ${data.lockedCount}`);

      // Verify all 45 locked leads are securely masked
      for (const l of data.lockedLeads) {
        assert(l.isLocked === true, 'isLocked must be true');
        assert(l.phone.includes('****'), 'phone must be masked with asterisks');
        assert(l.whatsappUrl === '#', 'whatsappUrl must be #');
        assert(l.website === 'https://***.com.br', 'website must be masked');
        assert(l.address.endsWith('Bairro ***'), 'address must end with Bairro ***');
      }
    });

    await runTest('4.3 Concurrency stress: 10 parallel simulateApprove calls succeed idempotently', async () => {
      // Create a fresh job and payment
      const concJob = await db.searchJob.create({
        data: {
          niche: 'Coworking',
          location: 'Florianópolis - SC',
          totalFound: 15,
          isPaid: false,
          leads: {
            create: [{ name: 'Ilha Hub', phone: '(48) 3300-1111' }],
          },
        },
      });
      createdJobIds.push(concJob.id);

      const pixReq = new NextRequest('http://localhost:3000/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchJobId: concJob.id }),
      });
      const pixRes = await postCheckoutPix(pixReq);
      const pixData = await pixRes.json();
      const pId = pixData.paymentId;

      // Launch 10 simultaneous approval requests
      const promises = Array.from({ length: 10 }).map(() => {
        const req = new NextRequest(`http://localhost:3000/api/checkout/status/${pId}?simulateApprove=true`);
        return getPaymentStatus(req, { params: Promise.resolve({ paymentId: pId }) });
      });

      const responses = await Promise.all(promises);
      for (const r of responses) {
        assert(r.status === 200, `Concurrent approve expected 200, got ${r.status}`);
        const d = await r.json();
        assert(d.status === 'approved', `Expected status approved, got ${d.status}`);
        assert(d.isPaid === true, `Expected isPaid true, got ${d.isPaid}`);
      }

      // Verify DB final state
      const updatedJob = await db.searchJob.findUnique({ where: { id: concJob.id } });
      assert(updatedJob!.isPaid === true, 'Job isPaid must be true after concurrent approvals');
    });

    await runTest('4.4 DDD resolution & Anatel 8-digit landline format verification across cities', async () => {
      const { scrapeLocalLeads } = await import('@/lib/scraper/maps');

      // Test Campinas (interior SP) - MUST resolve to DDD 19, never 11
      const campinasLeads = await scrapeLocalLeads({ niche: 'Dentista', location: 'Campinas - SP' });
      assert(campinasLeads.length >= 15, `Expected >= 15 leads, got ${campinasLeads.length}`);
      const campinasDdd19 = campinasLeads.every((l) => l.phone.includes('(19)'));
      assert(campinasDdd19, 'All Campinas leads must have DDD (19)');

      // Verify landline format: strictly 8 digits (XX) [23]XXX-XXXX
      for (const l of campinasLeads) {
        if (l.phone.includes('(19) 3') || l.phone.includes('(19) 2')) {
          assert(
            /\(19\)\s*[23]\d{3}-\d{4}/.test(l.phone),
            `Invalid landline format (must be 8 digits): ${l.phone}`
          );
        }
      }

      // Test Santos (interior/coast SP) - MUST resolve to DDD 13, never 11
      const santosLeads = await scrapeLocalLeads({ niche: 'Cafeteria', location: 'Santos - SP' });
      const santosDdd13 = santosLeads.every((l) => l.phone.includes('(13)'));
      assert(santosDdd13, 'All Santos leads must have DDD (13)');

      // Test Belo Horizonte - MUST resolve to DDD 31
      const bhLeads = await scrapeLocalLeads({ niche: 'Contabilidade', location: 'Belo Horizonte - MG' });
      const bhDdd31 = bhLeads.every((l) => l.phone.includes('(31)'));
      assert(bhDdd31, 'All BH leads must have DDD (31)');
    });

  } finally {
    // Cleanup generated search jobs
    for (const id of createdJobIds) {
      try {
        await db.payment.deleteMany({ where: { searchJobId: id } });
        await db.lead.deleteMany({ where: { searchJobId: id } });
        await db.searchJob.delete({ where: { id } });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  console.log(`\n============================================================`);
  console.log(`  CHALLENGER 2 SUMMARY`);
  console.log(`  Total: ${ctx.passed + ctx.failed} | \x1b[32mPassed: ${ctx.passed}\x1b[0m | \x1b[31mFailed: ${ctx.failed}\x1b[0m`);
  if (ctx.failed > 0) {
    console.log(`\n  Failures:`);
    for (const f of ctx.failures) {
      console.log(`  - \x1b[31m${f}\x1b[0m`);
    }
  }
  console.log(`============================================================\n`);

  if (ctx.failed > 0) {
    throw new Error(`Challenger test suite failed with ${ctx.failed} error(s).`);
  }
}

// Standalone execution support
if (require.main === module || process.argv[1]?.includes('challenger-m2-m3')) {
  runChallengerM2M3Suite()
    .then(() => {
      console.log('\x1b[32m>>> ALL CHALLENGER TESTS PASSED EMPIRICALLY <<<\x1b[0m\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\x1b[31m>>> CHALLENGER TESTS FAILED <<<\x1b[0m\n', err);
      process.exit(1);
    });
}
