"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SeatMap } from "./seat-map";
import {
  createReservationAction,
  createGuestReservationAction,
  addManifestEntryAction,
  uploadMinorApprovalFormAction,
} from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";
import { MinorFormUploader } from "./minor-form-uploader";
import type { Profile } from "@/domain/types/tenant";
import type { Caravan, BoardingPoint } from "@/domain/types/caravan";
import {
  PREFERENTIAL_SEAT_NUMBERS,
  isPreferentialSeatNumber,
  type ReservationCategory,
  type ParticipantType,
  type FundingSource,
} from "@/domain/types/reservation";
import { CheckIcon, InfoIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/components/ui/format";

interface Props {
  stakeSlug: string;
  userProfile: Profile;
  caravan: Caravan;
  boardingPoints: BoardingPoint[];
  initialOccupiedSeats: number[];
}

const STEPS = [
  { id: 1, title: "Orientações e Dados" },
  { id: 2, title: "Poltrona" },
  { id: 3, title: "Viagem e Custeio" },
  { id: 4, title: "Logística e Confirmação" },
] as const;

export function ReservationForm({
  stakeSlug,
  userProfile,
  caravan,
  boardingPoints,
  initialOccupiedSeats,
}: Props) {
  const isGuest = userProfile.role === "guest";

  // Verificação de cadastro completo (US-003.5)
  const isProfileIncomplete = !userProfile.cpf || userProfile.cpf.trim() === "";

  // Navegação por etapas (Spec 016 / D35)
  const [step, setStep] = useState<number>(1);

  // Estados do formulário específico da reserva (US-003.6)
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>(initialOccupiedSeats);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [boardingPointId, setBoardingPointId] = useState<string>(
    boardingPoints[0]?.id || ""
  );
  const [category, setCategory] = useState<ReservationCategory>("standard");
  const [participantType, setParticipantType] = useState<ParticipantType>("adulto");
  const [fundingSource, setFundingSource] = useState<FundingSource>(
    isGuest ? "convidado_transferencia_interestaca" : "membro"
  );
  const [originStakeName, setOriginStakeName] = useState<string>(
    userProfile.home_stake_name || ""
  );
  const [originWardName, setOriginWardName] = useState<string>(
    userProfile.home_ward_name || ""
  );
  const [isPreferentialSeating, setIsPreferentialSeating] = useState<boolean>(false);

  // Grupo familiar e Investidura
  const [isFamilyGroup, setIsFamilyGroup] = useState<boolean>(false);
  const [familyGroupLabel, setFamilyGroupLabel] = useState<string>("");
  const [familyGroupSize, setFamilyGroupSize] = useState<string>("");
  const [familyGroupMemberNames, setFamilyGroupMemberNames] = useState<string>("");
  const [hasCompanionForEndowment, setHasCompanionForEndowment] = useState<boolean>(false);
  const [companionForEndowmentName, setCompanionForEndowmentName] = useState<string>("");

  // Manifesto de Criança de Colo (US-003.3)
  const [hasLapChild, setHasLapChild] = useState<boolean>(false);
  const [lapChildName, setLapChildName] = useState<string>("");
  const [lapChildBirthDate, setLapChildBirthDate] = useState<string>("");
  const [lapChildFiliation, setLapChildFiliation] = useState<string>("");

  // Autorização de Menor (Spec 006 / US-006.3)
  const [minorFile, setMinorFile] = useState<File | null>(null);
  const [minorFileError, setMinorFileError] = useState<string | null>(null);
  const [minorUploadStatus, setMinorUploadStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  // Status de envio
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReservationId, setSuccessReservationId] = useState<string | null>(null);

  const allPreferentialSeatsOccupied = PREFERENTIAL_SEAT_NUMBERS.every((seat) =>
    occupiedSeats.includes(seat)
  );

  // Preço calculado dinamicamente
  const currentPrice =
    category === "officiant" ? caravan.price_officiant : caravan.price_standard;

  const handleTogglePreferential = (checked: boolean) => {
    setErrorMessage(null);
    if (checked && allPreferentialSeatsOccupied) return;
    setIsPreferentialSeating(checked);
    if (checked && selectedSeat !== null && !isPreferentialSeatNumber(selectedSeat)) {
      setSelectedSeat(null);
    }
  };

  const handleMinorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinorFileError(null);
    const selected = e.target.files?.[0];
    if (!selected) {
      setMinorFile(null);
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(selected.type)) {
      setMinorFileError("Formato não suportado. Envie um arquivo PDF, JPEG ou PNG.");
      setMinorFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setMinorFileError("O arquivo excede o limite máximo de 10MB.");
      setMinorFile(null);
      return;
    }

    setMinorFile(selected);
  };

  const goToStep = (targetStep: number) => {
    setErrorMessage(null);
    if (targetStep > 2) {
      if (!selectedSeat) {
        setErrorMessage("Por favor, selecione uma poltrona no mapa do ônibus antes de avançar.");
        setStep(2);
        return;
      }
      if (isPreferentialSeating && !isPreferentialSeatNumber(selectedSeat)) {
        setErrorMessage("Assentos preferenciais são exclusivamente as poltronas 01, 02, 03 e 04.");
        setStep(2);
        return;
      }
    }
    if (targetStep > 3 && isGuest && (!originStakeName.trim() || !originWardName.trim())) {
      setErrorMessage("Informe sua Estaca e Ala de origem para prosseguir.");
      setStep(3);
      return;
    }
    setStep(targetStep);
  };

  if (isProfileIncomplete) {
    return (
      <div className="sgct-alert-warning p-5 sm:p-6">
        <div className="flex gap-4">
          <InfoIcon className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Complete seu cadastro</h3>
            <p className="mb-5 mt-2 text-base">
              Para garantir a segurança e o seguro dos passageiros, é obrigatório possuir
              o CPF preenchido em seu cadastro antes de realizar uma reserva.
            </p>
            <Link
              href={`/${stakeSlug}/conta`}
              className="sgct-button inline-flex bg-warning-700 text-white hover:brightness-90"
            >
              Completar meu cadastro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (successReservationId) {
    return (
      <div role="status" className="sgct-panel p-6 text-center sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-700">
          <CheckIcon className="h-9 w-9" />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-[#212225]">
          Sua reserva foi registrada
        </h2>
        <p className="mx-auto mb-6 mt-3 max-w-md text-base leading-relaxed text-[#53575b]">
          O assento <strong className="text-[#212225]">{selectedSeat}</strong> foi reservado para você.
          A confirmação final segue o fluxo de pagamento e validação semanal.
        </p>

        {participantType === "jovem" && (
          <div className="mx-auto mb-6 max-w-lg text-left">
            <MinorFormUploader
              reservationId={successReservationId}
              initialStatus={minorUploadStatus}
            />
          </div>
        )}

        {isGuest ? (
          <div className="sgct-alert-info mx-auto mb-6 max-w-lg text-left">
            <p><strong>Reserva de Convidado Inter-Estaca:</strong> Seu assento está pré-reservado.</p>
            <p className="mt-1">
              O status atual é <em>Aguardando Transferência Inter-Estaca</em>.
              O Administrador da Estaca anfitriã confirmará sua vaga após receber a confirmação do repasse financeiro de sua Estaca ({originStakeName}).
            </p>
          </div>
        ) : (
          <div className="sgct-alert-info mx-auto mb-6 max-w-lg text-left">
            Próximo passo: faça o pagamento pelos canais oficiais da sua Ala e aguarde a validação da Estaca.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href={`/${stakeSlug}/minhas-reservas`}
            className="sgct-button-primary"
          >
            Acompanhar minha reserva
          </Link>
          <Link
            href={`/${stakeSlug}/calendario`}
            className="sgct-button-secondary"
          >
            Ver calendário
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) {
      setErrorMessage("Por favor, selecione um assento no mapa do ônibus.");
      setStep(2);
      return;
    }

    if (isPreferentialSeating && !isPreferentialSeatNumber(selectedSeat)) {
      setErrorMessage("Assentos preferenciais são exclusivamente as poltronas 01, 02, 03 e 04.");
      setStep(2);
      return;
    }

    if (isGuest && (!originStakeName.trim() || !originWardName.trim())) {
      setErrorMessage("Informe sua Estaca e Ala de origem para prosseguir com a reserva de convidado.");
      setStep(3);
      return;
    }

    const parsedFamilySize =
      isFamilyGroup && familyGroupSize.trim()
        ? Number.parseInt(familyGroupSize.trim(), 10)
        : null;

    if (isFamilyGroup && familyGroupSize.trim() && (!Number.isFinite(parsedFamilySize) || (parsedFamilySize ?? 0) < 1)) {
      setErrorMessage("Informe uma quantidade válida de pessoas no grupo familiar (mínimo 1).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const seatAttempted = selectedSeat;

    const result = isGuest
      ? await createGuestReservationAction({
          caravanId: caravan.id,
          seatNumber: seatAttempted,
          originStakeName: originStakeName.trim(),
          originWardName: originWardName.trim(),
          category,
          participantType,
          boardingPointId: boardingPointId || null,
          isPreferentialSeating,
          familyGroupMemberNames: isFamilyGroup ? familyGroupMemberNames : null,
          familyGroupLabel: isFamilyGroup ? (familyGroupLabel.trim() || null) : null,
          familyGroupSize: parsedFamilySize,
          companionForEndowmentName: hasCompanionForEndowment
            ? companionForEndowmentName
            : null,
        })
      : await createReservationAction({
          caravanId: caravan.id,
          seatNumber: seatAttempted,
          boardingPointId: boardingPointId || null,
          category,
          participantType,
          fundingSource,
          isPreferentialSeating,
          familyGroupMemberNames: isFamilyGroup ? familyGroupMemberNames : null,
          familyGroupLabel: isFamilyGroup ? (familyGroupLabel.trim() || null) : null,
          familyGroupSize: parsedFamilySize,
          companionForEndowmentName: hasCompanionForEndowment
            ? companionForEndowmentName
            : null,
        });

    if (!result.success) {
      // Reversão de estado otimista: limpa a seleção e marca o assento como ocupado
      setSelectedSeat(null);
      setOccupiedSeats((prev) =>
        prev.includes(seatAttempted) ? prev : [...prev, seatAttempted]
      );
      setErrorMessage(
        result.error ||
          "Assento já ocupado. Por favor, escolha outro assento."
      );
      setStep(2);
      setIsSubmitting(false);
      return;
    }

    const createdReservation = result.data as { id: string };

    // Se é jovem e selecionou arquivo de autorização, envia o termo (Spec 006 / US-006.3)
    if (participantType === "jovem" && minorFile) {
      const minorFormData = new FormData();
      minorFormData.append("reservationId", createdReservation.id);
      minorFormData.append("file", minorFile);
      const minorUploadResult = await uploadMinorApprovalFormAction(minorFormData);
      if (minorUploadResult.success) {
        setMinorUploadStatus("pending");
      } else {
        setErrorMessage(
          minorUploadResult.error ||
            "A reserva foi criada, mas houve erro ao anexar a autorização. Você poderá reenviá-la em Minhas Reservas."
        );
      }
    }

    // Se informou criança de colo, cadastra no manifesto (US-003.3)
    if (hasLapChild && lapChildName && lapChildBirthDate) {
      const manifestResult = await addManifestEntryAction({
        reservationId: createdReservation.id,
        fullName: lapChildName,
        birthDate: lapChildBirthDate,
        filiation: lapChildFiliation || userProfile.full_name,
      });
      if (!manifestResult.success) {
        setErrorMessage(
          manifestResult.error ||
            "A reserva foi criada, mas não foi possível adicionar a criança ao manifesto."
        );
        setIsSubmitting(false);
        return;
      }
    }

    setSuccessReservationId(createdReservation.id);
    setIsSubmitting(false);
  };

  const altDocText =
    userProfile.document_type || userProfile.document_number
      ? `${userProfile.document_type ?? "Documento"} ${userProfile.document_number ?? ""}${
          userProfile.document_issuer ? ` (${userProfile.document_issuer})` : ""
        }`.trim()
      : "Não informado";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
      {/* Barra de Progresso das Etapas */}
      <nav aria-label="Etapas da reserva" className="rounded-2xl border border-[#e0e2e2] bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-700">
          <span>Etapa {step} de {STEPS.length}</span>
          <span>{STEPS[step - 1]?.title}</span>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                    isActive
                      ? "border-brand-700 bg-brand-50 text-brand-900"
                      : isCompleted
                      ? "border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-50"
                      : "border-[#e0e2e2] bg-[#fafafa] text-[#53575b] hover:bg-[#f0f2f2]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      isActive
                        ? "bg-brand-700 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-[#d0d3d3] text-[#212225]"
                    }`}
                  >
                    {s.id}
                  </span>
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {errorMessage && (
        <div role="alert" className="sgct-alert-danger">
          {errorMessage}
        </div>
      )}

      {/* ETAPA 1: Orientações Prévias e Dados Pessoais */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <InfoIcon className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" />
              <div>
                <h2 className="text-lg font-bold text-[#212225]">
                  Antes de preencher sua reserva
                </h2>
                <p className="mt-1 text-sm text-[#53575b]">
                  Caravana de <strong>{caravan.seat_limit} lugares</strong>. Sua inscrição passará por validação de pagamento pela liderança da Ala e da Estaca.
                </p>
              </div>
            </div>

            <ol className="space-y-2.5 text-sm text-[#212225] pl-1">
              <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-brand-100 bg-white p-3.5">
                <span>
                  <strong>1. Agende</strong> as ordenanças no Templo antes da viagem
                </span>
                <a
                  href="https://www.churchofjesuschrist.org/temples/schedule/appointment?lang=por"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline hover:text-brand-900 shrink-0"
                >
                  Agendar ordenanças ↗
                </a>
              </li>
              <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-brand-100 bg-white p-3.5">
                <span>
                  <strong>2. Realize o pagamento</strong> da caravana (ou tenha <strong>auxílio aprovado pelo Bispo</strong>)
                </span>
                <a
                  href="https://www.churchofjesuschrist.org/donations?lang=por"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 underline hover:text-brand-900 shrink-0"
                >
                  Portal de Doações ↗
                </a>
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-[#e0e2e2] bg-white p-5 shadow-card">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-[#212225]">
                Seus dados pessoais
              </h2>
              <Link href={`/${stakeSlug}/conta`} className="text-sm font-semibold text-brand-700 underline">
                Editar em Minha Conta
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span className="block text-[#53575b]">Nome completo</span>
                <span className="font-semibold text-[#212225]">{userProfile.full_name}</span>
              </div>
              <div>
                <span className="block text-[#53575b]">CPF</span>
                <span className="font-semibold text-[#212225]">{userProfile.cpf}</span>
              </div>
              <div>
                <span className="block text-[#53575b]">Documento alternativo / Órgão</span>
                <span className="font-semibold text-[#212225]">{altDocText}</span>
              </div>
              <div>
                <span className="block text-[#53575b]">Telefone</span>
                <span className="font-semibold text-[#212225]">
                  {userProfile.phone || "Não informado"}
                </span>
              </div>
              <div>
                <span className="block text-[#53575b]">Sexo</span>
                <span className="font-semibold capitalize text-[#212225]">
                  {userProfile.sexo || "Não informado"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="sgct-button-primary w-full sm:w-auto"
            >
              Próxima etapa: Escolher Poltrona →
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Escolha de Poltrona & Preferencial */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="sgct-card space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-[#212225]">Escolha sua poltrona</h2>
                <p className="text-sm text-[#53575b]">
                  Qualquer mudança necessária, os responsáveis pela Caravana entrarão em contato.
                </p>
              </div>
              {selectedSeat && (
                <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700" aria-live="polite">
                  Poltrona {selectedSeat} selecionada
                </span>
              )}
            </div>

            {/* Opção Preferencial (Poltronas 01 a 04) */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
              <label
                className={`flex min-h-11 items-center gap-3 text-sm font-semibold ${
                  allPreferentialSeatsOccupied
                    ? "cursor-not-allowed text-[#707478]"
                    : "cursor-pointer text-[#212225]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isPreferentialSeating}
                  disabled={allPreferentialSeatsOccupied}
                  onChange={(e) => handleTogglePreferential(e.target.checked)}
                  className="h-5 w-5 shrink-0 rounded border-[#bdc0c0] text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                />
                <span>
                  Necessito de assento preferencial (exclusivo para poltronas 01, 02, 03 e 04)
                </span>
              </label>

              {allPreferentialSeatsOccupied ? (
                <p className="text-xs font-medium text-amber-900">
                  Todas as 4 poltronas preferenciais (01 a 04) já estão reservadas nesta caravana. Selecione uma das demais poltronas disponíveis abaixo.
                </p>
              ) : isPreferentialSeating ? (
                <p className="text-xs font-medium text-amber-900">
                  Seleção preferencial ativada: escolha apenas entre as poltronas 01, 02, 03 ou 04 que estão livres.
                </p>
              ) : null}
            </div>

            <SeatMap
              totalSeats={50}
              occupiedSeats={occupiedSeats}
              selectedSeat={selectedSeat}
              preferentialOnly={isPreferentialSeating}
              onSelectSeat={(seatNum) => {
                setErrorMessage(null);
                setSelectedSeat(seatNum);
              }}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="sgct-button-secondary w-full sm:w-auto"
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={() => goToStep(3)}
              className="sgct-button-primary w-full sm:w-auto"
            >
              Próxima etapa: Viagem e Custeio →
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Detalhes da Viagem e Forma de Custeio */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="sgct-card space-y-6 p-5 sm:p-6">
            <h2 className="border-b border-[#e0e2e2] pb-4 text-xl font-bold text-[#212225]">
              Detalhes da viagem e custeio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Ponto de Embarque */}
              <div>
                <label htmlFor="boardingPoint" className="sgct-label">
                  Ponto de Embarque
                </label>
                <select
                  value={boardingPointId}
                  id="boardingPoint"
                  onChange={(e) => setBoardingPointId(e.target.value)}
                  className="sgct-input"
                >
                  {boardingPoints.map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name} ({bp.boarding_time.includes("T") ? bp.boarding_time.split("T")[1]?.slice(0, 5) + "h" : bp.boarding_time})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria (D12: Autodeclarada) */}
              <div>
                <label htmlFor="category" className="sgct-label">
                  Categoria de Passageiro
                </label>
                <select
                  value={category}
                  id="category"
                  onChange={(e) => setCategory(e.target.value as ReservationCategory)}
                  className="sgct-input font-semibold"
                >
                  <option value="standard">Padrão — R$ {caravan.price_standard.toFixed(2)}</option>
                  <option value="officiant">
                    Oficiante do Templo — R$ {caravan.price_officiant.toFixed(2)}
                  </option>
                </select>
                <p className="mt-1.5 text-sm leading-snug text-[#53575b]">
                  {category === "officiant"
                    ? "Categoria autodeclarada para oficiantes com designação ativa no Templo."
                    : "Tarifa regular para membros e participantes."}
                </p>
              </div>

              {/* Tipo de Participante (D29: Metadado de Logística) */}
              <div>
                <label htmlFor="participantType" className="sgct-label">
                  Tipo de Participação
                </label>
                <select
                  value={participantType}
                  id="participantType"
                  onChange={(e) => setParticipantType(e.target.value as ParticipantType)}
                  className="sgct-input"
                >
                  <option value="adulto">Adulto</option>
                  <option value="jovem">Jovem</option>
                  <option value="crianca">Criança (com assento individual)</option>
                  <option value="oficiante">Oficiante</option>
                  <option value="investidura">Investidura Própria</option>
                  <option value="selamento">Selamento</option>
                  <option value="missionario_servico">Missionário de Serviço</option>
                </select>
              </div>

              {/* Fonte de Custeio (D30 / Spec 013) */}
              <div>
                <label htmlFor="fundingSource" className="sgct-label">
                  Forma de Custeio
                </label>
                {isGuest ? (
                  <>
                    <input
                      id="fundingSource"
                      type="text"
                      readOnly
                      disabled
                      value="Convidado (Transferência Inter-Estaca)"
                      className="sgct-input bg-gray-50 text-gray-700 font-medium cursor-not-allowed"
                    />
                    <p className="mt-2 text-sm font-semibold leading-snug text-brand-700">
                      O valor de R$ {currentPrice.toFixed(2)} será repassado pela sua Estaca de origem para a Estaca anfitriã.
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      value={fundingSource}
                      id="fundingSource"
                      onChange={(e) => setFundingSource(e.target.value as FundingSource)}
                      className="sgct-input"
                    >
                      <option value="membro">Pagamento Próprio (Membro)</option>
                      <option value="auxilio_area_investidura">Auxílio Área (Primeira Investidura)</option>
                      <option value="auxilio_recem_converso">Auxílio Recém-Converso</option>
                      <option value="auxilio_estaca_fundo_reserva">Auxílio Fundo de Reserva da Estaca</option>
                    </select>
                    {fundingSource !== "membro" && (
                      <p className="mt-2 text-sm font-semibold leading-snug text-warning-700">
                        Reserva sujeita à validação da fonte de auxílio junto à liderança da Ala/Estaca.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bloco de Origem do Convidado (Spec 013 / US-013.1) */}
            {isGuest && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" />
                  <div>
                    <h3 className="text-base font-bold text-[#212225]">
                      Dados de Origem do Convidado Inter-Estaca
                    </h3>
                    <p className="mt-1 text-sm text-[#53575b]">
                      Confirme a Estaca e Ala às quais você pertence para que a liderança anfitriã possa identificar o repasse.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label htmlFor="originStakeName" className="sgct-label">
                      Estaca de Origem <span className="text-danger-600">*</span>
                    </label>
                    <input
                      id="originStakeName"
                      type="text"
                      required
                      value={originStakeName}
                      onChange={(e) => setOriginStakeName(e.target.value)}
                      placeholder="Ex: Estaca Mossoró Brasil"
                      className="sgct-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="originWardName" className="sgct-label">
                      Ala de Origem <span className="text-danger-600">*</span>
                    </label>
                    <input
                      id="originWardName"
                      type="text"
                      required
                      value={originWardName}
                      onChange={(e) => setOriginWardName(e.target.value)}
                      placeholder="Ex: Ala Abolição"
                      className="sgct-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bloco de Autorização de Menor (Spec 006 / US-006.3) */}
            {participantType === "jovem" && (
              <div className="rounded-xl border border-warning-200 bg-warning-50 p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <InfoIcon className="mt-0.5 h-6 w-6 shrink-0 text-warning-700" />
                  <div>
                    <h3 className="text-base font-bold text-[#212225]">
                      Autorização de Menor de Idade (12 a 17 anos)
                    </h3>
                    <p className="mt-1 text-sm text-[#53575b]">
                      Jovens viajando sem responsável legal na caravana devem apresentar o termo de autorização assinado pelos pais para validação pela liderança da Ala.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <label htmlFor="minorFormFile" className="sgct-label">
                    Anexar Termo de Autorização Assinado
                  </label>
                  <input
                    id="minorFormFile"
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    onChange={handleMinorFileChange}
                    className="sgct-input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                  />
                  {minorFileError && (
                    <p role="alert" className="text-sm font-semibold text-danger-700">{minorFileError}</p>
                  )}
                  {minorFile && (
                    <p className="text-sm text-success-700 font-medium">
                      Arquivo selecionado: {minorFile.name} ({(minorFile.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                  <p className="text-xs text-[#53575b]">
                    Formatos aceitos: PDF, JPEG ou PNG (máx. 10MB). Caso não consiga anexar agora, você poderá enviá-lo depois na tela &quot;Minhas Reservas&quot;.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="sgct-button-secondary w-full sm:w-auto"
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={() => goToStep(4)}
              className="sgct-button-primary w-full sm:w-auto"
            >
              Próxima etapa: Logística e Confirmação →
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Grupo Familiar, Acompanhante, Criança de Colo e Confirmação */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="sgct-card space-y-5 p-5 sm:p-6">
            <h2 className="border-b border-[#e0e2e2] pb-4 text-xl font-bold text-[#212225]">
              Informações complementares de logística
            </h2>

            {/* Grupo Familiar */}
            <div>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold text-[#212225]">
                <input
                  type="checkbox"
                  checked={isFamilyGroup}
                  onChange={(e) => setIsFamilyGroup(e.target.checked)}
                  className="h-5 w-5 shrink-0 rounded border-[#bdc0c0] text-brand-600 focus:ring-brand-500"
                />
                <span>Estou viajando com grupo familiar (para alojamento conjunto)</span>
              </label>
              {isFamilyGroup && (
                <div className="mt-3 space-y-3 rounded-xl border border-[#e0e2e2] bg-[#f8f9fa] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="familyGroupLabel" className="sgct-label">
                        Nome do grupo familiar
                      </label>
                      <input
                        id="familyGroupLabel"
                        type="text"
                        value={familyGroupLabel}
                        onChange={(e) => setFamilyGroupLabel(e.target.value)}
                        placeholder="Ex: Família Silva"
                        maxLength={80}
                        className="sgct-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="familyGroupSize" className="sgct-label">
                        Quantas pessoas irão com você?
                      </label>
                      <input
                        id="familyGroupSize"
                        type="number"
                        min={1}
                        max={50}
                        value={familyGroupSize}
                        onChange={(e) => setFamilyGroupSize(e.target.value)}
                        placeholder="Ex: 3"
                        className="sgct-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="familyGroupMemberNames" className="sgct-label">
                      Primeiro nome e sobrenome dos familiares
                    </label>
                    <input
                      id="familyGroupMemberNames"
                      type="text"
                      value={familyGroupMemberNames}
                      onChange={(e) => setFamilyGroupMemberNames(e.target.value)}
                      placeholder="Ex: Maria Silva, João Silva e Clara Silva"
                      className="sgct-input"
                    />
                    <span className="mt-1.5 block text-xs text-[#53575b]">
                      Apenas informativo. NÃO garante que o grupo familiar permanecerá no mesmo quarto no alojamento.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Acompanhante em Investidura */}
            <div className="border-t border-[#e0e2e2] pt-3">
              <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold text-[#212225]">
                <input
                  type="checkbox"
                  checked={hasCompanionForEndowment}
                  onChange={(e) => setHasCompanionForEndowment(e.target.checked)}
                  className="h-5 w-5 shrink-0 rounded border-[#bdc0c0] text-brand-600 focus:ring-brand-500"
                />
                <span>Estou acompanhando alguém em sua própria investidura</span>
              </label>
              {hasCompanionForEndowment && (
                <div className="mt-2.5">
                  <label htmlFor="companionForEndowmentName" className="sgct-label">
                    Nome completo da pessoa acompanhada
                  </label>
                  <input
                    id="companionForEndowmentName"
                    type="text"
                    value={companionForEndowmentName}
                    onChange={(e) => setCompanionForEndowmentName(e.target.value)}
                    placeholder="Nome da pessoa que fará a investidura"
                    className="sgct-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Manifesto de Criança de Colo */}
          <div className="space-y-4 rounded-xl border border-success-200 bg-success-50 p-5 sm:p-6">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-bold text-success-700">
              <input
                type="checkbox"
                checked={hasLapChild}
                onChange={(e) => setHasLapChild(e.target.checked)}
                className="h-5 w-5 shrink-0 rounded border-success-200 text-success-700 focus:ring-success-700"
              />
              <span>Vou levar criança de colo (0 a 5 anos — sem assento individual, gratuito)</span>
            </label>

            {hasLapChild && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="sgct-label">
                    Nome Completo da Criança
                  </label>
                  <input
                    type="text"
                    value={lapChildName}
                    onChange={(e) => setLapChildName(e.target.value)}
                    placeholder="Nome da criança"
                    className="sgct-input"
                    required={hasLapChild}
                  />
                </div>
                <div>
                  <label className="sgct-label">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={lapChildBirthDate}
                    onChange={(e) => setLapChildBirthDate(e.target.value)}
                    className="sgct-input"
                    required={hasLapChild}
                  />
                </div>
                <div>
                  <label className="sgct-label">
                    Filiação / Responsáveis
                  </label>
                  <input
                    type="text"
                    value={lapChildFiliation}
                    onChange={(e) => setLapChildFiliation(e.target.value)}
                    placeholder="Ex: Pai e Mãe"
                    className="sgct-input"
                    required={hasLapChild}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resumo Financeiro e Botão de Confirmação */}
          <div className="sticky bottom-0 z-20 -mx-4 flex flex-col items-stretch justify-between gap-5 border-t border-brand-700 bg-brand-900 p-5 text-white shadow-elevated sm:static sm:mx-0 sm:flex-row sm:items-center sm:rounded-2xl sm:border">
            <div aria-live="polite">
              <span className="block text-sm font-semibold text-brand-100">
                Contribuição da viagem
              </span>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(currentPrice)}{" "}
                <span className="text-sm font-normal text-brand-100">
                  ({category === "officiant" ? "Oficiante" : "Padrão"})
                </span>
              </div>
              <span className="mt-1 block text-sm text-brand-100">
                {selectedSeat
                  ? `Poltrona ${selectedSeat} selecionada${isPreferentialSeating ? " (Preferencial)" : ""}.`
                  : "Nenhum assento selecionado ainda."}
              </span>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => goToStep(3)}
                disabled={isSubmitting}
                className="sgct-button border border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={!selectedSeat || isSubmitting}
                className={`sgct-button w-full sm:w-auto ${
                  !selectedSeat || isSubmitting
                    ? "bg-white/10 text-brand-200"
                    : "cursor-pointer bg-white text-brand-900 hover:bg-brand-50"
                }`}
              >
                {isSubmitting ? "Gravando Reserva..." : "Confirmar Minha Reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
