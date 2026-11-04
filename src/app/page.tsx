'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import {
  CheckIcon,
  LightningBoltIcon,
  LockClosedIcon,
  TableIcon,
} from '@radix-ui/react-icons';

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="w-full">
      {/* 1. Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E1F3FE] text-[#1F6C9F] text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F6C9F]" />
            <span>Dados públicos atualizados direto do Google Maps</span>
          </div>

          <h1 className="editorial-serif text-5xl md:text-6xl text-[#111111] font-normal tracking-tight mb-6 leading-[1.08]">
            Encontre empresas locais em qualquer cidade do Brasil em 30 segundos.
          </h1>

          <p className="text-base md:text-lg text-[#787774] leading-relaxed mb-10 max-w-2xl">
            Pare de copiar contato por contato na mão. O LeadMap extrai nome, telefone comercial, link direto de WhatsApp, endereço e avaliação de empresas locais pronto para prospecção ativa e exportação em Excel.
          </p>

          {/* Barra de Busca Principal */}
          <SearchBar />
        </div>
      </section>

      {/* 2. Demonstração Visual: O que você recebe */}
      <section className="py-16 px-6 max-w-5xl mx-auto border-t border-[#EAEAEA]">
        <div className="mb-8">
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#787774]">
            Estrutura da Planilha
          </span>
          <h2 className="font-serif text-3xl text-[#111111] mt-2 font-medium">
            Tudo o que seu time de vendas precisa para fechar negócios.
          </h2>
        </div>

        {/* Mockup de Janela Minimalista (Faux Window Chrome) */}
        <div className="bg-white border border-[#EAEAEA] rounded-[8px] overflow-hidden shadow-none">
          {/* Top Bar da Janela */}
          <div className="bg-[#F9F9F8] border-b border-[#EAEAEA] px-4 py-2.5 flex items-center justify-between text-xs text-[#787774]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EAEAEA]" />
              <span className="font-mono text-[11px] ml-2 text-[#787774]">
                amostra_leads_campinas.xlsx
              </span>
            </div>
            <span className="text-[10px] font-mono bg-[#EDF3EC] text-[#346538] px-2 py-0.5 rounded-full">
              Formato XLSX / CSV
            </span>
          </div>

          {/* Tabela de Amostra Estilizada */}
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
                <tr>
                  <td className="py-3.5 px-4 font-medium">Clínica Odonto Prime Cambuí</td>
                  <td className="py-3.5 px-4 font-mono text-[#787774]">(19) 3251-4090</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#346538] bg-[#EDF3EC] px-2 py-0.5 rounded">
                      (19) 99841-2210
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#787774]">R. Coronel Silva Telles, 420 - Cambuí</td>
                  <td className="py-3.5 px-4 font-mono">4.9 (184 avaliações)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Studio Sorriso & Estética Dental</td>
                  <td className="py-3.5 px-4 font-mono text-[#787774]">(19) 3294-8800</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#346538] bg-[#EDF3EC] px-2 py-0.5 rounded">
                      (19) 99120-7734
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#787774]">Av. Barão de Itapura, 1500 - Guanabara</td>
                  <td className="py-3.5 px-4 font-mono">4.8 (92 avaliações)</td>
                </tr>
                <tr className="bg-[#FBFBFA]/50">
                  <td className="py-3 px-4 text-[#787774] italic" colSpan={5}>
                    + centenas de empresas com telefones e endereços organizados por busca...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Bento Box: Por que usar o LeadMap */}
      <section id="como-funciona" className="py-16 px-6 max-w-5xl mx-auto border-t border-[#EAEAEA]">
        <div className="mb-10">
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#787774]">
            Metodologia
          </span>
          <h2 className="font-serif text-3xl text-[#111111] mt-2 font-medium">
            Prospecção sem perda de tempo ou atritos operacionais.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-6 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-[6px] bg-[#F7F6F3] flex items-center justify-center text-[#111111] mb-4">
                <LightningBoltIcon className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl text-[#111111] mb-2 font-medium">
                Links Prontos para WhatsApp
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Cada contato celular é convertido em um link clicável direto para o WhatsApp Web ou aplicativo móvel. Basta clicar e iniciar a abordagem.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center justify-between text-[11px] font-mono text-[#787774]">
              <span>Formato</span>
              <span className="text-[#111111]">wa.me/55...</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-6 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-[6px] bg-[#F7F6F3] flex items-center justify-center text-[#111111] mb-4">
                <TableIcon className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl text-[#111111] mb-2 font-medium">
                Planilha Formatada em Excel
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Sem tabelas quebradas ou formatos proprietários. Você baixa um arquivo .xlsx limpo, pronto para abrir no Excel, Google Sheets ou importar em qualquer CRM.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center justify-between text-[11px] font-mono text-[#787774]">
              <span>Compatibilidade</span>
              <span className="text-[#111111]">Excel / Sheets / CRM</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-6 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-[6px] bg-[#F7F6F3] flex items-center justify-center text-[#111111] mb-4">
                <LockClosedIcon className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl text-[#111111] mb-2 font-medium">
                Zero Assinatura Forçada
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                Você só paga quando precisa. Nada de faturas automáticas no cartão de crédito ou cancelamentos burocráticos. Pagou no PIX, a lista é sua para sempre.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex items-center justify-between text-[11px] font-mono text-[#787774]">
              <span>Cobrança</span>
              <span className="text-[#111111]">Avulsa via PIX</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Preço Transparente */}
      <section id="precos" className="py-16 px-6 max-w-5xl mx-auto border-t border-[#EAEAEA]">
        <div className="max-w-xl mx-auto text-center mb-10">
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538]">
            Preço Acessível
          </span>
          <h2 className="font-serif text-3xl text-[#111111] mt-2 font-medium">
            Um valor simbólico que se paga no primeiro cliente fechado.
          </h2>
        </div>

        <div className="max-w-md mx-auto bg-white border border-[#EAEAEA] rounded-[8px] p-8">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-[#787774]">
                Download Avulso
              </span>
              <h3 className="font-serif text-2xl text-[#111111] font-medium">
                Lista Completa de Leads
              </h3>
            </div>
            <div className="text-right">
              <span className="font-serif text-4xl text-[#111111] font-medium">R$ 19,90</span>
              <span className="block text-[11px] text-[#787774] font-mono">pagamento único</span>
            </div>
          </div>

          <p className="text-xs text-[#787774] mb-6 border-b border-[#EAEAEA] pb-4">
            Faça sua busca gratuitamente para ver a amostra. Se gostar dos resultados, pague via PIX para baixar a lista inteira.
          </p>

          <ul className="space-y-2.5 text-xs text-[#111111] mb-8">
            <li className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-[#346538]" />
              <span>Centenas de empresas públicas da cidade selecionada</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-[#346538]" />
              <span>Telefones comerciais e números celulares separados</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-[#346538]" />
              <span>Link de 1 clique para conversa no WhatsApp</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-[#346538]" />
              <span>Endereço completo, nota de avaliação e site</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-[#346538]" />
              <span>Download imediato em arquivo .xlsx para Excel</span>
            </li>
          </ul>

          <Link
            href="/"
            className="w-full bg-[#111111] text-white py-3 rounded-[6px] text-xs font-medium hover:bg-[#2F3437] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Iniciar Busca Gratuita</span>
          </Link>
        </div>
      </section>

      {/* 5. FAQ Estilo Editorial Minimalista */}
      <section className="py-16 px-6 max-w-3xl mx-auto border-t border-[#EAEAEA]">
        <div className="mb-8">
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#787774]">
            Dúvidas Frequentes
          </span>
          <h2 className="font-serif text-2xl text-[#111111] mt-2 font-medium">
            Perguntas comuns sobre a ferramenta.
          </h2>
        </div>

        <div className="divide-y divide-[#EAEAEA]">
          {[
            {
              q: 'De onde vêm os contatos extraídos?',
              a: 'Todos os dados são coletados exclusivamente de informações públicas e comerciais disponibilizadas pelas próprias empresas no Google Maps e registros abertos.',
            },
            {
              q: 'Como funciona a garantia de que os números funcionam?',
              a: 'Você faz a pesquisa gratuitamente e vê os 5 primeiros contatos reais com telefone e WhatsApp antes de pagar qualquer valor. Assim você avalia a qualidade da lista antes de decidir baixar.',
            },
            {
              q: 'Quanto tempo demora para liberar o download após o PIX?',
              a: 'A compensação do PIX com o Mercado Pago leva de 1 a 3 segundos. O sistema atualiza a tela automaticamente e libera o botão de download do Excel.',
            },
            {
              q: 'A lista fica salva caso eu precise baixar de novo?',
              a: 'Sim. Cada busca possui um link exclusivo e permanente. Uma vez paga, você pode acessar a mesma página e baixar o arquivo quantas vezes precisar.',
            },
          ].map((item, idx) => (
            <div key={idx} className="py-4">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between text-left text-sm font-medium text-[#111111] py-1"
              >
                <span>{item.q}</span>
                <span className="text-[#787774] font-mono text-base">
                  {openFaq === idx ? '−' : '+'}
                </span>
              </button>
              {openFaq === idx && (
                <p className="text-xs text-[#787774] mt-2 leading-relaxed pr-6">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
