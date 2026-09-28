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
      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-xl shadow-sm text-amber-900">
        <h3 className="text-lg font-bold mb-2">Cadastro Incompleto</h3>
        <p className="text-sm mb-4">
          Para garantir a segurança e o seguro dos passageiros, é obrigatório possuir
          o CPF preenchido em seu cadastro antes de realizar uma reserva.
        </p>
        <Link
          href={`/${stakeSlug}/conta`}
          className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg transition"
        >
          Completar Meu Cadastro →
        </Link>
      </div>
    );
  }

  if (successReservationId) {
    return (
      <div className="bg-green-50 border border-green-200 p-8 rounded-2xl shadow-sm text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-green-900 mb-2">
          Reserva Registrada com Sucesso!
        </h2>
        <p className="text-sm text-green-800 mb-6 max-w-md mx-auto">
          Sua intenção de reserva para a poltrona{" "}
          <span className="font-bold text-base">{selectedSeat}</span> foi registrada.
          A confirmação final segue o fluxo de pagamento e validação semanal.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href={`/${stakeSlug}/calendario`}
            className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            Ver Calendário
          </Link>
          <Link
            href={`/${stakeSlug}`}
            className="px-5 py-2.5 bg-white text-green-900 border border-green-300 text-sm font-medium rounded-lg hover:bg-green-50 transition"
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

    const result = await createReservationAction(userProfile.id, {
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
      await addManifestEntryAction(userProfile.id, {
        reservationId: createdReservation.id,
        fullName: lapChildName,
        birthDate: lapChildBirthDate,
        filiation: lapChildFiliation || userProfile.full_name,
      });
    }

    setSuccessReservationId(createdReservation.id);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-sm text-red-700 shadow-sm"
        >
          {errorMessage}
        </div>
      )}

      {/* 1. Dados Pessoais Cadastrados (US-003.5 - Read-Only) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Seus Dados de Cadastro (Preenchimento Automático)
          </h3>
          <span className="text-[11px] text-slate-500">
            Deseja alterar? Edite em Minha Conta
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Nome Completo:</span>
            <span className="font-semibold text-slate-800">{userProfile.full_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block">CPF:</span>
            <span className="font-semibold text-slate-800">{userProfile.cpf}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Telefone:</span>
            <span className="font-semibold text-slate-800">
              {userProfile.phone || "Não informado"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Sexo:</span>
            <span className="font-semibold text-slate-800 capitalize">
              {userProfile.sexo || "Não informado"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Seleção de Assento no Ônibus (US-003.1 / T003.10) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            1. Escolha seu Assento no Ônibus
          </h3>
          {selectedSeat && (
            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
              Assento #{selectedSeat} Selecionado
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
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-3">
          2. Detalhes Desta Viagem
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Ponto de Embarque */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Ponto de Embarque
            </label>
            <select
              value={boardingPointId}
              onChange={(e) => setBoardingPointId(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Categoria de Passageiro
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReservationCategory)}
              className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="standard">Padrão — R$ {caravan.price_standard.toFixed(2)}</option>
              <option value="officiant">
                Oficiante do Templo — R$ {caravan.price_officiant.toFixed(2)}
              </option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              {category === "officiant"
                ? "Categoria autodeclarada para oficiantes com designação ativa no Templo."
                : "Tarifa regular para membros e participantes."}
            </p>
          </div>

          {/* Tipo de Participante (D29: Metadado de Logística) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Tipo de Participação
            </label>
            <select
              value={participantType}
              onChange={(e) => setParticipantType(e.target.value as ParticipantType)}
              className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Forma de Custeio
            </label>
            <select
              value={fundingSource}
              onChange={(e) => setFundingSource(e.target.value as FundingSource)}
              className="w-full text-sm border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white border focus:ring-2 focus:ring-blue-500"
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
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                Reserva sujeita à validação da fonte de auxílio junto à liderança da Ala/Estaca.
              </p>
            )}
          </div>
        </div>

        {/* Assento Preferencial */}
        <div className="pt-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isPreferentialSeating}
              onChange={(e) => setIsPreferentialSeating(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span>Necessito de assento preferencial ou com acessibilidade especial</span>
          </label>
        </div>

        {/* Grupo Familiar */}
        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isFamilyGroup}
              onChange={(e) => setIsFamilyGroup(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
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
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Sem garantia de quarto exclusivo — ajuda a liderança na organização do alojamento.
              </span>
            </div>
          )}
        </div>

        {/* Acompanhante em Investidura */}
        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center space-x-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCompanionForEndowment}
              onChange={(e) => setHasCompanionForEndowment(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
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
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Manifesto de Criança de Colo (US-003.3 / D06 - Gratuito, sem assento) */}
      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
        <label className="flex items-center space-x-2 text-xs font-bold text-emerald-900 cursor-pointer">
          <input
            type="checkbox"
            checked={hasLapChild}
            onChange={(e) => setHasLapChild(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
          />
          <span>Vou levar criança de colo (0 a 5 anos — sem assento individual, gratuito)</span>
        </label>

        {hasLapChild && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                Nome Completo da Criança
              </label>
              <input
                type="text"
                value={lapChildName}
                onChange={(e) => setLapChildName(e.target.value)}
                placeholder="Nome da criança"
                className="w-full text-xs border border-emerald-300 rounded-lg p-2 bg-white"
                required={hasLapChild}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={lapChildBirthDate}
                onChange={(e) => setLapChildBirthDate(e.target.value)}
                className="w-full text-xs border border-emerald-300 rounded-lg p-2 bg-white"
                required={hasLapChild}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                Filiação / Responsáveis
              </label>
              <input
                type="text"
                value={lapChildFiliation}
                onChange={(e) => setLapChildFiliation(e.target.value)}
                placeholder="Ex: Pai e Mãe"
                className="w-full text-xs border border-emerald-300 rounded-lg p-2 bg-white"
                required={hasLapChild}
              />
            </div>
          </div>
        )}
      </div>

      {/* Resumo Financeiro e Botão de Confirmação */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-5">
        <div>
          <span className="text-xs text-slate-400 block uppercase tracking-wider">
            Total a Confirmar
          </span>
          <div className="text-2xl font-extrabold text-white">
            R$ {currentPrice.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-300">
              ({category === "officiant" ? "Oficiante" : "Padrão"})
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {selectedSeat
              ? `Poltrona ${selectedSeat} selecionada no ônibus.`
              : "Nenhum assento selecionado ainda."}
          </span>
        </div>

        <button
          type="submit"
          disabled={!selectedSeat || isSubmitting}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition ${
            !selectedSeat || isSubmitting
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95 cursor-pointer"
          }`}
        >
          {isSubmitting ? "Gravando Reserva..." : "Confirmar Minha Reserva"}
        </button>
      </div>
    </form>
  );
}
