import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.searchJob.findUnique({
      where: { id },
      include: {
        leads: {
          orderBy: { rating: 'desc' },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Busca não encontrada.' }, { status: 404 });
    }

    if (!job.isPaid) {
      return NextResponse.json(
        { error: 'Acesso bloqueado. O pagamento do relatório ainda não foi confirmado.' },
        { status: 403 }
      );
    }

    // 1. Estruturação profissional e limpa dos dados para o time comercial
    const rows = job.leads.map((l, index) => {
      // Separa endereço e bairro de forma mais amigável
      const addressParts = (l.address || '').split('-');
      const logradouro = addressParts[0]?.trim() || l.address || 'Não informado';
      const bairro = addressParts[1]?.split(',')[0]?.trim() || '-';

      return {
        '#': index + 1,
        'Empresa': l.name,
        'Telefone': l.phone || 'Não informado',
        'Link WhatsApp': l.whatsappUrl
          ? { f: `HYPERLINK("${l.whatsappUrl}", "Chamar no WhatsApp")`, v: 'Chamar no WhatsApp' }
          : '-',
        'Categoria': l.category || job.niche,
        'Logradouro': logradouro,
        'Bairro': bairro,
        'Cidade / UF': job.location,
        'Website': l.website && l.website.startsWith('http')
          ? { f: `HYPERLINK("${l.website}", "Acessar Site")`, v: 'Acessar Site' }
          : 'Sem site',
        'Nota Google': l.rating !== null && l.rating !== undefined ? Number(l.rating) : '-',
        'Avaliações': l.reviewCount !== null && l.reviewCount !== undefined ? Number(l.reviewCount) : 0,
      };
    });

    // 2. Criação da planilha com SheetJS
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // 3. Ajuste inteligente e generoso da largura das colunas (evita texto cortado ou ###)
    worksheet['!cols'] = [
      { wch: 6 },  // #
      { wch: 38 }, // Empresa
      { wch: 18 }, // Telefone
      { wch: 24 }, // Link WhatsApp
      { wch: 26 }, // Categoria
      { wch: 36 }, // Logradouro
      { wch: 22 }, // Bairro
      { wch: 22 }, // Cidade / UF
      { wch: 18 }, // Website
      { wch: 14 }, // Nota Google
      { wch: 14 }, // Avaliações
    ];

    // 4. Habilita filtros automáticos do Excel na primeira linha (AutoFilter)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:K1');
    worksheet['!autofilter'] = { ref: `A1:K${range.e.r + 1}` };

    // 5. Congela a primeira linha (cabeçalho sempre visível ao rolar para baixo)
    worksheet['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0, activeCell: 'A2' }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Qualificados');

    // 6. Geração do arquivo binário .xlsx
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const safeNiche = job.niche.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeLocation = job.location.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `leads_${safeNiche}_${safeLocation}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro na exportação da planilha:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar o arquivo Excel.' },
      { status: 500 }
    );
  }
}
