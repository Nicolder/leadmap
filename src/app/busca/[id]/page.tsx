'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { PixModal } from '@/components/PixModal';
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LockClosedIcon,
  StarFilledIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';

interface LeadItem {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  whatsappUrl?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  isLocked?: boolean;
}

interface JobData {
  id: string;
  niche: string;
  location: string;
  totalFound: number;
  isPaid: boolean;
  createdAt: string;
}

export default function SearchResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [sampleLeads, setSampleLeads] = useState<LeadItem[]>([]);
  const [lockedLeads, setLockedLeads] = useState<LeadItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/search/${id}`);
      if (!res.ok) throw new Error('Falha ao carregar busca');
      const data = await res.json();

      setJob(data.job);
      if (data.job.isPaid) {
        setSampleLeads(data.leads || []);
        setLockedLeads([]);
      } else {
        setSampleLeads(data.sampleLeads || []);
        setLockedLeads(data.lockedLeads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="py-24 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center gap-3">
        <UpdateIcon className="w-5 h-5 animate-spin text-[#111111]" />
        <span className="text-xs font-mono text-[#787774]">
          Carregando registros de empresas...
        </span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-24 max-w-5xl mx-auto px-6 text-center">
        <h2 className="font-serif text-2xl text-[#111111]">Busca não encontrada</h2>
        <p className="text-xs text-[#787774] mt-2 mb-6">
          O identificador fornecido expirou ou não existe no banco de dados.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#111111] border border-[#EAEAEA] px-3 py-1.5 rounded-[5px] hover:border-[#111111]"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Voltar para a página inicial</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 max-w-5xl mx-auto px-6">
      {/* Navegação de Topo */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#787774] hover:text-[#111111] transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Nova Busca</span>
        </Link>

        {job.isPaid ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#EDF3EC] text-[#346538] px-3 py-1 rounded-full">
            <CheckCircledIcon className="w-4 h-4" />
            <span>Lista Completa Desbloqueada</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#FBF3DB] text-[#956400] px-3 py-1 rounded-full">
            <LockClosedIcon className="w-3.5 h-3.5" />
            <span>Amostra de 5 contatos liberados</span>
          </span>
        )}
      </div>

      {/* Cabeçalho da Busca & Ações */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#EAEAEA]">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#787774]">
            Resultado da Varredura
          </span>
          <h1 className="editorial-serif text-3xl md:text-4xl text-[#111111] font-medium mt-1">
            {job.niche} em {job.location}
          </h1>
          <p className="text-xs text-[#787774] font-mono mt-1">
            Total de {job.totalFound} estabelecimentos mapeados com contatos públicos.
          </p>
        </div>

        <div>
          {job.isPaid ? (
            <a
              href={`/api/export/${job.id}`}
              className="bg-[#111111] text-white px-5 py-2.5 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Baixar Planilha Excel (.xlsx)</span>
            </a>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#111111] text-white px-6 py-3 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Desbloquear Todos ({job.totalFound} Leads) — R$ 19,90</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="mt-8 bg-white border border-[#EAEAEA] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FBFBFA] font-mono text-[#787774] text-[11px]">
                <th className="py-3 px-4 font-normal">Empresa</th>
                <th className="py-3 px-4 font-normal">Telefone</th>
                <th className="py-3 px-4 font-normal">WhatsApp</th>
                <th className="py-3 px-4 font-normal">Endereço</th>
                <th className="py-3 px-4 font-normal">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA] text-[#111111]">
              {/* Leads Liberados (Amostra ou Pagos) */}
              {sampleLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F9F9F8] transition-colors">
                  <td className="py-3.5 px-4 font-medium">
                    <div>{lead.name}</div>
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-mono text-[#1F6C9F] hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>Website</span>
                        <ExternalLinkIcon className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#787774] whitespace-nowrap">
                    {lead.phone || 'Não informado'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {lead.whatsappUrl && lead.whatsappUrl !== '#' ? (
                      <a
                        href={lead.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#346538] bg-[#EDF3EC] px-2.5 py-1 rounded hover:bg-[#346538] hover:text-white transition-colors"
                      >
                        <span>Conversar no WhatsApp</span>
                        <ExternalLinkIcon className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-[#787774] font-mono text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#787774] max-w-xs truncate">
                    {lead.address || 'Endereço não listado'}
                  </td>
                  <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <StarFilledIcon className="w-3 h-3 text-amber-500" />
                      <span>{lead.rating || '-'}</span>
                      <span className="text-[#787774] text-[10px]">
                        ({lead.reviewCount || 0})
                      </span>
                    </span>
                  </td>
                </tr>
              ))}

              {/* Leads Bloqueados (Visual com Efeito Blur) */}
              {!job.isPaid &&
                lockedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="opacity-40 filter blur-[2px] select-none pointer-events-none"
                  >
                    <td className="py-3.5 px-4 font-medium">{lead.name}</td>
                    <td className="py-3.5 px-4 font-mono">{lead.phone}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono bg-[#EDF3EC] text-[#346538] px-2 py-0.5 rounded">
                        WhatsApp Oculto
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#787774]">{lead.address}</td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="inline-flex items-center gap-1">
                        <StarFilledIcon className="w-3 h-3 text-amber-500" />
                        <span>{lead.rating}</span>
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Banner Flutuante de Bloqueio se não estiver pago */}
        {!job.isPaid && (
          <div className="border-t border-[#EAEAEA] bg-[#FBFBFA] p-8 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center mb-3">
              <LockClosedIcon className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-2xl text-[#111111] font-medium">
              Desbloqueie os {lockedLeads.length} contatos restantes
            </h3>
            <p className="text-xs text-[#787774] max-w-md mt-1 mb-6">
              Os 5 primeiros contatos acima foram liberados para você avaliar a qualidade. Pague R$ 19,90 via PIX para liberar todos os telefones, links de WhatsApp e baixar a planilha completa em Excel.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#111111] text-white px-8 py-3 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all active:scale-[0.98] inline-flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Desbloquear Lista Completa (R$ 19,90 no PIX)</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal PIX */}
      <PixModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        searchJobId={job.id}
        onPaymentApproved={() => {
          fetchData();
        }}
      />
    </div>
  );
}
