import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPaymentStatus } from '@/lib/mercadopago';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    // O Mercado Pago pode enviar o ID no body (data.id) ou nos query params (?data.id=123 ou ?id=123)
    const paymentId =
      body?.data?.id ||
      body?.id ||
      searchParams.get('data.id') ||
      searchParams.get('id');

    const topic = body?.type || searchParams.get('topic') || searchParams.get('type');

    if (!paymentId) {
      return NextResponse.json({ received: true, note: 'No payment ID found' }, { status: 200 });
    }

    if (topic === 'payment' || !topic) {
      const { status } = await checkPaymentStatus(String(paymentId));

      if (status === 'approved') {
        const payment = await db.payment.findUnique({
          where: { mpPaymentId: String(paymentId) },
        });

        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: 'approved' },
          });

          await db.searchJob.update({
            where: { id: payment.searchJobId },
            data: { isPaid: true },
          });

          console.log(`[Mercado Pago Webhook] Pagamento aprovado para o Job: ${payment.searchJobId}`);
        }
      }
    }

    return NextResponse.json({ received: true, status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Erro no webhook Mercado Pago:', error);
    // Sempre retorna 200 para evitar que o gateway continue retentando indefinidamente
    return NextResponse.json({ received: true, error: 'Internal handling error' }, { status: 200 });
  }
}

