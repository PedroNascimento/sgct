"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

const statuses = [
  { key: "pendente", label: "Falta pagar" },
  { key: "pago_ala", label: "Pago na Ala" },
  { key: "confirmado", label: "Confirmadas" },
  { key: "lista_espera", label: "Lista de espera" },
];

export function ReservationsChart({ reservations }: { reservations: ReadonlyArray<{ status: string }> }) {
  const data = statuses.map(({ key, label }) => ({
    name: label,
    total: reservations.filter(({ status }) => status === key || (key === "lista_espera" && ["waitlist", "aguardando_vaga"].includes(status))).length,
  }));
  const otherCount = reservations.length - data.reduce((sum, item) => sum + item.total, 0);
  if (otherCount > 0) data.push({ name: "Outras situações", total: otherCount });
  return (
    <section className="sgct-card p-5 sm:p-6" aria-label="Distribuição das reservas por status">
      <h3 className="text-xl font-semibold">Panorama das reservas</h3>
      <p className="mt-1 mb-5 text-sm text-[#53575b]">Situação atual da seleção. Pagamento na Ala ainda aguarda validação da Estaca.</p>
      {reservations.length === 0 ? <p className="py-8 text-center text-[#53575b]">Ainda não há reservas para exibir.</p> : (
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]">
          <div className="h-60 min-w-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 8 }} accessibilityLayer={false}>
                <CartesianGrid horizontal={false} stroke="#e0e2e2" strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#53575b", fontSize: 14 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={108} tick={{ fill: "#53575b", fontSize: 14 }} axisLine={false} tickLine={false} />
                <Bar dataKey="total" fill="#006184" radius={[0, 6, 6, 0]} barSize={24} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="divide-y divide-[#e0e2e2]">
            {data.map(({ name, total }) => <div key={name} className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-[#53575b]">{name}</dt><dd className="text-xl font-semibold tabular-nums text-brand-900">{total}</dd></div>)}
          </dl>
        </div>
      )}
    </section>
  );
}
