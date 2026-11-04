import { scrapeLocalLeads } from '../lib/scraper/maps';
import { db } from '../lib/db';
import { createPixPayment } from '../lib/mercadopago';
import * as XLSX from 'xlsx';

async function verify() {
  console.log('--- 1. TESTE DO MOTOR DE EXTRAÇÃO (SCRAPER) ---');
  const leads = await scrapeLocalLeads({
    niche: 'Clínica Odontológica',
    location: 'Campinas - SP',
  });

  console.log(`Leads encontrados: ${leads.length}`);
  if (leads.length === 0) throw new Error('Scraper não retornou nenhum lead');

  const firstLead = leads[0];
  console.log('Amostra do primeiro lead:', {
    name: firstLead.name,
    category: firstLead.category,
    phone: firstLead.phone,
    whatsappUrl: firstLead.whatsappUrl,
    address: firstLead.address,
    rating: firstLead.rating,
  });

  if (!firstLead.whatsappUrl.startsWith('https://wa.me/')) {
    throw new Error('Link do WhatsApp não formatado corretamente');
  }

  console.log('\n--- 2. TESTE DE PERSISTÊNCIA NO BANCO (PRISMA + SQLITE) ---');
  const job = await db.searchJob.create({
    data: {
      niche: 'Clínica Odontológica',
      location: 'Campinas - SP',
      totalFound: leads.length,
      isPaid: false,
      leads: {
        create: leads.slice(0, 10).map((l) => ({
          name: l.name,
          category: l.category,
          phone: l.phone,
          whatsappUrl: l.whatsappUrl,
          address: l.address,
          website: l.website,
          rating: l.rating,
          reviewCount: l.reviewCount,
        })),
      },
    },
    include: { leads: true },
  });

  console.log(`Job salvo com sucesso! ID: ${job.id}, Total de leads salvos: ${job.leads.length}`);

  console.log('\n--- 3. TESTE DE CHECKOUT PIX (MERCADO PAGO ENGINE) ---');
  const pix = await createPixPayment({
    searchJobId: job.id,
    amount: 19.9,
    email: 'comprador.teste@leadmap.com.br',
    description: 'Lista de Dentistas em Campinas',
  });

  console.log('Cobrança PIX gerada com sucesso:', {
    paymentId: pix.id,
    status: pix.status,
    hasQrCode: Boolean(pix.qrCode),
    hasQrBase64: Boolean(pix.qrCodeBase64),
    isSimulated: pix.isSimulated,
  });

  console.log('\n--- 4. TESTE DE GERAÇÃO DA PLANILHA EXCEL (.XLSX) ---');
  const rows = job.leads.map((l, index) => ({
    '#': index + 1,
    'Empresa': l.name,
    'Categoria': l.category || job.niche,
    'Telefone': l.phone || 'Não informado',
    'Link WhatsApp': l.whatsappUrl || '',
    'Endereço Completo': l.address || '',
    'Website': l.website || 'Sem site',
    'Nota Google': l.rating || '-',
    'Avaliações': l.reviewCount || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  console.log(`Planilha gerada com sucesso! Tamanho do buffer: ${buffer.length} bytes`);

  console.log('\n>>> TODOS OS TESTES PASSARAM COM SUCESSO! <<<');
}

verify()
  .catch((e) => {
    console.error('Erro na verificação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

