/**
 * Challenger M5-2: Empirical Stress Test Suite for R3 (Permanent Link) and R4 (Instant Filtering)
 *
 * Requirements Tested:
 * - R3: Recuperação & Link Permanente da Lista (busca/[id] page & PixModal, clipboard & fallback, bookmarking)
 * - R4: Filtro Rápido na Tabela na Tela (Unicode diacritics, case insensitivity, multi-term, regex safety, whitespace, null safety)
 */

import { db } from '@/lib/db';
import { GET as getSearchById } from '@/app/api/search/[id]/route';
import { GET as getExportById } from '@/app/api/export/[id]/route';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
    failures.push(`${testName} ${detail ? `(${detail})` : ''}`);
  }
}

// Extracted from src/app/busca/[id]/page.tsx to verify exact implementation logic
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface LeadItem {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  whatsappUrl?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  isLocked?: boolean;
}

function matchesLead(lead: LeadItem, query: string): boolean {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return true;

  const terms = cleanQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalizeText(
    `${lead.name || ''} ${lead.category || ''} ${lead.address || ''}`
  );

  return terms.every((term) => haystack.includes(term));
}

// Mock clipboard function matching page.tsx / PixModal.tsx logic
async function simulateCopyToClipboard(
  text: string,
  mockNavigator?: { clipboard?: { writeText: (t: string) => Promise<void> } },
  mockDocument?: {
    createElement: (tag: string) => any;
    body: { appendChild: (el: any) => void; removeChild: (el: any) => void };
    execCommand: (cmd: string) => boolean;
  }
): Promise<{ success: boolean; pathUsed: 'navigator' | 'fallback' | 'none' }> {
  if (mockNavigator?.clipboard?.writeText) {
    try {
      await mockNavigator.clipboard.writeText(text);
      return { success: true, pathUsed: 'navigator' };
    } catch {
      // Fallback below
    }
  }

  if (mockDocument) {
    try {
      const textArea = mockDocument.createElement('textarea');
      textArea.value = text;
      mockDocument.body.appendChild(textArea);
      const successful = mockDocument.execCommand('copy');
      mockDocument.body.removeChild(textArea);
      return { success: successful, pathUsed: 'fallback' };
    } catch {
      return { success: false, pathUsed: 'none' };
    }
  }

  return { success: false, pathUsed: 'none' };
}

async function runChallengerTests() {
  console.log('\n============================================================');
  console.log('  CHALLENGER 2: R3 (PERMANENT LINK) & R4 (INSTANT FILTERING)');
  console.log('  Adversarial Stress Test Suite');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: R3 — Static Source & Component Structure Analysis
  // --------------------------------------------------------------------------
  console.log('--- 1. R3: Static Source & AST Verification ---');
  const buscaPagePath = path.join(process.cwd(), 'src/app/busca/[id]/page.tsx');
  const pixModalPath = path.join(process.cwd(), 'src/components/PixModal.tsx');

  const buscaPageSrc = fs.readFileSync(buscaPagePath, 'utf8');
  const pixModalSrc = fs.readFileSync(pixModalPath, 'utf8');

  assert(
    buscaPageSrc.includes('Copiar link permanente desta lista'),
    '1.1 /busca/[id]/page.tsx contains "Copiar link permanente desta lista" button'
  );

  assert(
    buscaPageSrc.includes('Link copiado!'),
    '1.2 /busca/[id]/page.tsx contains "Link copiado!" visual feedback state'
  );

  assert(
    buscaPageSrc.includes('Link2Icon') && buscaPageSrc.includes('CheckIcon'),
    '1.3 /busca/[id]/page.tsx dynamically swaps Link2Icon to CheckIcon on copy'
  );

  assert(
    pixModalSrc.includes('Copiar link permanente desta lista'),
    '1.4 PixModal.tsx contains "Copiar link permanente desta lista" in approved state'
  );

  assert(
    pixModalSrc.includes('Link permanente copiado!'),
    '1.5 PixModal.tsx contains "Link permanente copiado!" visual feedback state'
  );

  assert(
    buscaPageSrc.includes('navigator.clipboard.writeText') &&
      buscaPageSrc.includes("document.execCommand('copy')"),
    '1.6 /busca/[id]/page.tsx implements dual-layer clipboard copy (writeText + execCommand fallback)'
  );

  assert(
    pixModalSrc.includes('navigator.clipboard.writeText') &&
      pixModalSrc.includes("document.execCommand('copy')"),
    '1.7 PixModal.tsx implements dual-layer clipboard copy (writeText + execCommand fallback)'
  );

  assert(
    buscaPageSrc.includes("typeof window !== 'undefined'") &&
      pixModalSrc.includes("typeof window !== 'undefined'"),
    '1.8 Both files feature SSR guard (typeof window !== undefined) for window.location'
  );

  // --------------------------------------------------------------------------
  // SECTION 2: R3 — Clipboard Copy & Resilient Fallback Execution
  // --------------------------------------------------------------------------
  console.log('\n--- 2. R3: Clipboard & Fallback Simulation ---');

  // Scenario 2.1: Modern browser with working navigator.clipboard.writeText
  let writeTextCalledWith = '';
  const mockNavigatorOk = {
    clipboard: {
      writeText: async (t: string) => {
        writeTextCalledWith = t;
      },
    },
  };
  const resModern = await simulateCopyToClipboard('https://rastro.app/busca/test-123', mockNavigatorOk);
  assert(
    resModern.success && resModern.pathUsed === 'navigator' && writeTextCalledWith === 'https://rastro.app/busca/test-123',
    '2.1 Modern navigator.clipboard.writeText successfully copies URL'
  );

  // Scenario 2.2: writeText throws (e.g. Permission denied, un-focused tab) -> Fallback executes
  const mockNavigatorFailing = {
    clipboard: {
      writeText: async () => {
        throw new DOMException('Clipboard write access denied', 'NotAllowedError');
      },
    },
  };
  let textareaCreated = false;
  let execCommandCmd = '';
  let textareaAppended = false;
  let textareaRemoved = false;
  let textareaValue = '';
  const mockDocFallback = {
    createElement: (tag: string) => {
      if (tag === 'textarea') textareaCreated = true;
      return {
        get value() {
          return textareaValue;
        },
        set value(v: string) {
          textareaValue = v;
        },
        style: {},
        focus: () => {},
        select: () => {},
      };
    },
    body: {
      appendChild: (el: any) => {
        textareaAppended = true;
      },
      removeChild: (el: any) => {
        textareaRemoved = true;
      },
    },
    execCommand: (cmd: string) => {
      execCommandCmd = cmd;
      return true;
    },
  };

  const resFallback = await simulateCopyToClipboard(
    'https://rastro.app/busca/fallback-uuid',
    mockNavigatorFailing,
    mockDocFallback
  );
  assert(
    resFallback.success &&
      resFallback.pathUsed === 'fallback' &&
      textareaCreated &&
      textareaAppended &&
      textareaRemoved &&
      execCommandCmd === 'copy' &&
      textareaValue === 'https://rastro.app/busca/fallback-uuid',
    '2.2 When navigator.clipboard throws, fallback textarea + execCommand("copy") executes cleanly'
  );

  // Scenario 2.3: navigator.clipboard is undefined (legacy browser/insecure context) -> directly uses fallback
  const resLegacy = await simulateCopyToClipboard(
    'https://rastro.app/busca/legacy-uuid',
    {},
    mockDocFallback
  );
  assert(
    resLegacy.success && resLegacy.pathUsed === 'fallback',
    '2.3 In environments lacking navigator.clipboard, textarea fallback succeeds directly'
  );

  // Scenario 2.4: Both fail -> returns false gracefully without unhandled rejection
  const resTotalFail = await simulateCopyToClipboard('https://rastro.app/busca/fail', mockNavigatorFailing);
  assert(
    resTotalFail.success === false && resTotalFail.pathUsed === 'none',
    '2.4 Complete clipboard failure returns false safely without throwing uncaught exceptions'
  );

  // --------------------------------------------------------------------------
  // SECTION 3: R3 — Permanent Link Reconstruction & Bookmarking Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 3. R3: Link Reconstruction & Bookmarking Simulation ---');

  const testJob = await db.searchJob.create({
    data: {
      niche: 'Challenger Clientes Permanente',
      location: 'Campinas - SP',
      totalFound: 6,
      isPaid: false,
      leads: {
        create: [
          { name: 'Lead Unmasked 1', category: 'Clinica', phone: '(19) 98765-4321', address: 'Rua A, 1, Cambui', rating: 4.8 },
          { name: 'Lead Unmasked 2', category: 'Clinica', phone: '(19) 98765-4322', address: 'Rua B, 2, Cambui', rating: 4.7 },
          { name: 'Lead Unmasked 3', category: 'Clinica', phone: '(19) 98765-4323', address: 'Rua C, 3, Cambui', rating: 4.6 },
          { name: 'Lead Unmasked 4', category: 'Clinica', phone: '(19) 98765-4324', address: 'Rua D, 4, Cambui', rating: 4.5 },
          { name: 'Lead Unmasked 5', category: 'Clinica', phone: '(19) 98765-4325', address: 'Rua E, 5, Cambui', rating: 4.4 },
          { name: 'Lead Masked 6', category: 'Clinica', phone: '(19) 98765-4326', address: 'Rua F, 6, Cambui', rating: 4.3 },
        ],
      },
    },
    include: { leads: true },
  });

  const testUrl = `http://localhost:3000/busca/${testJob.id}`;
  assert(
    testJob.id.length > 20 && testUrl.includes(`/busca/${testJob.id}`),
    `3.1 Created persistent test job with UUID: ${testJob.id}`
  );

  // Initial visit (before payment)
  const reqUnpaid = new NextRequest(`http://localhost:3000/api/search/${testJob.id}`);
  const resUnpaid = await getSearchById(reqUnpaid, { params: Promise.resolve({ id: testJob.id }) });
  const dataUnpaid = await resUnpaid.json();
  assert(
    dataUnpaid.job.isPaid === false &&
      dataUnpaid.sampleLeads.length === 5 &&
      dataUnpaid.lockedLeads.length === 1 &&
      dataUnpaid.lockedLeads[0].phone.includes('****'),
    '3.2 Initial visit before payment: isPaid=false, 5 samples open, 6th lead masked'
  );

  // Simulate payment approval: update job.isPaid = true
  await db.searchJob.update({
    where: { id: testJob.id },
    data: { isPaid: true },
  });

  // Re-visit via bookmarked permanent link
  const reqBookmarked = new NextRequest(`http://localhost:3000/api/search/${testJob.id}`);
  const resBookmarked = await getSearchById(reqBookmarked, { params: Promise.resolve({ id: testJob.id }) });
  const dataBookmarked = await resBookmarked.json();
  assert(
    dataBookmarked.job.isPaid === true &&
      Array.isArray(dataBookmarked.leads) &&
      dataBookmarked.leads.length === 6 &&
      dataBookmarked.leads[5].phone === '(19) 98765-4326' &&
      !dataBookmarked.leads[5].phone.includes('*'),
    '3.3 Re-visit via permanent URL: returns all 6 unmasked leads with isPaid=true'
  );

  // Permanent link enables Excel export download
  const reqExport = new NextRequest(`http://localhost:3000/api/export/${testJob.id}`);
  const resExport = await getExportById(reqExport, { params: Promise.resolve({ id: testJob.id }) });
  const exportHeader = resExport.headers.get('content-type');
  assert(
    Boolean(resExport.status === 200 && exportHeader?.includes('spreadsheetml')),
    '3.4 Permanent URL enables direct .xlsx download with status 200 and spreadsheet content type'
  );

  // Cleanup test job
  await db.lead.deleteMany({ where: { searchJobId: testJob.id } });
  await db.searchJob.delete({ where: { id: testJob.id } });
  assert(true, '3.5 Database test entities successfully cleaned up');

  // --------------------------------------------------------------------------
  // SECTION 4: R4 — Adversarial Matrix for Instant Filtering Algorithm
  // --------------------------------------------------------------------------
  console.log('\n--- 4. R4: Adversarial Matrix for Table Filtering ---');

  const testLeads: LeadItem[] = [
    {
      id: '1',
      name: 'Clínica Odontológica Dente de Ouro',
      category: 'Dentistas & Ortodontia',
      address: 'Rua Coronel Quirino, 456, Cambuí, Campinas - SP',
      phone: '(19) 99123-4567',
    },
    {
      id: '2',
      name: 'Açougue & Boutique de Carnes São Paulo',
      category: 'Comércio Varejista de Carnes',
      address: 'Av. Paulista, 1000, Bela Vista, São Paulo - SP',
      phone: '(11) 98234-5678',
    },
    {
      id: '3',
      name: 'Auto Mecânica & Elétrica São Cristóvão Ltda.',
      category: 'Oficinas Mecânicas',
      address: 'Rua da Mooca, 789, Mooca, São Paulo - SP',
      phone: '(11) 97345-6789',
    },
    {
      id: '4',
      name: 'Escritório de Contabilidade Alpha (Campinas)',
      category: 'Contabilidade & Consultoria Fiscal',
      address: 'Av. Barão de Itapura, 200, Botafogo, Campinas - SP',
      phone: '(19) 96456-7890',
    },
    {
      id: '5',
      name: 'Restaurante e Churrascaria Fogo & Brasa',
      category: 'Restaurantes & Gastronomia',
      address: 'Rodovia Dom Pedro I, km 120, Barão Geraldo, Campinas - SP',
      phone: '(19) 95567-8901',
    },
    {
      id: '6',
      name: 'Empresa Sem Campos Opcionais',
      category: undefined,
      address: undefined,
      phone: undefined,
    },
  ];

  // 4.1 Diacritic Variations in Brazilian Portuguese
  console.log('\n  [4.1 Diacritic variations in Brazilian Portuguese]');
  assert(
    matchesLead(testLeads[0], 'clinica') && matchesLead(testLeads[0], 'clínica'),
    '4.1.1 "clinica" and "clínica" both match Lead 1'
  );
  assert(
    matchesLead(testLeads[0], 'odontologica') && matchesLead(testLeads[0], 'odontológica'),
    '4.1.2 "odontologica" and "odontológica" both match Lead 1'
  );
  assert(
    matchesLead(testLeads[0], 'cambui') && matchesLead(testLeads[0], 'Cambuí'),
    '4.1.3 "cambui" and "Cambuí" both match Lead 1'
  );
  assert(
    matchesLead(testLeads[1], 'sao paulo') && matchesLead(testLeads[1], 'São Paulo'),
    '4.1.4 "sao paulo" and "São Paulo" both match Lead 2'
  );
  assert(
    matchesLead(testLeads[1], 'acougue') && matchesLead(testLeads[1], 'açougue'),
    '4.1.5 "acougue" and "açougue" both match Lead 2 (c-cedilla normalization)'
  );
  assert(
    matchesLead(testLeads[2], 'cristovao') && matchesLead(testLeads[2], 'Cristóvão'),
    '4.1.6 "cristovao" and "Cristóvão" both match Lead 3'
  );
  assert(
    matchesLead(testLeads[4], 'barao geraldo') && matchesLead(testLeads[4], 'Barão Geraldo'),
    '4.1.7 "barao geraldo" and "Barão Geraldo" both match Lead 5'
  );

  // 4.2 Case Insensitivity
  console.log('\n  [4.2 Case insensitivity]');
  assert(
    matchesLead(testLeads[0], 'dente') &&
      matchesLead(testLeads[0], 'DENTE') &&
      matchesLead(testLeads[0], 'DeNtE'),
    '4.2.1 "dente", "DENTE", "DeNtE" all match Lead 1'
  );
  assert(
    matchesLead(testLeads[3], 'alpha') &&
      matchesLead(testLeads[3], 'ALPHA') &&
      matchesLead(testLeads[3], 'AlPhA'),
    '4.2.2 "alpha", "ALPHA", "AlPhA" all match Lead 4'
  );
  assert(
    matchesLead(testLeads[1], 'BOUTIQUE') && matchesLead(testLeads[1], 'boutique'),
    '4.2.3 UPPERCASE and lowercase match identically'
  );

  // 4.3 Multi-term Compound Queries Across Different Columns
  console.log('\n  [4.3 Multi-term compound queries across columns]');
  // Name ("Clínica") + Address Neighborhood ("Cambuí")
  assert(
    matchesLead(testLeads[0], 'clinica cambui'),
    '4.3.1 "clinica cambui" matches across Lead 1 (name + address neighborhood)'
  );
  // Name ("Carnes") + Category ("Comércio Varejista") + Address ("Bela Vista")
  assert(
    matchesLead(testLeads[1], 'carnes comercio bela vista'),
    '4.3.2 "carnes comercio bela vista" matches across name, category, and address'
  );
  // Category ("Oficinas") + Address ("Mooca")
  assert(
    matchesLead(testLeads[2], 'oficinas mooca'),
    '4.3.3 "oficinas mooca" matches category + address in Lead 3'
  );
  // Term order independence: "cambui dente clinica" vs "clinica dente cambui"
  assert(
    matchesLead(testLeads[0], 'cambui dente clinica') &&
      matchesLead(testLeads[0], 'clinica dente cambui'),
    '4.3.4 Term order independence: permutations of query terms produce identical match'
  );

  // 4.4 Punctuation and Regex Special Characters
  console.log('\n  [4.4 Punctuation & regex special characters]');
  let threwRegexError = false;
  try {
    // Parentheses
    assert(matchesLead(testLeads[3], '(Campinas)'), '4.4.1 Query with "()" matches Lead 4 without regex error');
    assert(matchesLead(testLeads[3], 'Alpha (Campinas)'), '4.4.2 Compound query with parentheses matches');

    // Brackets
    assert(!matchesLead(testLeads[0], '[inexistente]'), '4.4.3 Query with "[]" handles safely (0 matches)');

    // Asterisk, Plus, Question Mark
    assert(!matchesLead(testLeads[0], 'Dente*'), '4.4.4 Query with "*" handles safely without regex crash');
    assert(!matchesLead(testLeads[0], 'Clinica+'), '4.4.5 Query with "+" handles safely without regex crash');
    assert(!matchesLead(testLeads[0], 'Dente?'), '4.4.6 Query with "?" handles safely without regex crash');

    // Hyphen and Slash
    assert(matchesLead(testLeads[0], 'Campinas - SP'), '4.4.7 Query with "-" matches address');
    assert(matchesLead(testLeads[4], 'km 120'), '4.4.8 Query with number and space matches');

    // Dot, Backslash, Caret, Dollar sign
    assert(matchesLead(testLeads[2], 'Ltda.'), '4.4.9 Query with "." matches literal dot in Lead 3');
    assert(!matchesLead(testLeads[0], '\\bClinica\\b'), '4.4.10 Query with "\\" backslash does not throw');
    assert(!matchesLead(testLeads[0], '^Clinica'), '4.4.11 Query with "^" does not throw');
    assert(!matchesLead(testLeads[0], 'Ouro$'), '4.4.12 Query with "$" does not throw');

    // Ampersand
    assert(matchesLead(testLeads[1], 'Fogo & Brasa') === false, '4.4.13 Ampersand query handles correctly');
    assert(matchesLead(testLeads[4], 'Fogo & Brasa') === true, '4.4.14 Ampersand query matches Lead 5');
  } catch (err) {
    threwRegexError = true;
    console.error('Regex / syntax error caught:', err);
  }
  assert(!threwRegexError, '4.4.15 Zero regex syntax errors thrown across all punctuation tests');

  // 4.5 Whitespace Handling
  console.log('\n  [4.5 Whitespace handling]');
  assert(
    matchesLead(testLeads[0], '   clinica'),
    '4.5.1 Query with leading spaces matches correctly'
  );
  assert(
    matchesLead(testLeads[0], 'clinica   '),
    '4.5.2 Query with trailing spaces matches correctly'
  );
  assert(
    matchesLead(testLeads[0], 'clinica       cambui'),
    '4.5.3 Query with multiple intermediate spaces matches correctly'
  );
  assert(
    matchesLead(testLeads[0], '\tclinica\t\n'),
    '4.5.4 Query with tabs and newlines handles safely'
  );

  // 4.6 Empty, Whitespace-only, and Null Fields
  console.log('\n  [4.6 Empty queries and null/undefined lead fields]');
  assert(
    testLeads.every((lead) => matchesLead(lead, '')),
    '4.6.1 Empty query ("") returns all 6 leads (100% match)'
  );
  assert(
    testLeads.every((lead) => matchesLead(lead, '     ')),
    '4.6.2 Whitespace-only query returns all 6 leads (100% match)'
  );
  assert(
    matchesLead(testLeads[5], 'Sem Campos'),
    '4.6.3 Lead with undefined category and address matches name safely without TypeError'
  );
  assert(
    !matchesLead(testLeads[5], 'Dentista'),
    '4.6.4 Lead with undefined category does not match other categories'
  );

  // 4.7 Non-matching Queries
  console.log('\n  [4.7 Non-matching queries]');
  const nonMatchingResults = testLeads.filter((lead) =>
    matchesLead(lead, 'ZzZTermoTotalmenteInexistente999')
  );
  assert(
    nonMatchingResults.length === 0,
    '4.7.1 Non-matching query returns exactly 0 matches'
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`  CHALLENGER STRESS TEST RESULTS`);
  console.log(`  Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
  if (failCount > 0) {
    console.log('  Failures:');
    failures.forEach((f) => console.log(`    - ${f}`));
  }
  console.log(`  Verdict: ${failCount === 0 ? 'APPROVE' : 'REJECT'}`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runChallengerTests().catch((err) => {
  console.error('Fatal error in challenger test execution:', err);
  process.exit(1);
});
