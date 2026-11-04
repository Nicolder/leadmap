/**
 * Milestone M2 & M3 Challenger Verification Suite
 * Adversarial empirical tests covering:
 * 1. DDD accuracy across 7 target Brazilian cities ("Campinas - SP", "Santos - SP", "Sorocaba - SP", "Curitiba - PR", "Belo Horizonte - MG", "Salvador - BA", "São Paulo - SP")
 * 2. Landline phone number formatting (strictly 8 digits: (XX) 3XXX-XXXX or (XX) 2XXX-XXXX, never 9 digits)
 * 3. Search resilience: simulation of Overpass network timeout / server failure with failover to Nominatim / local complement
 * 4. Excel export: generation and verification of exact 10 headers from PROJECT.md, 'Cidade' column correctness
 * 5. Security gate: strict HTTP 403 Forbidden for unpaid jobs on /api/export/[id]
 */

import { describe, test, expect, registry } from './test-utils';
import { db } from '@/lib/db';
import { scrapeLocalLeads } from '@/lib/scraper/maps';
import { GET as getExport } from '@/app/api/export/[id]/route';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';

export function registerM2M3ChallengerTests() {
  // =========================================================================
  // SUITE 1: DDD Accuracy Across Target Brazilian Cities
  // =========================================================================
  describe('Challenger Suite 1: DDD Accuracy Across Target Cities', () => {
    const targetCities = [
      { location: 'Campinas - SP', expectedDdd: '19', forbiddenDdd: '11' },
      { location: 'Santos - SP', expectedDdd: '13', forbiddenDdd: '11' },
      { location: 'Sorocaba - SP', expectedDdd: '15', forbiddenDdd: '11' },
      { location: 'Curitiba - PR', expectedDdd: '41', forbiddenDdd: '11' },
      { location: 'Belo Horizonte - MG', expectedDdd: '31', forbiddenDdd: '11' },
      { location: 'Salvador - BA', expectedDdd: '71', forbiddenDdd: '11' },
      { location: 'São Paulo - SP', expectedDdd: '11', forbiddenDdd: '19' },
    ];

    for (const { location, expectedDdd, forbiddenDdd } of targetCities) {
      test(`DDD resolution for "${location}" strictly matches (${expectedDdd}) and never (${forbiddenDdd})`, async () => {
        const leads = await scrapeLocalLeads({
          niche: 'Restaurante',
          location,
        });

        expect(leads.length).toBeGreaterThanOrEqual(15);

        // Every lead must have a phone formatted with the expected DDD
        for (const lead of leads) {
          expect(lead.phone).toBeDefined();
          const dddMatch = lead.phone.match(/\((\d{2})\)/);
          expect(dddMatch !== null).toBeTruthy();
          if (dddMatch) {
            const actualDdd = dddMatch[1];
            expect(actualDdd === expectedDdd).toBeTruthy();
            expect(actualDdd !== forbiddenDdd).toBeTruthy();
          }
        }
      });
    }

    test('DDD resolution handles punctuation and casing variations robustly', async () => {
      const variations = [
        { query: 'campinas - sp', expectedDdd: '19' },
        { query: 'Santos / SP', expectedDdd: '13' },
        { query: 'sorocaba-sp', expectedDdd: '15' },
        { query: 'CURITIBA - PR', expectedDdd: '41' },
        { query: 'belo horizonte - mg', expectedDdd: '31' },
        { query: 'salvador, ba', expectedDdd: '71' },
        { query: 'sao paulo - sp', expectedDdd: '11' },
      ];

      for (const { query, expectedDdd } of variations) {
        const leads = await scrapeLocalLeads({
          niche: 'Clínica',
          location: query,
        });
        expect(leads.length).toBeGreaterThan(0);
        for (const lead of leads) {
          expect(lead.phone.startsWith(`(${expectedDdd})`)).toBeTruthy();
        }
      }
    });
  });

  // =========================================================================
  // SUITE 2: Landline Phone Formatting & Anatel Compliance
  // =========================================================================
  describe('Challenger Suite 2: Landline Phone Formatting & Anatel Standard Compliance', () => {
    test('All landline phone numbers strictly adhere to 8 digits (XX) 3XXX-XXXX or (XX) 2XXX-XXXX and NEVER 9 digits', async () => {
      // Run multiple scrapes to collect a large statistical sample of phones
      const locations = ['Campinas - SP', 'Curitiba - PR', 'Belo Horizonte - MG'];
      let landlineCount = 0;
      let mobileCount = 0;

      for (const loc of locations) {
        const leads = await scrapeLocalLeads({ niche: 'Advocacia', location: loc });
        for (const lead of leads) {
          const phone = lead.phone;
          const digitsOnly = phone.replace(/\D/g, '');

          // Check if landline (starts with 2 or 3 after DDD)
          const firstLocalDigit = digitsOnly[2];

          if (firstLocalDigit === '2' || firstLocalDigit === '3') {
            landlineCount++;
            // Landline rule: exactly 10 digits total (2 DDD + 8 local)
            expect(digitsOnly.length).toBe(10);

            // Hyphenated format check: (XX) [23]XXX-XXXX
            // Prefix before hyphen must have EXACTLY 4 characters
            const parts = phone.split('-');
            expect(parts.length).toBe(2);
            const prefix = parts[0].trim();
            const suffix = parts[1].trim();

            expect(suffix.length).toBe(4);
            // Prefix should be "(XX) 3XXX" or "(XX) 2XXX"
            const prefixDigits = prefix.replace(/\D/g, '').slice(2);
            expect(prefixDigits.length).toBe(4);
            expect(prefixDigits.length !== 5).toBeTruthy(); // MUST NOT be 5 digits (which would make 9 digits total)

            // Strict Anatel landline regex:
            const landlineRegex = /^\(\d{2}\)\s*[23]\d{3}-\d{4}$/;
            expect(landlineRegex.test(phone)).toBeTruthy();

            // Verify WhatsApp link has wa.me/55 + 10 digits
            expect(lead.whatsappUrl).toBeDefined();
            expect(lead.whatsappUrl.startsWith(`https://wa.me/55${digitsOnly}`)).toBeTruthy();
          } else if (firstLocalDigit === '9') {
            mobileCount++;
            // Mobile rule: exactly 11 digits total (2 DDD + 9 local)
            expect(digitsOnly.length).toBe(11);
            const mobileRegex = /^\(\d{2}\)\s*9\d{4}-\d{4}$/;
            expect(mobileRegex.test(phone)).toBeTruthy();
          }
        }
      }

      // Assert that our sample generated both mobile and landline leads
      expect(landlineCount).toBeGreaterThan(0);
      expect(mobileCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SUITE 3: Search Resilience Under Network Failures
  // =========================================================================
  describe('Challenger Suite 3: Search Engine Network Resilience & Failover', () => {
    test('Simulated Overpass API 500/502/406/timeout fails over seamlessly to Nominatim or local complement', async () => {
      const originalFetch = global.fetch;

      try {
        // Intercept fetch to simulate complete Overpass failure
        global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlStr = String(input);
          if (urlStr.includes('overpass-api.de') || urlStr.includes('overpass.kumi.systems')) {
            // Throw network timeout / connection refused
            throw new Error('Simulated Overpass 502 / Connection Timeout');
          }
          // Allow all other calls (e.g. Nominatim or local)
          return originalFetch(input, init);
        };

        const startTime = Date.now();
        const leads = await scrapeLocalLeads({
          niche: 'Farmácia',
          location: 'Campinas - SP',
        });
        const elapsed = Date.now() - startTime;

        // Even with Overpass down, must return at least 15 valid leads
        expect(leads.length).toBeGreaterThanOrEqual(15);
        expect(elapsed).toBeLessThan(15000); // Must not hang indefinitely

        // All leads must still have proper DDD
        for (const lead of leads) {
          expect(lead.phone.startsWith('(19)')).toBeTruthy();
        }
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('Total network blackout (Overpass AND Nominatim both down) degrades gracefully to deterministic complement', async () => {
      const originalFetch = global.fetch;

      try {
        // Intercept fetch to simulate complete network blackout
        global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          throw new Error('Simulated Network Offline (ENOTFOUND)');
        };

        const leads = await scrapeLocalLeads({
          niche: 'Pet Shop',
          location: 'Santos - SP',
        });

        // Must still return at least 25 leads via local deterministic complement
        expect(leads.length).toBeGreaterThanOrEqual(25);

        // Verify authentic Santos neighborhood in complement
        const santosNeighborhoods = ['Gonzaga', 'Boqueirão', 'Ponta da Praia', 'Embaré', 'Aparecida', 'Centro'];
        const hasSantosNeighborhood = leads.some((l) =>
          santosNeighborhoods.some((b) => l.address.includes(b))
        );
        expect(hasSantosNeighborhood).toBeTruthy();

        // Verify correct Santos DDD 13
        for (const lead of leads) {
          expect(lead.phone.startsWith('(13)')).toBeTruthy();
        }
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // SUITE 4: Excel Export (.xlsx) Schema & 'Cidade' Column Verification
  // =========================================================================
  describe('Challenger Suite 4: Excel Export (.xlsx) Specification & Headers Verification', () => {
    test('Export produces valid .xlsx workbook with exact 10 headers from PROJECT.md including "Cidade"', async () => {
      const testJob = await db.searchJob.create({
        data: {
          niche: 'Engenharia Civil',
          location: 'Curitiba - PR',
          totalFound: 6,
          isPaid: true,
          leads: {
            create: [
              {
                name: 'Engenharia Estrutural Paraná',
                category: 'Engenharia',
                address: 'Rua XV de Novembro, 500 - Centro, Curitiba - PR',
                phone: '(41) 3222-1234',
                whatsappUrl: 'https://wa.me/554132221234',
                website: 'https://www.engparana.com.br',
                rating: 4.8,
                reviewCount: 42,
              },
              {
                name: 'Projetos e Obras Batel',
                category: null, // Test fallback to job.niche
                address: null, // Test fallback to 'Não informado'
                phone: null, // Test fallback to 'Não informado'
                whatsappUrl: null,
                website: null, // Test fallback to 'Sem site cadastrado'
                rating: null, // Test fallback to '-'
                reviewCount: null, // Test fallback to 0
              },
            ],
          },
        },
      });

      try {
        const req = new NextRequest(`http://localhost/api/export/${testJob.id}`);
        const res = await getExport(req, { params: Promise.resolve({ id: testJob.id }) });

        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        const disposition = res.headers.get('Content-Disposition') || '';
        expect(disposition.includes('.xlsx')).toBeTruthy();

        // Parse binary arrayBuffer
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        expect(workbook.SheetNames.includes('Leads Extraídos')).toBeTruthy();
        const sheet = workbook.Sheets['Leads Extraídos'];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        expect(rows.length).toBe(2);

        // Required headers from PROJECT.md:
        // ['#', 'Nome do Negócio', 'Categoria', 'Endereço', 'Cidade', 'Telefone', 'Link WhatsApp', 'Website', 'Nota Google', 'Avaliações']
        const expectedHeaders = [
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

        const firstRowKeys = Object.keys(rows[0]);
        expect(firstRowKeys.length).toBe(10);
        for (const h of expectedHeaders) {
          expect(firstRowKeys.includes(h)).toBeTruthy();
        }

        // Verify specific values in Row 1
        expect(rows[0]['#']).toBe(1);
        expect(rows[0]['Nome do Negócio']).toBe('Engenharia Estrutural Paraná');
        expect(rows[0]['Cidade']).toBe('Curitiba - PR');
        expect(rows[0]['Telefone']).toBe('(41) 3222-1234');
        expect(rows[0]['Nota Google']).toBe(4.8);
        expect(rows[0]['Avaliações']).toBe(42);

        // Verify edge-case fallbacks in Row 2
        expect(rows[1]['#']).toBe(2);
        expect(rows[1]['Nome do Negócio']).toBe('Projetos e Obras Batel');
        expect(rows[1]['Cidade']).toBe('Curitiba - PR');
        expect(rows[1]['Categoria']).toBe('Engenharia Civil'); // fallback to job.niche
        expect(rows[1]['Endereço']).toBe('Não informado');
        expect(rows[1]['Telefone']).toBe('Não informado');
        expect(rows[1]['Website']).toBe('Sem site cadastrado');
        expect(rows[1]['Nota Google']).toBe('-');
        expect(rows[1]['Avaliações']).toBe(0);
      } finally {
        await db.searchJob.delete({ where: { id: testJob.id } });
      }
    });
  });

  // =========================================================================
  // SUITE 5: Security Gate: Unpaid Job Export Blocked
  // =========================================================================
  describe('Challenger Suite 5: Security Gate on /api/export/[id]', () => {
    test('Unpaid search job (isPaid: false) strictly returns HTTP 403 Forbidden with error JSON', async () => {
      const unpaidJob = await db.searchJob.create({
        data: {
          niche: 'Contabilidade',
          location: 'Belo Horizonte - MG',
          totalFound: 10,
          isPaid: false,
          leads: {
            create: [
              {
                name: 'Contabilidade Savassi',
                phone: '(31) 3222-9999',
              },
            ],
          },
        },
      });

      try {
        const req = new NextRequest(`http://localhost/api/export/${unpaidJob.id}`);
        const res = await getExport(req, { params: Promise.resolve({ id: unpaidJob.id }) });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toBeDefined();
        expect(typeof data.error).toBe('string');
        expect(data.error.toLowerCase().includes('bloqueado')).toBeTruthy();
      } finally {
        await db.searchJob.delete({ where: { id: unpaidJob.id } });
      }
    });

    test('Non-existent search job ID returns HTTP 404 Not Found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest(`http://localhost/api/export/${fakeId}`);
      const res = await getExport(req, { params: Promise.resolve({ id: fakeId }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });
}

// Direct execution support
if (require.main === module || process.argv[1]?.endsWith('m2-m3-challenger.test.ts')) {
  (async () => {
    registry.clear();
    registerM2M3ChallengerTests();
    const summary = await registry.run('Challenger Suite: M2 & M3 Adversarial Verification');
    console.log(`\nResults: ${summary.passed}/${summary.total} passed, ${summary.failed} failed.`);
    process.exit(summary.failed > 0 ? 1 : 0);
  })();
}
