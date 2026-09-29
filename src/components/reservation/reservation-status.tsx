import type { ReservationStatus } from "@/domain/types/reservation";
import { CheckIcon, ClockIcon, InfoIcon } from "@/components/ui/icons";

const STATUS_CONTENT: Record<
  ReservationStatus,
  { label: string; description: string; tone: "success" | "warning" | "info" | "neutral" | "danger" }
> = {
  pendente: {
    label: "Aguardando pagamento na Ala",
    description: "Seu assento está reservado. Após o pagamento pelos canais oficiais, a liderança da Ala reconhecerá o valor.",
    tone: "warning",
  },
  pago_ala: {
    label: "Pagamento reconhecido pela Ala",
    description: "A Ala registrou seu pagamento. A reserva aguarda a validação da transferência pela Estaca.",
    tone: "info",
  },
  confirmado: {
    label: "Reserva confirmada pela Estaca",
    description: "O pagamento foi validado pela Estaca e sua participação está confirmada.",
    tone: "success",
  },
  aguardando_auxilio: {
    label: "Aguardando aprovação do auxílio",
    description: "A solicitação de auxílio ainda está em análise. A reserva permanece aguardando essa aprovação.",
    tone: "warning",
  },
  aguardando_transferencia_interestaca: {
    label: "Aguardando transferência entre Estacas",
    description: "A reserva de convidado aguarda a conclusão do repasse até a Estaca anfitriã.",
    tone: "warning",
  },
  lista_espera: {
    label: "Na lista de espera",
    description: "Sua reserva está na lista de espera. A posição pode mudar conforme o processamento das vagas.",
    tone: "info",
  },
  presente: {
    label: "Embarque registrado",
    description: "Sua presença nesta caravana foi registrada.",
    tone: "success",
  },
  no_show: {
    label: "Ausência registrada",
    description: "A reserva foi marcada como ausência no embarque.",
    tone: "neutral",
  },
  cancelada_com_credito: {
    label: "Cancelada com crédito",
    description: "A reserva foi cancelada e gerou crédito conforme o fluxo aplicável.",
    tone: "neutral",
  },
  cancelada_sem_credito: {
    label: "Cancelada sem crédito",
    description: "A reserva foi encerrada sem geração de crédito.",
    tone: "neutral",
  },
  expirada: {
    label: "Reserva expirada",
    description: "O prazo para validação do pagamento terminou e esta reserva expirou.",
    tone: "danger",
  },
};

const TONE_CLASSES = {
  success: "border-success-200 bg-success-50 text-success-700",
  warning: "border-warning-200 bg-warning-50 text-warning-700",
  info: "border-brand-200 bg-brand-50 text-brand-800",
  neutral: "border-[#d0d3d3] bg-[#f7f8f8] text-[#3a3d40]",
  danger: "border-danger-200 bg-danger-50 text-danger-700",
} as const;

function paymentStep(status: ReservationStatus): number | null {
  if (status === "pendente") return 1;
  if (status === "pago_ala") return 2;
  if (status === "confirmado" || status === "presente" || status === "no_show") return 3;
  return null;
}

export function ReservationStatusPanel({ status }: { status: ReservationStatus }) {
  const content = STATUS_CONTENT[status];
  const currentStep = paymentStep(status);

  return (
    <section aria-label="Situação da reserva">
      <div className={`rounded-xl border p-4 ${TONE_CLASSES[content.tone]}`}>
        <div className="flex items-start gap-3">
          {content.tone === "success" ? (
            <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
          ) : content.tone === "warning" ? (
            <ClockIcon className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div>
            <h3 className="font-bold">{content.label}</h3>
            <p className="mt-1 text-sm leading-relaxed">{content.description}</p>
          </div>
        </div>
      </div>

      {currentStep && (
        <ol className="mt-5 grid gap-2 sm:grid-cols-3" aria-label="Progresso da confirmação">
          {["Reserva realizada", "Pagamento reconhecido pela Ala", "Confirmada pela Estaca"].map(
            (label, index) => {
              const step = index + 1;
              const complete = step <= currentStep;
              const current = step === currentStep;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold ${
                    complete
                      ? "border-brand-200 bg-brand-50 text-brand-800"
                      : "border-[#e0e2e2] bg-white text-[#676b6e]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      complete ? "bg-brand-700 text-white" : "bg-[#e8e9e9] text-[#53575b]"
                    }`}
                  >
                    {step < currentStep ? <CheckIcon className="h-4 w-4" /> : step}
                  </span>
                  <span>{label}</span>
                </li>
              );
            }
          )}
        </ol>
      )}
    </section>
  );
}
