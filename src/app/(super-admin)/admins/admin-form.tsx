"use client";

import { useActionState } from "react";
import { createBootstrapAdminEstacaAction, type ActionState } from "../actions";
import type { Stake } from "@/domain/types/tenant";

const initialState: ActionState = {
  success: false,
};

export function AdminForm({ stakes }: { stakes: Stake[] }) {
  const [state, formAction, isPending] = useActionState(
    createBootstrapAdminEstacaAction,
    initialState
  );

  return (
    <form action={formAction} className="sgct-card max-w-2xl space-y-5 p-5 sm:p-7">
      <h2 className="text-xl font-bold text-[#212225]">Criar primeiro administrador</h2>
      <p className="text-sm leading-relaxed text-[#53575b]">
        Este usuário receberá permissão <code>admin_estaca</code> para administrar caravanas, alas e membros da Estaca selecionada.
      </p>

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

      <div>
        <label htmlFor="stakeId" className="sgct-label">
          Estaca de Destino
        </label>
        <select
          id="stakeId"
          name="stakeId"
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

      <div>
        <label htmlFor="fullName" className="sgct-label">
          Nome Completo
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          required
          placeholder="Ex: João da Silva"
          autoComplete="name"
          className="sgct-input"
        />
      </div>

      <div>
        <label htmlFor="email" className="sgct-label">
          E-mail
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          placeholder="admin@estaca.org"
          autoComplete="email"
          className="sgct-input"
        />
      </div>

      <div>
        <label htmlFor="birthDate" className="sgct-label">
          Data de Nascimento
        </label>
        <input
          type="date"
          id="birthDate"
          name="birthDate"
          required
          autoComplete="bday"
          className="sgct-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="sgct-label">
          Senha Temporária
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          className="sgct-input"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || stakes.length === 0}
        className="sgct-button-primary w-full sm:w-auto"
      >
        {isPending ? "Criando administrador..." : "Criar Admin de Estaca"}
      </button>
    </form>
  );
}
