"use client";

/**
 * Formulário de promoção de Admin de Estaca.
 *
 * DECISÃO D32: O Super Admin não cria usuários — apenas eleva a permissão
 * de um membro já cadastrado. Fluxo:
 *   1. Selecionar a Estaca de destino.
 *   2. Informar o e-mail do membro já cadastrado nessa Estaca.
 *   3. Clicar em "Buscar membro" para confirmar que o perfil existe.
 *   4. Se encontrado, clicar em "Promover a Admin de Estaca".
 */

import { useState, useTransition, useActionState } from "react";
import { promoteToStakeAdminAction, searchMemberByEmailForPromotion, type ActionState } from "../actions";
import type { Stake } from "@/domain/types/tenant";

const initialState: ActionState = { success: false };

interface FoundMember {
  id: string;
  full_name: string;
  role: string;
  ward_name: string | null;
}

export function AdminForm({ stakes }: { stakes: Stake[] }) {
  const [state, formAction, isPending] = useActionState(
    promoteToStakeAdminAction,
    initialState
  );

  const [selectedStakeId, setSelectedStakeId] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [foundMember, setFoundMember] = useState<FoundMember | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  const handleSearch = () => {
    if (!selectedStakeId || !emailInput) return;
    setSearchError(null);
    setFoundMember(null);

    startSearch(async () => {
      const result = await searchMemberByEmailForPromotion(emailInput, selectedStakeId);
      if (!result) {
        setSearchError(
          "Nenhum membro cadastrado com este e-mail nesta Estaca. Verifique se o membro já criou sua conta de membro antes de ser promovido."
        );
      } else {
        setFoundMember(result);
      }
    });
  };

  return (
    <div className="sgct-card platform-form w-full space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#212225]">Promover membro a Admin de Estaca</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#53575b]">
          O usuário precisa <strong>já ter criado uma conta de membro</strong> na Estaca desejada. Aqui você apenas eleva a permissão de acesso dele.
        </p>
        <div className="sgct-alert-info mt-4">
          <strong>Como funciona:</strong> Selecione a Estaca → informe o e-mail do membro → clique em Buscar → confirme e promova.
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="sgct-alert-danger">
          {state.error}
        </div>
      )}

      {state?.success && state?.message && (
        <div role="status" className="sgct-alert-success">
          {state.message}
        </div>
      )}

      <div className="platform-form-grid">
        {/* Passo 1: Selecionar Estaca */}
        <div>
          <label htmlFor="stakeId" className="sgct-label">
            1. Estaca de Destino
          </label>
          <select
            id="stakeId"
            value={selectedStakeId}
            onChange={(e) => {
              setSelectedStakeId(e.target.value);
              setFoundMember(null);
              setSearchError(null);
            }}
            required
            className="sgct-input"
          >
            <option value="">Selecione uma Estaca...</option>
            {stakes.map((stake) => (
              <option key={stake.id} value={stake.id}>
                {stake.name} (/{stake.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Passo 2: Buscar membro */}
        <div>
          <label htmlFor="memberEmail" className="sgct-label">
            2. E-mail do Membro Já Cadastrado
          </label>
          <div className="platform-member-search">
            <input
              type="email"
              id="memberEmail"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setFoundMember(null);
                setSearchError(null);
              }}
              disabled={!selectedStakeId}
              placeholder={selectedStakeId ? "email@exemplo.com" : "Selecione uma Estaca primeiro"}
              autoComplete="email"
              className="sgct-input min-w-0"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!selectedStakeId || !emailInput || isSearching}
              className="sgct-button-primary w-full min-h-[48px]"
            >
              {isSearching ? "Buscando..." : "Buscar membro"}
            </button>
          </div>
        </div>
      </div>

      {/* Resultado da busca */}
      {searchError && (
        <div role="alert" className="sgct-alert-danger">
          {searchError}
        </div>
      )}

      {foundMember && (
        <div id="promotion-candidate" role="status" className="platform-member-result sgct-alert-success">
          <p className="text-sm font-semibold text-success-700">✓ Membro encontrado</p>
          <div className="mt-2 space-y-1 text-sm text-success-700">
            <p><span className="font-medium">Nome:</span> {foundMember.full_name}</p>
            {foundMember.ward_name && (
              <p><span className="font-medium">Ala:</span> {foundMember.ward_name}</p>
            )}
            <p>
              <span className="font-medium">Perfil:</span>{" "}
              {foundMember.role === "admin_estaca"
                ? "⚠️ Já é Admin de Estaca"
                : foundMember.role === "member"
                ? "Padrão"
                : foundMember.role}
            </p>
          </div>
        </div>
      )}

      {/* Passo 3: Promover */}
      {foundMember && foundMember.role !== "admin_estaca" && (
        <form action={formAction}>
          <input type="hidden" name="userId" value={foundMember.id} />
          <input type="hidden" name="stakeId" value={selectedStakeId} />
          <button
            type="submit"
            disabled={isPending}
            aria-describedby="promotion-candidate" className="sgct-button-primary w-full sm:w-auto min-h-[48px]"
          >
            {isPending
              ? "Promovendo..."
              : "Promover a Admin de Estaca"}
          </button>
        </form>
      )}

      {foundMember && foundMember.role === "admin_estaca" && (
        <p className="text-sm text-warning-700">
          Este membro já possui permissão de Admin de Estaca. Use a tabela abaixo para alterar ou revogar o acesso.
        </p>
      )}
    </div>
  );
}
