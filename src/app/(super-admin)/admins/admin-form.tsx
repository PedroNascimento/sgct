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
    <form action={formAction} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4 max-w-xl">
      <h3 className="text-base font-semibold text-gray-900">
        Criar Primeiro Admin de Estaca (Bootstrap)
      </h3>
      <p className="text-xs text-gray-500">
        Este usuário receberá permissão <code>admin_estaca</code> para administrar caravanas, alas e membros da Estaca selecionada.
      </p>

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
        <label htmlFor="stakeId" className="block text-sm font-medium text-gray-700 mb-1">
          Estaca de Destino
        </label>
        <select
          id="stakeId"
          name="stakeId"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Nome Completo
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          required
          placeholder="Ex: João da Silva"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          E-mail
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          placeholder="admin@estaca.org"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
          Data de Nascimento
        </label>
        <input
          type="date"
          id="birthDate"
          name="birthDate"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Senha Temporária
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || stakes.length === 0}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition disabled:opacity-50"
      >
        {isPending ? "Criando administrador..." : "Criar Admin de Estaca"}
      </button>
    </form>
  );
}
