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
    <form action={formAction} className="sgct-card platform-form space-y-5 w-full">
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
          placeholder="Ex.: Estaca Central"
          autoComplete="organization"
          className="sgct-input w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <label htmlFor="slug" className="sgct-label">
          Endereço da Estaca
        </label>
        <div className="flex items-center w-full min-w-0">
          <span className="mr-2 text-base text-[#53575b] shrink-0 font-mono">/</span>
          <input
            type="text"
            id="slug"
            name="slug"
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            title="Use letras minúsculas, números e hífens. Exemplo: estaca-central"
            placeholder="ex.: estaca-central"
            aria-describedby="stake-slug-help" autoCapitalize="none" spellCheck={false} className="sgct-input flex-1 min-w-0 w-full"
          />
        </div>
        <p id="stake-slug-help" className="mt-2 text-sm text-[#53575b]">
          Use um endereço único, sem espaços ou acentos. Ele será usado no link público da Estaca.
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
