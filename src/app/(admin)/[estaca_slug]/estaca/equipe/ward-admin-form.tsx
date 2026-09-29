"use client";

/**
 * Formulário de promoção de Admin de Ala.
 *
 * DECISÃO D32: O Admin Estaca não cria usuários — apenas eleva a permissão
 * de um membro já cadastrado na mesma Estaca. Fluxo:
 *   1. Informar o e-mail do membro já cadastrado.
 *   2. Clicar em "Buscar membro" para confirmar que o perfil existe.
 *   3. Selecionar a Ala à qual o membro será vinculado.
 *   4. Confirmar a promoção.
 *
 * Artigo II.d: Admin Estaca só pode promover membros da mesma stake_id.
 */

import { useState, useTransition, useActionState } from "react";
import {
  promoteToWardAdminAction,
  searchMemberForWardAdminPromotion,
  type AdminActionState,
} from "../../actions";
import { InfoIcon } from "@/components/ui/icons";

interface Ward {
  id: string;
  name: string;
}

interface Props {
  wards: Ward[];
  stakeId: string;
}

interface FoundMember {
  id: string;
  full_name: string;
  role: string;
  ward_id: string | null;
  ward_name: string | null;
}

const initialState: AdminActionState = { success: false };

export function WardAdminForm({ wards, stakeId }: Props) {
  const [state, formAction, isPending] = useActionState(
    promoteToWardAdminAction,
    initialState
  );

  const [emailInput, setEmailInput] = useState("");
  const [foundMember, setFoundMember] = useState<FoundMember | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  const handleSearch = () => {
    if (!emailInput) return;
    setSearchError(null);
    setFoundMember(null);

    startSearch(async () => {
      const result = await searchMemberForWardAdminPromotion(emailInput, stakeId);
      if (!result) {
        setSearchError(
          "Nenhum membro com este e-mail encontrado nesta Estaca. Verifique se o membro já criou sua conta antes de ser promovido."
        );
      } else {
        setFoundMember(result);
      }
    });
  };

  return (
    <section className="sgct-card p-5 sm:p-8">
      <h2 className="text-lg font-bold text-[#212225]">Promover Membro a Admin de Ala</h2>
      <p className="mt-1 text-sm text-[#53575b]">
        O membro precisa <strong>já ter criado sua conta</strong> nesta Estaca. Você apenas eleva a permissão de acesso.
      </p>

      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        <strong>Fluxo:</strong> membro cria conta → você busca pelo e-mail → seleciona a Ala → promove.
      </div>

      {state.error && (
        <div role="alert" className="sgct-alert-danger mt-5 flex gap-3">
          <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.success && state.message && (
        <div role="status" className="sgct-alert-success mt-5">
          {state.message}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {/* Passo 1: buscar membro pelo e-mail */}
        <div>
          <label htmlFor="memberEmailSearch" className="sgct-label">
            1. E-mail do Membro Já Cadastrado
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              id="memberEmailSearch"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setFoundMember(null);
                setSearchError(null);
              }}
              autoComplete="email"
              inputMode="email"
              className="sgct-input w-full flex-1"
              placeholder="email@membro.com"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!emailInput || isSearching}
              className="sgct-button-primary whitespace-nowrap w-full sm:w-auto text-sm shrink-0"
            >
              {isSearching ? "Buscando..." : "Buscar membro"}
            </button>
          </div>
        </div>

        {/* Resultado da busca */}
        {searchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {foundMember && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-800">✓ Membro encontrado</p>
            <div className="mt-2 space-y-1 text-sm text-emerald-700">
              <p><span className="font-medium">Nome:</span> {foundMember.full_name}</p>
              {foundMember.ward_name && (
                <p><span className="font-medium">Ala atual:</span> {foundMember.ward_name}</p>
              )}
              <p>
                <span className="font-medium">Perfil:</span>{" "}
                {foundMember.role === "admin_ala"
                  ? "⚠️ Já é Admin de Ala"
                  : foundMember.role === "admin_estaca"
                  ? "⚠️ Já é Admin de Estaca"
                  : "Padrão"}
              </p>
            </div>
          </div>
        )}

        {/* Passo 2: Selecionar Ala + Promover */}
        {foundMember && foundMember.role !== "admin_ala" && foundMember.role !== "admin_estaca" && (
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="userId" value={foundMember.id} />

            <div>
              <label htmlFor="wardId" className="sgct-label">
                2. Ala de Destino
              </label>
              <select id="wardId" name="wardId" required className="sgct-input">
                <option value="">Selecione a Ala…</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="sgct-button-primary w-full"
            >
              {isPending
                ? "Promovendo…"
                : `Promover "${foundMember.full_name}" a Admin de Ala`}
            </button>
          </form>
        )}

        {foundMember && (foundMember.role === "admin_ala" || foundMember.role === "admin_estaca") && (
          <p className="text-sm text-amber-700">
            Este membro já possui permissão de {foundMember.role === "admin_ala" ? "Admin de Ala" : "Admin de Estaca"}.
            Para revogar ou transferir, use a tabela abaixo.
          </p>
        )}
      </div>
    </section>
  );
}
