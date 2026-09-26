"use client";

import { useState, useActionState } from "react";
import type { Ward } from "@/domain/types/ward";
import {
  registerMemberAction,
  registerMinorAction,
  registerGuestAction,
  type ActionState,
} from "./actions";

interface Props {
  stakeId: string;
  stakeName: string;
  wards: Ward[];
}

const initialState: ActionState = {
  success: false,
};

export function CadastroClient({ stakeId, stakeName, wards }: Props) {
  const [tab, setTab] = useState<"member" | "minor" | "guest">("member");

  const [memberState, memberAction, isMemberPending] = useActionState(
    registerMemberAction.bind(null, stakeId),
    initialState
  );

  const [minorState, minorAction, isMinorPending] = useActionState(
    registerMinorAction.bind(null, stakeId),
    initialState
  );

  const [guestState, guestAction, isGuestPending] = useActionState(
    registerGuestAction.bind(null, stakeId),
    initialState
  );

  const currentState =
    tab === "member" ? memberState : tab === "minor" ? minorState : guestState;

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-xl mx-auto">
      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setTab("member")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition ${
            tab === "member"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Membro (Adulto)
        </button>
        <button
          type="button"
          onClick={() => setTab("minor")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition ${
            tab === "minor"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Jovem (12-17)
        </button>
        <button
          type="button"
          onClick={() => setTab("guest")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition ${
            tab === "guest"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Convidado
        </button>
      </div>

      {currentState?.error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
          {currentState.error}
        </div>
      )}

      {currentState?.success && currentState?.message && (
        <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 rounded-md border border-green-200">
          {currentState.message}
        </div>
      )}

      {/* Formulário: Membro Adulto */}
      {tab === "member" && (
        <form action={memberAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Seu nome completo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                name="birthDate"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexo
              </label>
              <select
                name="sexo"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sua Ala ({stakeName})
            </label>
            <select
              name="wardId"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione sua Ala...</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isMemberPending}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isMemberPending ? "Cadastrando..." : "Concluir Cadastro"}
          </button>
        </form>
      )}

      {/* Formulário: Jovem 12-17 */}
      {tab === "minor" && (
        <form action={minorAction} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800">
            Cadastro exclusivo para jovens entre 12 e 17 anos com login próprio.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo do Jovem
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Nome completo do jovem"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                name="birthDate"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexo
              </label>
              <select
                name="sexo"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sua Ala ({stakeName})
            </label>
            <select
              name="wardId"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione sua Ala...</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail Próprio
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="jovem@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Consentimento explícito dos pais (Constituição Artigo VI) */}
          <div className="pt-2">
            <label className="flex items-start space-x-2 text-xs text-gray-700">
              <input
                type="checkbox"
                name="parentalConsent"
                required
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Declaro que possuo o consentimento explícito dos meus pais ou responsáveis
                legais para cadastro e participação em caravanas ao templo.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isMinorPending}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isMinorPending ? "Cadastrando jovem..." : "Concluir Cadastro de Jovem"}
          </button>
        </form>
      )}

      {/* Formulário: Convidado Inter-Estaca */}
      {tab === "guest" && (
        <form action={guestAction} className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-md text-xs text-amber-800">
            Para membros de outras Estacas interessados em viajar na caravana da {stakeName}.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Seu nome completo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                name="birthDate"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexo
              </label>
              <select
                name="sexo"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estaca de Origem
              </label>
              <input
                type="text"
                name="homeStakeName"
                required
                placeholder="Ex: Estaca Mossoró"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ala de Origem
              </label>
              <input
                type="text"
                name="homeWardName"
                required
                placeholder="Ex: Ala Abolição"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isGuestPending}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isGuestPending ? "Cadastrando convidado..." : "Concluir Cadastro de Convidado"}
          </button>
        </form>
      )}
    </div>
  );
}
