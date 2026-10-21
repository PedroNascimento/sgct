import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/infrastructure/supabase/server";
import { SupabaseNotificationQueueRepository } from "@/infrastructure/supabase/supabase-notification-queue-repository";
import { NotificacoesMetricsClient } from "./notificacoes-metrics-client";

interface Props {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminEstacaNotificacoesPage({ params }: Props) {
  const { estaca_slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/${estaca_slug}/auth/login`);
  }

  const user = userData.user;
  const role = user.app_metadata?.role;
  const stakeId = user.app_metadata?.stake_id;

  if (role !== "admin_estaca") {
    redirect(`/${estaca_slug}`);
  }

  // Busca métricas via repositório seguro com service_role (Artigo V)
  const serviceClient = createSupabaseServiceClient();
  const queueRepo = new SupabaseNotificationQueueRepository(serviceClient);

  const metrics = await queueRepo.getDailyMetrics(stakeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas de Envio de E-mails</h1>
        <p className="mt-1 text-sm text-gray-500">
          Acompanhamento do volume diário de notificações transacionais e respeito à cota do plano gratuito (Resend).
        </p>
      </div>

      <NotificacoesMetricsClient metrics={metrics} estacaSlug={estaca_slug} />
    </div>
  );
}
