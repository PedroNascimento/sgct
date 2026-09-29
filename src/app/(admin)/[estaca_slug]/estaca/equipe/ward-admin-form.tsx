"use client";

/**
 * Formulário de cadastro de Admin de Ala.
 * Chamado pelo Admin da Estaca a partir da tela de equipe.
 * Artigo II.d: Admin Estaca só pode criar Admin Ala da mesma Estaca.
 */

import { useActionState, useState, useEffect } from "react";
import { createWardAdminAction, type AdminActionState } from "../../actions";
import { InfoIcon } from "@/components/ui/icons";

interface Ward {
  id: string;
  name: string;
}

interface Props {
  wards: Ward[];
}

const initialState: AdminActionState = { success: false };

export function WardAdminForm({ wards }: Props) {
  const [state, formAction, isPending] = useActionState(
    createWardAdminAction,
    initialState
  );
  const [key, setKey] = useState(0);

  // Reset do formulário após sucesso
  useEffect(() => {
    if (state.success) {
      setKey((k) => k + 1);
    }
  }, [state.success]);

  return (
    <section className="sgct-card p-5 sm:p-8">
      <h2 className="text-lg font-bold text-[#212225]">Cadastrar Admin de Ala</h2>
      <p className="mt-1 text-sm text-[#53575b]">
        O Admin de Ala poderá confirmar pagamentos dos membros da sua Ala.
      </p>

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

      <form key={key} action={formAction} className="mt-6 space-y-5">
        {/* Ala */}
        <div>
          <label htmlFor="wardId" className="sgct-label">
            Ala
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

        {/* Nome completo */}
        <div>
          <label htmlFor="fullName" className="sgct-label">
            Nome completo
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            required
            minLength={3}
            autoComplete="name"
            className="sgct-input"
            placeholder="Ex: João da Silva"
          />
        </div>

        {/* E-mail */}
        <div>
          <label htmlFor="adminEmail" className="sgct-label">
            E-mail
          </label>
          <input
            id="adminEmail"
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            className="sgct-input"
            placeholder="admin@ala.org"
          />
        </div>

        {/* Senha inicial */}
        <div>
          <label htmlFor="adminPassword" className="sgct-label">
            Senha inicial
          </label>
          <input
            id="adminPassword"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="sgct-input"
            placeholder="Mínimo 8 caracteres"
          />
          <p className="mt-1 text-xs text-[#676b6e]">
            O admin deverá alterar a senha no primeiro acesso.
          </p>
        </div>

        {/* Data de nascimento */}
        <div>
          <label htmlFor="adminBirthDate" className="sgct-label">
            Data de nascimento
          </label>
          <input
            id="adminBirthDate"
            type="date"
            name="birthDate"
            required
            className="sgct-input"
          />
        </div>

        {/* Sexo */}
        <div>
          <label htmlFor="adminSexo" className="sgct-label">
            Sexo
          </label>
          <select id="adminSexo" name="sexo" className="sgct-input">
            <option value="">Não informar</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="sgct-button-primary w-full"
        >
          {isPending ? "Cadastrando…" : "Cadastrar Admin de Ala"}
        </button>
      </form>
    </section>
  );
}
