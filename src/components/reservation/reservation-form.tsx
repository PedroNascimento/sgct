"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SeatMap } from "./seat-map";
import {
  createReservationAction,
  addManifestEntryAction,
} from "@/app/(public)/[estaca_slug]/caravanas/[caravan_id]/reservar/actions";
import type { Profile } from "@/domain/types/tenant";
import type { Caravan, BoardingPoint } from "@/domain/types/caravan";
import type {
  ReservationCategory,
  ParticipantType,
  FundingSource,
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

export function ReservationForm({
  stakeSlug,
  userProfile,
  caravan,
  boardingPoints,
  initialOccupiedSeats,
}: Props) {
  // Verificação de cadastro completo (US-003.5)
  const isProfileIncomplete = !userProfile.cpf || userProfile.cpf.trim() === "";

  // Estados do formulário específico da reserva (US-003.6)
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>(initialOccupiedSeats);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [boardingPointId, setBoardingPointId] = useState<string>(
    boardingPoints[0]?.id || ""
  );
  const [category, setCategory] = useState<ReservationCategory>("standard");
  const [participantType, setParticipantType] = useState<ParticipantType>("adulto");
  const [fundingSource, setFundingSource] = useState<FundingSource>("membro");
  const [isPreferentialSeating, setIsPreferentialSeating] = useState<boolean>(false);

  // Grupo familiar e Investidura
  const [isFamilyGroup, setIsFamilyGroup] = useState<boolean>(false);
  const [familyGroupMemberNames, setFamilyGroupMemberNames] = useState<string>("");
  const [hasCompanionForEndowment, setHasCompanionForEndowment] = useState<boolean>(false);
  const [companionForEndowmentName, setCompanionForEndowmentName] = useState<string>("");

  // Manifesto de Criança de Colo (US-003.3)
  const [hasLapChild, setHasLapChild] = useState<boolean>(false);
  const [lapChildName, setLapChildName] = useState<string>("");
  const [lapChildBirthDate, setLapChildBirthDate] = useState<string>("");
  const [lapChildFiliation, setLapChildFiliation] = useState<string>("");

  // Status de envio
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReservationId, setSuccessReservationId] = useState<string | null>(null);

  // Preço calculado dinamicamente
  const currentPrice =
    category === "officiant" ? caravan.price_officiant : caravan.price_standard;

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
        <div className="sgct-alert-info mx-auto mb-6 max-w-lg text-left">
          Próximo passo: faça o pagamento pelos canais oficiais da sua Ala e aguarde a validação da Estaca.
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href={`/${stakeSlug}/calendario`}
            className="sgct-button-primary"
          >
            Ver Calendário
          </Link>
          <Link
            href={`/${stakeSlug}`}
            className="sgct-button-secondary"
          >
            Início
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) {
      setErrorMessage("Por favor, selecione um assento no mapa do ônibus.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const seatAttempted = selectedSeat;

    const result = await createReservationAction({
      caravanId: caravan.id,
      seatNumber: seatAttempted,
      boardingPointId: boardingPointId || null,
      category,
      participantType,
      fundingSource,
      isPreferentialSeating,
      familyGroupMemberNames: isFamilyGroup ? familyGroupMemberNames : null,
      familyGroupLabel: isFamilyGroup ? `Família de ${userProfile.full_name}` : null,
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
      setIsSubmitting(false);
      return;
    }

    const createdReservation = result.data as { id: string };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-busy={isSubmitting}>
      {errorMessage && (
        <div
          role="alert"
          className="sgct-alert-danger"
        >
          {errorMessage}
        </div>
      )}

      {/* 1. Dados Pessoais Cadastrados (US-003.5 - Read-Only) */}
      <div className="rounded-xl border border-[#e0e2e2] bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-[#212225]">
            Seus dados
          </h2>
          <Link href={`/${stakeSlug}/conta`} className="text-sm font-semibold text-brand-700 underline">Editar em Minha Conta</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-[#53575b]">Nome completo</span>
            <span className="font-semibold text-[#212225]">{userProfile.full_name}</span>
          </div>
          <div>
            <span className="block text-[#53575b]">CPF</span>
            <span className="font-semibold text-[#212225]">{userProfile.cpf}</span>
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

      {/* 2. Seleção de Assento no Ônibus (US-003.1 / T003.10) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#212225]">1. Escolha seu assento</h2>
          {selectedSeat && (
            <span className="sgct-chip border-brand-200 bg-brand-50 text-brand-700" aria-live="polite">
              Assento {selectedSeat} selecionado
            </span>
          )}
        </div>

        <SeatMap
          totalSeats={50}
          occupiedSeats={occupiedSeats}
          selectedSeat={selectedSeat}
          onSelectSeat={(seatNum) => {
            setErrorMessage(null);
            setSelectedSeat(seatNum);
          }}
          disabled={isSubmitting}
        />
      </div>

      {/* 3. Informações da Viagem (US-003.6) */}
      <div className="sgct-card space-y-6 p-5 sm:p-6">
        <h2 className="border-b border-[#e0e2e2] pb-4 text-xl font-bold text-[#212225]">2. Confira os detalhes da viagem</h2>

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

          {/* Fonte de Custeio (D30) */}
          <div>
            <label htmlFor="fundingSource" className="sgct-label">
              Forma de Custeio
            </label>
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
              <option value="convidado_transferencia_interestaca">
                Convidado (Transferência Inter-Estaca)
              </option>
            </select>
            {fundingSource !== "membro" && (
              <p className="mt-2 text-sm font-semibold leading-snug text-warning-700">
                Reserva sujeita à validação da fonte de auxílio junto à liderança da Ala/Estaca.
              </p>
            )}
          </div>
        </div>

        {/* Assento Preferencial */}
        <div className="pt-2">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#d0d3d3] p-3 text-sm font-semibold text-[#212225]">
            <input
              type="checkbox"
              checked={isPreferentialSeating}
              onChange={(e) => setIsPreferentialSeating(e.target.checked)}
              className="h-5 w-5 shrink-0 rounded border-[#bdc0c0] text-brand-600 focus:ring-brand-500"
            />
            <span>Necessito de assento preferencial ou com acessibilidade especial</span>
          </label>
        </div>

        {/* Grupo Familiar */}
        <div className="border-t border-[#e0e2e2] pt-3">
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
            <div className="mt-2.5">
              <input
                type="text"
                value={familyGroupMemberNames}
                onChange={(e) => setFamilyGroupMemberNames(e.target.value)}
                placeholder="Ex: Esposa Maria e filhos João e Clara"
                className="sgct-input"
              />
              <span className="mt-1.5 block text-sm text-[#53575b]">
                Sem garantia de quarto exclusivo — ajuda a liderança na organização do alojamento.
              </span>
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
              <input
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

      {/* 4. Manifesto de Criança de Colo (US-003.3 / D06 - Gratuito, sem assento) */}
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
              ? `Poltrona ${selectedSeat} selecionada no ônibus.`
              : "Nenhum assento selecionado ainda."}
          </span>
        </div>

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
    </form>
  );
}
