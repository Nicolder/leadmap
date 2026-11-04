import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPixPayment } from '@/lib/mercadopago';

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

    const amount = 19.90;
    const pixResult = await createPixPayment({
      searchJobId: job.id,
      amount,
      email: email || 'cliente@leadmap.com.br',
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

