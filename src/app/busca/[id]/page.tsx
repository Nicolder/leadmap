'use client';

import React, { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { PixModal } from '@/components/PixModal';
import { SearchBar } from '@/components/SearchBar';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircledIcon,
  CheckIcon,
  Cross2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
  Link2Icon,
  LockClosedIcon,
  MagnifyingGlassIcon,
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

const POPULAR_BROAD_SUGGESTIONS = [
  'Restaurantes',
  'Clínicas Odontológicas',
  'Escritórios de Advocacia',
  'Contabilidade',
  'Oficinas Mecânicas',
  'Imobiliárias & Corretores',
  'Academias',
  'Salões & Barbearias',
];

/**
 * Normaliza strings para busca insensível a maiúsculas/minúsculas e acentuação gráfica.
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Verifica se o lead atende a todos os termos digitados pelo usuário
 * nos campos nome, categoria ou endereço/bairro.
 */
function matchesLead(lead: LeadItem, query: string): boolean {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return true;

  const terms = cleanQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalizeText(
    `${lead.name || ''} ${lead.category || ''} ${lead.address || ''}`
  );

  return terms.every((term) => haystack.includes(term));
}

/**
 * Utilitário resiliente para copiar texto para a área de transferência.
 */
async function copyToClipboard(text: string): Promise<boolean> {
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
}

export default function SearchResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [initialLoading, setInitialLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [sampleLeads, setSampleLeads] = useState<LeadItem[]>([]);
  const [lockedLeads, setLockedLeads] = useState<LeadItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      const res = await fetch(`/api/search/${id}`);
      if (!res.ok) throw new Error('Falha ao carregar busca');
      const data = await res.json();

      setJob(data.job);
      if (data.job?.isPaid) {
        setSampleLeads(data.leads || []);
        setLockedLeads([]);
      } else {
        setSampleLeads(data.sampleLeads || []);
        setLockedLeads(data.lockedLeads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handlePaymentApproved = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  const handleCopyLink = useCallback(async () => {
    // Garante que o link copiado aponte sempre para o domínio público oficial e nunca para preview bloqueado da Vercel
    const origin =
      typeof window !== 'undefined' && !window.location.hostname.includes('projects.vercel.app')
        ? window.location.origin
        : 'https://leadmap-peach.vercel.app';
    const url = `${origin}/busca/${id}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }, [id]);

  // Filtragem instantânea dinâmica no estado do cliente
  const filteredSampleLeads = useMemo(() => {
    return sampleLeads.filter((lead) => matchesLead(lead, filterQuery));
  }, [sampleLeads, filterQuery]);

  const filteredLockedLeads = useMemo(() => {
    return lockedLeads.filter((lead) => matchesLead(lead, filterQuery));
  }, [lockedLeads, filterQuery]);

  const totalOriginalCount = sampleLeads.length + lockedLeads.length;
  const totalFilteredCount = filteredSampleLeads.length + filteredLockedLeads.length;

  if (initialLoading && !job) {
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

  const isZeroLeads = job.totalFound === 0;

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

        {isZeroLeads ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#F7F6F3] text-[#787774] px-3 py-1 rounded-full border border-[#EAEAEA]">
            <InfoCircledIcon className="w-3.5 h-3.5" />
            <span>Nenhum contato encontrado (0 leads)</span>
          </span>
        ) : job.isPaid ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#EDF3EC] text-[#346538] px-3 py-1 rounded-full">
            <CheckCircledIcon className="w-4 h-4" />
            <span>Lista Completa Desbloqueada ({job.totalFound} {job.totalFound === 1 ? 'lead' : 'leads'})</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#FBF3DB] text-[#956400] px-3 py-1 rounded-full">
            <LockClosedIcon className="w-3.5 h-3.5" />
            <span>Amostra de {sampleLeads.length} de {job.totalFound} contatos liberada</span>
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
            {isZeroLeads
              ? 'Nenhum estabelecimento comercial com contato ativo foi localizado para estes termos.'
              : `Total de ${job.totalFound} ${job.totalFound === 1 ? 'estabelecimento mapeado' : 'estabelecimentos mapeados'} com contatos públicos.`}
          </p>
        </div>

        {/* Botões de Ação do Cabeçalho */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="border border-[#EAEAEA] bg-white text-[#111111] hover:border-[#111111] px-4 py-2.5 rounded-[6px] text-xs font-mono inline-flex items-center gap-2 transition-all active:scale-[0.98]"
            title="Copiar link permanente desta lista"
          >
            {copiedLink ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-[#346538]" />
                <span className="text-[#346538]">Link copiado!</span>
              </>
            ) : (
              <>
                <Link2Icon className="w-3.5 h-3.5 text-[#787774]" />
                <span>Copiar link permanente desta lista</span>
              </>
            )}
          </button>

          {isZeroLeads ? (
            <Link
              href="/"
              className="bg-[#111111] text-white px-5 py-2.5 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              <span>Fazer Nova Busca</span>
            </Link>
          ) : job.isPaid ? (
            <a
              href={`/api/export/${job.id}`}
              className="bg-[#111111] text-white px-5 py-2.5 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Baixar Planilha Excel ({job.totalFound} Leads)</span>
            </a>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#111111] text-white px-6 py-2.5 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all inline-flex items-center gap-2 active:scale-[0.98]"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Desbloquear Todos ({job.totalFound} Leads) — R$ 19,90</span>
            </button>
          )}
        </div>
      </div>

      {/* ESTADO ZERO HONESTO (Quando 0 leads foram encontrados) */}
      {isZeroLeads ? (
        <div className="mt-8 bg-white border border-[#EAEAEA] rounded-[8px] p-8 md:p-12 text-center max-w-3xl mx-auto shadow-none">
          <div className="w-12 h-12 rounded-full bg-[#F7F6F3] border border-[#EAEAEA] text-[#111111] mx-auto flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="w-6 h-6" />
          </div>

          <h2 className="font-serif text-2xl md:text-3xl text-[#111111] font-medium mb-2">
            Nenhuma empresa encontrada para este nicho na região
          </h2>

          <p className="text-xs md:text-sm text-[#787774] max-w-xl mx-auto leading-relaxed mb-6">
            Varremos os registros públicos de empresas locais e o Google Maps para{' '}
            <strong className="text-[#111111]">{job.niche}</strong> em{' '}
            <strong className="text-[#111111]">{job.location}</strong>, mas nenhum estabelecimento com telefone ativo e comercial foi localizado com esses termos exatos.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[6px] bg-[#EDF3EC] text-[#346538] text-xs font-mono mb-8 border border-[#D3E5D4]">
            <CheckCircledIcon className="w-4 h-4 flex-shrink-0" />
            <span>Cobrança protegida: Você nunca paga por buscas sem resultados no Rastro. O checkout está desativado.</span>
          </div>

          {/* Sugestões Práticas de Termos Mais Amplos */}
          <div className="bg-[#FBFBFA] border border-[#EAEAEA] rounded-[6px] p-6 text-left mb-8">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#111111] font-semibold mb-3">
              Como encontrar mais empresas:
            </h3>
            <ul className="space-y-3 text-xs text-[#787774]">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] mt-1.5 flex-shrink-0" />
                <div>
                  <strong className="text-[#111111]">Amplie o termo de nicho:</strong> Termos excessivamente específicos (ex: <em>&ldquo;clínica de prótese protocolo fixa&rdquo;</em>) reduzem drasticamente os cadastros. Prefira o segmento principal, como <em>&ldquo;Clínica Odontológica&rdquo;</em> ou <em>&ldquo;Dentista&rdquo;</em>.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] mt-1.5 flex-shrink-0" />
                <div>
                  <strong className="text-[#111111]">Amplie a localização:</strong> Se você pesquisou um micro-bairro ou condomínio, tente a cidade polo ou município vizinho (ex: <em>&ldquo;Campinas - SP&rdquo;</em> em vez de uma vila residencial).
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111111] mt-1.5 flex-shrink-0" />
                <div>
                  <strong className="text-[#111111]">Remova qualificadores:</strong> Adjetivos como <em>&ldquo;melhor&rdquo;</em>, <em>&ldquo;24 horas&rdquo;</em>, <em>&ldquo;barato&rdquo;</em> ou <em>&ldquo;perto de mim&rdquo;</em> não constam na razão social das empresas no Maps.
                </div>
              </li>
            </ul>

            {/* Atalhos Rápidos para Categorias Populares */}
            <div className="mt-5 pt-4 border-t border-[#EAEAEA]">
              <span className="text-[11px] font-mono text-[#787774] block mb-2">
                Experimente pesquisar em {job.location}:
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_BROAD_SUGGESTIONS.map((term) => (
                  <Link
                    key={term}
                    href={`/?niche=${encodeURIComponent(term)}&location=${encodeURIComponent(job.location)}`}
                    className="text-[11px] font-mono text-[#111111] bg-white border border-[#EAEAEA] px-2.5 py-1 rounded-[4px] hover:border-[#111111] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>{term}</span>
                    <ArrowRightIcon className="w-3 h-3 text-[#787774]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Refinar Busca Direto na Tela */}
          <div className="max-w-xl mx-auto">
            <span className="block text-xs font-mono text-[#787774] mb-2">
              Refaça sua busca agora mesmo:
            </span>
            <SearchBar
              initialNiche=""
              initialLocation={job.location}
              compact={true}
            />
          </div>
        </div>
      ) : (
        /* TABELA DE LEADS COM FILTRO INSTANTÂNEO (R4) */
        <div className="mt-8 bg-white border border-[#EAEAEA] rounded-[8px] overflow-hidden">
          {/* Barra de Ferramentas / Filtro Rápido */}
          <div className="p-3 border-b border-[#EAEAEA] bg-[#FBFBFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787774]" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrar por nome, bairro ou categoria..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#EAEAEA] rounded-[6px] text-[#111111] placeholder:text-[#787774]/70 focus:outline-none focus:border-[#111111] transition-colors"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#111111] p-0.5 rounded transition-colors"
                  title="Limpar filtro"
                >
                  <Cross2Icon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Contador de Leads */}
            <div className="text-[11px] font-mono text-[#787774] flex items-center gap-1.5 whitespace-nowrap">
              <span>
                Mostrando <strong className="text-[#111111]">{totalFilteredCount}</strong> de{' '}
                <strong className="text-[#111111]">{totalOriginalCount}</strong> {totalOriginalCount === 1 ? 'lead' : 'leads'}
              </span>
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="text-[#1F6C9F] hover:underline ml-1 font-mono"
                >
                  (limpar)
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Dados */}
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
                {filteredSampleLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F9F9F8] transition-colors">
                    <td className="py-3.5 px-4 font-medium">
                      <div>{lead.name}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {lead.category && (
                          <span className="text-[10px] font-mono text-[#787774] bg-[#F7F6F3] px-1.5 py-0.5 rounded border border-[#EAEAEA]">
                            {lead.category}
                          </span>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-[#1F6C9F] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Website</span>
                            <ExternalLinkIcon className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
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
                  filteredLockedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="opacity-40 filter blur-[2px] select-none pointer-events-none"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div>{lead.name}</div>
                        {lead.category && (
                          <span className="text-[10px] font-mono text-[#787774] bg-[#F7F6F3] px-1.5 py-0.5 rounded">
                            {lead.category}
                          </span>
                        )}
                      </td>
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

                {/* Estado vazio interno da tabela quando nenhum lead bate o filtro */}
                {filteredSampleLeads.length === 0 && filteredLockedLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#787774]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MagnifyingGlassIcon className="w-5 h-5 text-[#787774]" />
                        <p className="text-xs font-mono">
                          Nenhum lead encontrado para o filtro &ldquo;
                          <span className="text-[#111111] font-semibold">{filterQuery}</span>
                          &rdquo;.
                        </p>
                        <button
                          type="button"
                          onClick={() => setFilterQuery('')}
                          className="text-xs font-mono text-[#1F6C9F] hover:underline mt-1"
                        >
                          Limpar filtro e exibir todos os {totalOriginalCount} leads
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Banner Flutuante de Bloqueio (Somente se não pago e totalFound > 0) */}
          {!job.isPaid && (
            <div className="border-t border-[#EAEAEA] bg-[#FBFBFA] p-8 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center mb-3">
                <LockClosedIcon className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-2xl text-[#111111] font-medium">
                Desbloqueie os {lockedLeads.length} contatos restantes
              </h3>
              <p className="text-xs text-[#787774] max-w-md mt-1 mb-6">
                Os {sampleLeads.length} primeiros contatos acima foram liberados como amostra real. Pague R$ 19,90 via PIX para liberar todos os {job.totalFound} contatos com telefones, links de WhatsApp e baixar a planilha completa em Excel (.xlsx).
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#111111] text-white px-8 py-3 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all active:scale-[0.98] inline-flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Desbloquear Lista Completa ({job.totalFound} Leads no PIX)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal PIX (apenas acessível se totalFound > 0) */}
      {!isZeroLeads && (
        <PixModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          searchJobId={job.id}
          totalFound={job.totalFound}
          onPaymentApproved={handlePaymentApproved}
        />
      )}
    </div>
  );
}
