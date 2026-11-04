import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Se já foi pago, entrega todos os leads abertos
    if (job.isPaid) {
      return NextResponse.json({
        job: {
          id: job.id,
          niche: job.niche,
          location: job.location,
          totalFound: job.totalFound,
          isPaid: true,
          createdAt: job.createdAt,
        },
        leads: job.leads,
        unlockedCount: job.leads.length,
        lockedCount: 0,
      });
    }

    // Se ainda não foi pago:
    // Os 5 primeiros são 100% visíveis (prova de valor / amostra grátis)
    // Os restantes vêm mascarados para exibição visual com blur
    const visibleLeads = job.leads.slice(0, 5);
    const maskedLeads = job.leads.slice(5).map((l) => ({
      id: l.id,
      name: l.name,
      category: l.category,
      phone: `(${l.phone?.slice(1, 3) || 'XX'}) 9****-****`,
      whatsappUrl: '#',
      address: `${l.address?.split(',')[0] || 'Endereço'}, Bairro ***`,
      website: l.website ? 'https://***.com.br' : undefined,
      rating: l.rating,
      reviewCount: l.reviewCount,
      isLocked: true,
    }));

    return NextResponse.json({
      job: {
        id: job.id,
        niche: job.niche,
        location: job.location,
        totalFound: job.totalFound,
        isPaid: false,
        createdAt: job.createdAt,
      },
      sampleLeads: visibleLeads,
      lockedLeads: maskedLeads,
      unlockedCount: visibleLeads.length,
      lockedCount: maskedLeads.length,
    });
  } catch (error) {
    console.error('Erro ao buscar job por id:', error);
    return NextResponse.json(
      { error: 'Falha ao recuperar dados da busca.' },
      { status: 500 }
    );
  }
}
