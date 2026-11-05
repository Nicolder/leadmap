'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, CopyIcon, Cross2Icon, Link2Icon, UpdateIcon } from '@radix-ui/react-icons';

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchJobId: string;
  totalFound?: number;
  onPaymentApproved: () => void;
}

export function PixModal({
  isOpen,
  onClose,
  searchJobId,
  totalFound,
  onPaymentApproved,
}: PixModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
    isSimulated?: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedPermanentLink, setCopiedPermanentLink] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>('Aguardando transferência...');

  // Mantém referência estável para não re-disparar useEffects desnecessariamente
  const onPaymentApprovedRef = useRef(onPaymentApproved);
  useEffect(() => {
    onPaymentApprovedRef.current = onPaymentApproved;
  }, [onPaymentApproved]);

  const hasNotifiedRef = useRef(false);

  // 1. Gera ou recupera a cobrança PIX ao abrir o modal
  useEffect(() => {
    if (!isOpen) {
      hasNotifiedRef.current = false;
      return;
    }
    if (!searchJobId) return;

    let isMounted = true;
    setLoading(true);

    fetch('/api/checkout/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchJobId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.isPaid) {
          setIsPaid(true);
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onPaymentApprovedRef.current();
          }
        } else if (data.paymentId) {
          setPaymentData(data);
        }
      })
      .catch((err) => console.error('Erro ao gerar PIX:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, searchJobId]);

  // 2. Polling periódico para verificar aprovação automática
  useEffect(() => {
    if (!paymentData?.paymentId || isPaid || !isOpen) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status/${paymentData.paymentId}`);
        const data = await res.json();

        if (data.status === 'approved' || data.isPaid) {
          setIsPaid(true);
          setPollingStatus('Pagamento aprovado com sucesso!');
          clearInterval(interval);
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onPaymentApprovedRef.current();
          }
        }
      } catch (e) {
        console.warn('Erro no polling de status:', e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [paymentData?.paymentId, isPaid, isOpen]);

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard writeText failed, using fallback:', err);
      }
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback clipboard copy failed:', err);
      return false;
    }
  };

  const handleCopy = async () => {
    if (!paymentData?.qrCode) return;
    const ok = await copyTextToClipboard(paymentData.qrCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyPermanentLink = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/busca/${searchJobId}`
      : `/busca/${searchJobId}`;
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedPermanentLink(true);
      setTimeout(() => setCopiedPermanentLink(false), 2500);
    }
  };

  const handleSimulatePayment = async () => {
    if (!paymentData?.paymentId || isSimulating) return;
    setIsSimulating(true);
    try {
      const res = await fetch(`/api/checkout/status/${paymentData.paymentId}?simulateApprove=true`);
      const data = await res.json();
      if (data.status === 'approved' || data.isPaid) {
        setIsPaid(true);
        setPollingStatus('Pagamento de teste confirmado!');
        if (!hasNotifiedRef.current) {
          hasNotifiedRef.current = true;
          onPaymentApprovedRef.current();
        }
      }
    } catch (e) {
      console.error('Erro ao simular aprovação:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#EAEAEA] rounded-[8px] w-full max-w-md p-6 relative shadow-sm">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#787774] hover:text-[#111111] p-1 rounded transition-colors"
          title="Fechar"
        >
          <Cross2Icon className="w-5 h-5" />
        </button>

        {!isPaid ? (
          <div>
            <div className="mb-6">
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F]">
                Checkout PIX Instantâneo
              </span>
              <h3 className="font-serif text-2xl text-[#111111] mt-2 font-medium">
                Desbloquear Lista Completa {totalFound ? `(${totalFound} Leads)` : ''}
              </h3>
              <p className="text-xs text-[#787774] mt-1">
                Pague via PIX para liberar o download imediato de todos os {totalFound ? `${totalFound} contatos reais` : 'contatos'} em formato Excel (.xlsx).
              </p>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <UpdateIcon className="w-5 h-5 animate-spin text-[#111111]" />
                <span className="text-xs text-[#787774] font-mono">
                  Gerando cobrança PIX...
                </span>
              </div>
            ) : paymentData ? (
              <div className="space-y-4">
                {/* Imagem do QR Code */}
                <div className="flex flex-col items-center justify-center p-4 bg-[#F9F9F8] border border-[#EAEAEA] rounded-[6px]">
                  {paymentData.qrCodeBase64 ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={
                        paymentData.isSimulated ||
                        paymentData.qrCodeBase64.startsWith('PHN2Zw') ||
                        paymentData.qrCodeBase64.startsWith('PD94bW')
                          ? `data:image/svg+xml;base64,${paymentData.qrCodeBase64}`
                          : `data:image/png;base64,${paymentData.qrCodeBase64}`
                      }
                      alt="QR Code PIX"
                      className="w-48 h-48 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('svg+xml')) {
                          target.src = `data:image/svg+xml;base64,${paymentData.qrCodeBase64}`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center font-mono text-xs text-[#787774]">
                      QR Code disponível via código
                    </div>
                  )}
                  <span className="text-xs font-mono text-[#787774] mt-2">
                    Valor: R$ {paymentData.amount.toFixed(2)}
                  </span>
                </div>

                {/* Copia e Cola */}
                <div>
                  <label className="text-[11px] font-mono text-[#787774] block mb-1">
                    PIX Copia e Cola:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={paymentData.qrCode}
                      className="flex-1 bg-[#F9F9F8] border border-[#EAEAEA] text-xs font-mono text-[#111111] px-3 py-2 rounded-[6px] truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="bg-[#111111] text-white text-xs px-3.5 py-2 rounded-[6px] flex items-center gap-1.5 hover:bg-[#2F3437] transition-all active:scale-[0.98]"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="w-4 h-4 text-emerald-400" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Indicador de Status com Polling */}
                <div className="flex items-center justify-between pt-2 border-t border-[#EAEAEA] text-xs text-[#787774]">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    {pollingStatus}
                  </span>

                  {/* Atalho de teste para demonstração */}
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="text-[11px] font-mono text-[#1F6C9F] hover:underline disabled:opacity-50"
                    title="Simula a aprovação imediata do PIX para teste"
                  >
                    {isSimulating ? '[Processando...]' : '[Simular Aprovação]'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Estado de Sucesso */
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-[#EDF3EC] text-[#346538] rounded-full mx-auto flex items-center justify-center">
              <CheckIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-[#111111] font-medium">
                Pagamento Aprovado!
              </h3>
              <p className="text-xs text-[#787774] mt-1">
                Sua lista completa com todos os {totalFound ? `${totalFound} contatos reais` : 'contatos'} foi desbloqueada com sucesso.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-2.5">
              <a
                href={`/api/export/${searchJobId}`}
                className="w-full bg-[#111111] text-white py-2.5 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Baixar Planilha Excel {totalFound ? `(${totalFound} Leads)` : '(.xlsx)'}</span>
              </a>

              <button
                type="button"
                onClick={handleCopyPermanentLink}
                className="w-full border border-[#EAEAEA] bg-[#FBFBFA] hover:bg-white hover:border-[#111111] text-[#111111] py-2.5 rounded-[6px] text-xs font-mono transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {copiedPermanentLink ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-[#346538]" />
                    <span className="text-[#346538]">Link permanente copiado!</span>
                  </>
                ) : (
                  <>
                    <Link2Icon className="w-4 h-4 text-[#787774]" />
                    <span>Copiar link permanente desta lista</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-[#787774] font-mono leading-relaxed">
                Salve o link nos favoritos para consultar ou baixar esta lista quando quiser.
              </p>

              <button
                onClick={onClose}
                className="text-xs text-[#787774] hover:text-[#111111] py-1 transition-colors"
              >
                Continuar visualizando na tela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
