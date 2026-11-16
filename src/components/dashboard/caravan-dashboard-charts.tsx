"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/components/ui/format";
import { CHART_COLORS, type RevenueBar, type StatusSlice, type TimelinePoint, type WardBar } from "./chart-data";

export { CHART_COLORS } from "./chart-data";
export type { StatusSlice, WardBar, TimelinePoint, RevenueBar } from "./chart-data";

function ChartCard({
  title,
  description,
  badge,
  children,
  footer,
  className = "",
}: {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`sgct-card min-w-0 p-5 sm:p-6 flex flex-col justify-between h-full ${className}`}
      aria-label={title}
    >
      <div className="flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#212225] truncate">{title}</h3>
            <p className="mt-0.5 text-xs text-[#707478]">{description}</p>
          </div>
          {badge}
        </div>
        <div className="flex-1 flex flex-col justify-center min-h-[240px]">
          {children}
        </div>
      </div>
      {footer && (
        <div className="mt-4 pt-3.5 border-t border-[#f0f2f2]">
          {footer}
        </div>
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl bg-[#f7f8f8] px-6 text-center text-sm text-[#707478]">
      {text}
    </div>
  );
}

const axisTick = { fill: CHART_COLORS.text, fontSize: 12 };

/* 1. Ocupação de assentos (gauge radial) */
export function OccupancyChart({
  occupied,
  seatLimit,
  minQuorum,
}: {
  occupied: number;
  seatLimit: number;
  minQuorum: number;
}) {
  const pct = seatLimit > 0 ? Math.min(100, Math.round((occupied / seatLimit) * 100)) : 0;
  const quorumReached = occupied >= minQuorum;

  return (
    <ChartCard
      title="Ocupação dos assentos"
      description="Assentos reservados em relação ao limite do ônibus."
      footer={
        <div
          className={`rounded-lg px-3.5 py-2 text-center text-xs font-semibold ${
            quorumReached ? "bg-success-50 text-success-700 border border-success-200/50" : "bg-warning-50 text-warning-700 border border-warning-200/50"
          }`}
        >
          {quorumReached
            ? `✓ Quórum mínimo atingido (${occupied}/${minQuorum} passageiros)`
            : `Faltam ${minQuorum - occupied} reserva(s) para o quórum mínimo (${minQuorum})`}
        </div>
      }
    >
      <div className="relative h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ name: "Ocupação", value: pct, fill: quorumReached ? CHART_COLORS.success : CHART_COLORS.brand }]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: "#eef0f0" }} cornerRadius={10} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black tabular-nums text-[#212225]">{pct}%</span>
          <span className="text-xs text-[#707478]">
            {occupied} de {seatLimit} assentos
          </span>
        </div>
      </div>
    </ChartCard>
  );
}

/* 2. Situação das reservas (donut) */
export function StatusDonutChart({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const visible = data.filter((d) => d.value > 0);

  return (
    <ChartCard
      title="Situação das reservas"
      description="Distribuição por etapa do fluxo de pagamento e validação."
      footer={
        <div className="rounded-lg bg-[#f7f8f8] px-3.5 py-2 text-center text-xs text-[#53575b] font-medium border border-[#e0e2e2]/60">
          {total === 0 ? "Nenhuma reserva iniciada nesta caravana" : `Total registrado: ${total} reserva(s)`}
        </div>
      }
    >
      {total === 0 ? (
        <Empty text="Ainda não há reservas para exibir." />
      ) : (
        <div className="h-56 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart accessibilityLayer={false}>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="85%"
                paddingAngle={2}
                isAnimationActive={false}
              >
                {visible.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [`${v ?? 0} reserva(s)`, n ?? ""]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* 3. Inscritos por Ala (barras empilhadas) */
export function WardBarChart({ data }: { data: WardBar[] }) {
  const totalInscritos = data.reduce(
    (sum, w) => sum + w.confirmados + w.pagoAla + w.pendentes + w.espera,
    0
  );

  return (
    <ChartCard
      title="Inscritos por Ala"
      description="Quantidade de passageiros de cada Ala, por situação."
      footer={
        <div className="rounded-lg bg-[#f7f8f8] px-3.5 py-2 text-center text-xs text-[#53575b] font-medium border border-[#e0e2e2]/60">
          {data.length === 0 ? "Nenhuma Ala participante registrada" : `${data.length} Ala(s) · ${totalInscritos} inscrito(s)`}
        </div>
      }
    >
      {data.length === 0 ? (
        <Empty text="Nenhuma Ala com inscritos nesta caravana." />
      ) : (
        <div className="h-56 min-w-0 overflow-y-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} accessibilityLayer={false}>
              <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="ward" width={110} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f4f6f6" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="confirmados" name="Confirmados" stackId="a" fill={CHART_COLORS.success} isAnimationActive={false} />
              <Bar dataKey="pagoAla" name="Pago na Ala" stackId="a" fill={CHART_COLORS.brand} isAnimationActive={false} />
              <Bar dataKey="pendentes" name="Falta pagar" stackId="a" fill={CHART_COLORS.warning} isAnimationActive={false} />
              <Bar dataKey="espera" name="Lista de espera" stackId="a" fill={CHART_COLORS.waitlist} radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* 4. Arrecadação (barras) */
export function RevenueChart({ data }: { data: RevenueBar[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);

  return (
    <ChartCard
      title="Arrecadação Financeira"
      description="Valores por situação do pagamento da viagem."
      footer={
        <div className="rounded-lg bg-[#f7f8f8] px-3.5 py-2 text-center text-xs text-[#53575b] font-medium border border-[#e0e2e2]/60">
          Total estimado da viagem: <strong className="text-[#212225]">{formatCurrency(total)}</strong>
        </div>
      }
    >
      {total === 0 ? (
        <Empty text="Sem valores a exibir ainda." />
      ) : (
        <div className="h-56 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} margin={{ left: -4, right: 8, top: 8, bottom: 0 }} accessibilityLayer={false}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
              <Tooltip cursor={{ fill: "#f4f6f6" }} formatter={(v: any) => formatCurrency(Number(v) || 0)} />
              <Bar dataKey="valor" name="Valor" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* 5. Evolução das inscrições (área - largura total) */
export function TimelineChart({ data }: { data: TimelinePoint[] }) {
  const total = data.length > 0 ? data[data.length - 1].acumulado : 0;

  return (
    <ChartCard
      title="Evolução das inscrições"
      description="Histórico de reservas acumuladas ao longo dos dias."
      footer={
        <div className="rounded-lg bg-[#f7f8f8] px-3.5 py-2 text-center text-xs text-[#53575b] font-medium border border-[#e0e2e2]/60">
          {total === 0 ? "Aguardando primeiras reservas para desenhar a curva de inscrições" : `Total acumulado até o momento: ${total} reserva(s)`}
        </div>
      }
    >
      {data.length === 0 ? (
        <Empty text="As inscrições aparecerão aqui conforme forem realizadas." />
      ) : (
        <div className="h-56 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ left: -12, right: 12, top: 8, bottom: 0 }} accessibilityLayer={false}>
              <defs>
                <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any, n: any) => [v ?? 0, n === "acumulado" ? "Total acumulado" : "No dia"]}
              />
              <Area
                type="monotone"
                dataKey="acumulado"
                stroke={CHART_COLORS.brand}
                strokeWidth={2.5}
                fill="url(#timelineFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
