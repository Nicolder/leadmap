import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeLocalLeads } from '@/lib/scraper/maps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { niche, location } = body;

    if (!niche || !location) {
      return NextResponse.json(
        { error: 'Nicho e localização são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanNiche = String(niche).trim();
    const cleanLocation = String(location).trim();

    // 1. Executa a extração
    const rawLeads = await scrapeLocalLeads({
      niche: cleanNiche,
      location: cleanLocation,
    });

    // 2. Persiste no banco de dados
    const searchJob = await db.searchJob.create({
      data: {
        niche: cleanNiche,
        location: cleanLocation,
        totalFound: rawLeads.length,
        isPaid: false,
        leads: {
          create: rawLeads.map((l) => ({
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
    });

    return NextResponse.json({
      jobId: searchJob.id,
      niche: searchJob.niche,
      location: searchJob.location,
      totalFound: searchJob.totalFound,
    });
  } catch (error) {
    console.error('Erro na API /api/search:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar a busca de leads.' },
      { status: 500 }
    );
  }
}

