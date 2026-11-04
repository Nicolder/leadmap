'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, UpdateIcon } from '@radix-ui/react-icons';

interface SearchBarProps {
  initialNiche?: string;
  initialLocation?: string;
  compact?: boolean;
}

const POPULAR_NICHES = [
  'Clínicas Odontológicas',
  'Academias',
  'Barbearias & Salões',
  'Escritórios de Contabilidade',
  'Imobiliárias & Corretores',
  'Oficinas Mecânicas',
];

export function SearchBar({
  initialNiche = '',
  initialLocation = '',
  compact = false,
}: SearchBarProps) {
  const router = useRouter();
  const [niche, setNiche] = useState(initialNiche);
  const [location, setLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState('Consultando registros no Google Maps...');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !location.trim() || loading) return;

    setLoading(true);
    setStepMsg('Consultando registros no Google Maps...');

    const timer1 = setTimeout(() => {
      setStepMsg('Formatando telefones comerciais e WhatsApp...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setStepMsg('Organizando endereços e avaliações...');
    }, 2400);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, location }),
      });

      const data = await response.json();

      if (data.jobId) {
        router.push(`/busca/${data.jobId}`);
      } else {
        alert(data.error || 'Erro ao processar busca.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Falha na busca:', err);
      alert('Não foi possível conectar ao servidor de busca.');
      setLoading(false);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSearch}
        className={`bg-white border border-[#EAEAEA] rounded-[8px] p-2 flex flex-col md:flex-row gap-2 transition-all ${
          compact ? 'max-w-2xl' : 'max-w-3xl'
        }`}
      >
        {/* Campo Nicho */}
        <div className="flex-1 flex items-center px-3 py-2 border border-transparent focus-within:border-[#EAEAEA] rounded-[6px]">
          <div className="w-full">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-[#787774]">
              Segmento / Nicho
            </span>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="Ex: Clínicas Odontológicas"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-transparent text-sm text-[#111111] placeholder:text-[#787774]/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="hidden md:block w-px bg-[#EAEAEA] my-1" />

        {/* Campo Localização */}
        <div className="flex-1 flex items-center px-3 py-2 border border-transparent focus-within:border-[#EAEAEA] rounded-[6px]">
          <div className="w-full">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-[#787774]">
              Cidade / Estado
            </span>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="Ex: Campinas - SP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-transparent text-sm text-[#111111] placeholder:text-[#787774]/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Botão de Ação */}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#111111] text-white px-6 py-3 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <UpdateIcon className="w-4 h-4 animate-spin" />
              <span>Varrendo...</span>
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-4 h-4" />
              <span>Buscar Leads</span>
            </>
          )}
        </button>
      </form>

      {/* Mensagem de Progresso quando buscando */}
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-[#787774] animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
          <span>{stepMsg}</span>
        </div>
      )}

      {/* Sugestões Rápidas de Nicho */}
      {!compact && !loading && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#787774] font-mono mr-1">Exemplos rápidos:</span>
          {POPULAR_NICHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setNiche(item)}
              className="text-[11px] text-[#2F3437] bg-white border border-[#EAEAEA] px-2.5 py-1 rounded-[4px] hover:border-[#111111] transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

