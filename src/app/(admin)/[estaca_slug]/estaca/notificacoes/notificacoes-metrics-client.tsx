"use client";

import type { NotificationMetric } from "@/domain/types/notification";

interface Props {
  metrics: NotificationMetric[];
  estacaSlug: string;
}

export function NotificacoesMetricsClient({ metrics, estacaSlug }: Props) {
  const totalSent = metrics.reduce((acc, m) => acc + m.sentCount, 0);
  const totalFailed = metrics.reduce((acc, m) => acc + m.failedCount, 0);
  const totalPending = metrics.reduce((acc, m) => acc + m.pendingCount, 0);

  // Free Tier: Resend oferece ~100 e-mails/dia (3.000/mês)
  const todayDate = new Date().toISOString().split("T")[0];
  const todayMetric = metrics.find((m) => m.sendDate === todayDate);
  const sentToday = todayMetric?.sentCount ?? 0;
  const freeTierDailyLimit = 100;
  const isNearLimit = sentToday >= freeTierDailyLimit * 0.8;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border border-gray-100">
          <dt className="truncate text-sm font-medium text-gray-500">Total Enviados</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">
            {totalSent}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border border-gray-100">
          <dt className="truncate text-sm font-medium text-gray-500">Envios Hoje</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-blue-600">
            {sentToday} <span className="text-sm font-normal text-gray-400">/ {freeTierDailyLimit}</span>
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border border-gray-100">
          <dt className="truncate text-sm font-medium text-gray-500">Falhas em Retry</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-rose-600">
            {totalFailed}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border border-gray-100">
          <dt className="truncate text-sm font-medium text-gray-500">Pendentes na Fila</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-amber-600">
            {totalPending}
          </dd>
        </div>
      </div>

      {/* Alerta de Cota do Free Tier */}
      {isNearLimit && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Atenção ao limite da cota gratuita diária
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  O volume de envios de hoje ({sentToday}) atingiu mais de 80% do volume diário recomendado do plano gratuito do Resend (100 e-mails/dia). Notificações excedentes serão enfileiradas automaticamente para proteger o serviço.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Histórico Diário */}
      <div className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">Histórico de Volume Diário</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Detalhamento dos envios transacionais realizados nos últimos 30 dias.
            </p>
          </div>
        </div>

        {metrics.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nenhuma notificação registrada para esta Estaca até o momento.
          </div>
        ) : (
          <div>
            {/* Visualização em Cartões no Mobile (Artigo X / M04 / T014.15) */}
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {metrics.map((row) => {
                const successRate = row.totalCount > 0
                  ? Math.round((row.sentCount / row.totalCount) * 100)
                  : 100;

                return (
                  <div
                    key={row.sendDate}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">
                        {row.sendDate}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        successRate >= 95 ? "bg-emerald-100 text-emerald-800" :
                        successRate >= 80 ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {successRate}% sucesso
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-500 block">Total</span>
                        <span className="font-bold text-gray-900 text-sm">{row.totalCount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block">Enviados</span>
                        <span className="font-bold text-emerald-600 text-sm">{row.sentCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Falhas</span>
                        <span className="font-medium text-rose-600">{row.failedCount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block">Pendentes</span>
                        <span className="font-medium text-amber-600">{row.pendingCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visualização em Tabela no Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900">Data</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900">Total Enfileirado</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-emerald-700">Enviados com Sucesso</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-rose-700">Falhas</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-amber-700">Pendentes</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-gray-900">Taxa de Sucesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {metrics.map((row) => {
                    const successRate = row.totalCount > 0
                      ? Math.round((row.sentCount / row.totalCount) * 100)
                      : 100;

                    return (
                      <tr key={row.sendDate} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                          {row.sendDate}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                          {row.totalCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-emerald-600">
                          {row.sentCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-rose-600 font-medium">
                          {row.failedCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-amber-600 font-medium">
                          {row.pendingCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-700">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            successRate >= 95 ? "bg-emerald-100 text-emerald-800" :
                            successRate >= 80 ? "bg-amber-100 text-amber-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {successRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
