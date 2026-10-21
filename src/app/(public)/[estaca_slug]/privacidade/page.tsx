import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseStakeRepository } from "@/infrastructure/supabase/supabase-stake-repository";
import { resolveStakeFromSlug } from "@/use-cases/tenant/resolve-stake-from-slug";
import { PublicHeader } from "@/components/ui/public-header";
import { LgpdRequestForm } from "./lgpd-request-form";

interface Props {
  params: Promise<{ estaca_slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { estaca_slug } = await params;
  return {
    title: `Aviso de Privacidade e LGPD — SGCT`,
    description: `Política de privacidade, termos de proteção de dados e canal do titular (LGPD) para caravanas ao Templo.`,
  };
}

export default async function PrivacidadePage({ params }: Props) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();
  const stake = await resolveStakeFromSlug(
    estaca_slug,
    new SupabaseStakeRepository(supabase)
  );

  if (!stake) notFound();

  return (
    <div className="sgct-page">
      <PublicHeader stakeSlug={estaca_slug} stakeName={stake.name} />

      <main id="conteudo-principal" className="py-12 bg-gray-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Cabeçalho */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              {stake.name} — Proteção de Dados
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Aviso de Privacidade e Termos LGPD
            </h1>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              O Sistema de Gestão de Caravanas ao Templo (SGCT) trata os dados pessoais dos membros e participantes com rigor, transparência e respeito à Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
            </p>
          </div>

          {/* Seções Informativas */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-2">1. Finalidade do Tratamento de Dados</h2>
              <p>
                Os dados pessoais solicitados (nome completo, CPF, data de nascimento, telefone, sexo e Ala de vinculação) são tratados exclusivamente para viabilizar:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Reserva e alocação de assentos no ônibus da caravana ao Templo;</li>
                <li>Emissão do manifesto de passageiros exigido pelos órgãos rodoviários fiscalizadores (ANTT/DER);</li>
                <li>Controle financeiro de passagens e prestação de contas com a Ala e a Estaca;</li>
                <li>Validação de check-in de presença no momento do embarque.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-2">2. Tratamento de Dados de Menores (Art. 14 da LGPD)</h2>
              <p>
                Para jovens de 12 a 17 anos que viajam sem a presença física do responsável, o sistema exige termo de autorização assinado e upload no sistema, sujeito à aprovação prévia da liderança da Ala.
              </p>
              <p className="mt-2 bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 font-medium">
                <strong>Política de Retenção Automatizada (Artigo VI):</strong> Os formulários de autorização e comprovantes de menores de idade, bem como os dados de crianças de colo (0 a 5 anos), são eliminados de forma definitiva e automática após <strong>90 dias</strong> da data de conclusão da viagem.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-2">3. Retenção e Inativação de Contas</h2>
              <p>
                Dados financeiros e de histórico de reservas são mantidos conforme prazos regulatórios e fiscais. Contas de membros sem qualquer acesso registrado durante <strong>24 meses</strong> são inativadas automaticamente pelo sistema, preservando-se o histórico sem exclusão arbitrária.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-2">4. Direitos do Titular (Art. 18 da LGPD)</h2>
              <p>
                Você, como titular dos dados (ou responsável legal), possui o direito de solicitar a qualquer momento: confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos ou inexatos, anonimização, bloqueio ou eliminação de dados desnecessários, e revogação do consentimento.
              </p>
              <p className="mt-2">
                <strong>Encarregado de Proteção de Dados (DPO):</strong> Para dúvidas ou requisições formais, você pode contatar o Encarregado através do canal: <span className="font-semibold text-brand-700">dpo@{estaca_slug}.caravanas.org</span> ou preenchendo o formulário abaixo.
              </p>
            </section>
          </div>

          {/* Formulário Interativo do Titular */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Canal de Atendimento ao Titular de Dados
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Preencha o formulário abaixo para registrar uma solicitação formal referente aos seus dados pessoais.
            </p>

            <div className="mt-6">
              <LgpdRequestForm stakeId={stake.id} stakeSlug={estaca_slug} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
