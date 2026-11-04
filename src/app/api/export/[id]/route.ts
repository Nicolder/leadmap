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

    // Formata os dados para a planilha conforme Contrato R5 e PROJECT.md
    const rows = job.leads.map((l, index) => ({
      '#': index + 1,
      'Nome do Negócio': l.name,
      'Categoria': l.category || job.niche,
      'Endereço': l.address || 'Não informado',
      'Cidade': job.location,
      'Telefone': l.phone || 'Não informado',
      'Link WhatsApp': l.whatsappUrl || '',
      'Website': l.website || 'Sem site cadastrado',
      'Nota Google': l.rating !== null && l.rating !== undefined ? l.rating : '-',
      'Avaliações': l.reviewCount !== null && l.reviewCount !== undefined ? l.reviewCount : 0,
    }));

    // Cria o workbook e a worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Ajusta a largura das colunas para legibilidade
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 35 }, // Nome do Negócio
      { wch: 22 }, // Categoria
      { wch: 40 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 18 }, // Telefone
      { wch: 45 }, // Link WhatsApp
      { wch: 28 }, // Website
      { wch: 12 }, // Nota Google
      { wch: 12 }, // Avaliações
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Extraídos');

    // Gera o buffer binário
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

