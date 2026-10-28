"use client";

import { useActionState } from "react";
import { createStakeAction, type ActionState } from "../actions";

const initialState: ActionState = {
  success: false,
};

export function StakeForm() {
  const [state, formAction, isPending] = useActionState(
    createStakeAction,
    initialState
  );

  return (
    <form action={formAction} className="sgct-card space-y-5 p-4 sm:p-6 w-full max-w-full min-w-0">
      <div>
        <h2 className="text-xl font-bold text-[#212225]">Cadastrar Estaca</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#53575b]">
          Crie o espaço isolado de uma nova Estaca na plataforma.
        </p>
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

      <div className="w-full min-w-0">
        <label htmlFor="name" className="sgct-label">
          Nome da Estaca
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Ex: Estaca Natal Brasil"
          autoComplete="organization"
          className="sgct-input w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <label htmlFor="slug" className="sgct-label">
          Slug da URL (kebab-case)
        </label>
        <div className="flex items-center w-full min-w-0">
          <span className="mr-2 text-base text-[#53575b] shrink-0 font-mono">/</span>
          <input
            type="text"
            id="slug"
            name="slug"
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            title="Apenas letras minúsculas, números e hífens. Ex: natal ou recife-sul"
            placeholder="ex: natal"
            className="sgct-input flex-1 min-w-0 w-full"
          />
        </div>
        <p className="mt-1.5 text-xs sm:text-sm text-[#53575b]">
          Identificador único usado nas rotas e isolamento de tenant.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="sgct-button-primary w-full min-h-[48px]"
      >
        {isPending ? "Cadastrando..." : "Cadastrar Estaca"}
      </button>
    </form>
  );
}
