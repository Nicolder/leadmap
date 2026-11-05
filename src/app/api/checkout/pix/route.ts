import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPixPayment } from '@/lib/mercadopago';
import { scrapeLocalLeads } from '@/lib/scraper/maps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchJobId, email } = body;

    if (!searchJobId) {
      return NextResponse.json({ error: 'ID da busca é obrigatório.' }, { status: 400 });
    }

    const job = await db.searchJob.findUnique({
      where: { id: searchJobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Busca não encontrada.' }, { status: 404 });
    }

    if (job.isPaid) {
      return NextResponse.json({
        message: 'Esta lista já foi desbloqueada.',
        isPaid: true,
      });
    }

    if (job.totalFound <= 0) {
      // Se totalFound está zerado (ex: mock em testes ou job não indexado), tenta recuperar contatos reais
      const verifiedLeads = await scrapeLocalLeads({
        niche: job.niche,
        location: job.location,
      });

      if (verifiedLeads.length > 0) {
        job.totalFound = verifiedLeads.length;
        await db.searchJob.update({
          where: { id: job.id },
          data: { totalFound: verifiedLeads.length },
        });
      } else {
        return NextResponse.json(
          { error: 'Não é possível cobrar por uma lista sem contatos.' },
          { status: 400 }
        );
      }
    }

    const amount = 19.90;
    const pixResult = await createPixPayment({
      searchJobId: job.id,
      amount,
      email: email || 'cliente@rastro.com.br',
      description: `Lista completa de leads: ${job.niche} em ${job.location}`,
    });

    // Salva o registro de pagamento no banco
    const payment = await db.payment.create({
      data: {
        searchJobId: job.id,
        mpPaymentId: pixResult.id,
        amount,
        status: pixResult.status,
        qrCode: pixResult.qrCode,
        qrCodeBase64: pixResult.qrCodeBase64,
        ticketUrl: pixResult.ticketUrl,
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      mpPaymentId: pixResult.id,
      amount,
      qrCode: pixResult.qrCode,
      qrCodeBase64: pixResult.qrCodeBase64,
      ticketUrl: pixResult.ticketUrl,
      isSimulated: pixResult.isSimulated,
    });
  } catch (error) {
    console.error('Erro na rota /api/checkout/pix:', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar a cobrança PIX.' },
      { status: 500 }
    );
  }
}

