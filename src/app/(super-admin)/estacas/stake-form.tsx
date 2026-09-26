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
    <form action={formAction} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Cadastrar Nova Estaca</h3>

      {state?.error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
          {state.error}
        </div>
      )}

      {state?.success && state?.message && (
        <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md border border-green-200">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nome da Estaca
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Ex: Estaca Natal Brasil"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
          Slug da URL (kebab-case)
        </label>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">/</span>
          <input
            type="text"
            id="slug"
            name="slug"
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            title="Apenas letras minúsculas, números e hífens. Ex: natal ou recife-sul"
            placeholder="ex: natal"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Identificador único usado nas rotas e isolamento de tenant.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition disabled:opacity-50"
      >
        {isPending ? "Cadastrando..." : "Cadastrar Estaca"}
      </button>
    </form>
  );
}
