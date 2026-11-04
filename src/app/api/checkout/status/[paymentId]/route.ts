import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPaymentStatus } from '@/lib/mercadopago';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const { searchParams } = new URL(req.url);
    const simulateApprove = searchParams.get('simulateApprove') === 'true';

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { searchJob: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado.' }, { status: 404 });
    }

    // Se já está aprovado, retorna imediatamente
    if (payment.status === 'approved' || payment.searchJob.isPaid) {
      return NextResponse.json({
        status: 'approved',
        isPaid: true,
        jobId: payment.searchJobId,
      });
    }

    // Teste / Simulação de aprovação no ambiente de testes
    if (simulateApprove) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'approved' },
      });

      await db.searchJob.update({
        where: { id: payment.searchJobId },
        data: { isPaid: true },
      });

      return NextResponse.json({
        status: 'approved',
        isPaid: true,
        jobId: payment.searchJobId,
        simulated: true,
      });
    }

    // Consulta na API do Mercado Pago se houver ID externo
    if (payment.mpPaymentId && !payment.mpPaymentId.startsWith('sim_')) {
      const mpCheck = await checkPaymentStatus(payment.mpPaymentId);
      if (mpCheck.status === 'approved') {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'approved' },
        });

        await db.searchJob.update({
          where: { id: payment.searchJobId },
          data: { isPaid: true },
        });

        return NextResponse.json({
          status: 'approved',
          isPaid: true,
          jobId: payment.searchJobId,
        });
      }
    }

    return NextResponse.json({
      status: payment.status,
      isPaid: payment.searchJob.isPaid,
      jobId: payment.searchJobId,
    });
  } catch (error) {
    console.error('Erro na checagem de status do pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar status do pagamento.' },
      { status: 500 }
    );
  }
}

