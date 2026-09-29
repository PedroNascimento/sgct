"use client";

import { useState, useActionState } from "react";
import type { Ward } from "@/domain/types/ward";
import { ArrowLeftIcon, InfoIcon, UserIcon } from "@/components/ui/icons";
import {
  registerMemberAction,
  registerMinorAction,
  registerGuestAction,
  type ActionState,
} from "./actions";

interface Props {
  stakeSlug: string;
  stakeName: string;
  wards: Ward[];
}

const initialState: ActionState = {
  success: false,
};

function CpfField({ id }: { id: string }) {
  return (
    <div>
      <label htmlFor={id} className="sgct-label">
        CPF
      </label>
      <input
        id={id}
        type="text"
        name="cpf"
        required
        inputMode="numeric"
        autoComplete="off"
        maxLength={14}
        pattern="[0-9.\-]{11,14}"
        placeholder="000.000.000-00"
        aria-describedby={`${id}-hint`}
        className="sgct-input"
      />
      <p id={`${id}-hint`} className="mt-1.5 text-sm text-[#53575b]">
        Digite os 11 números do CPF.
      </p>
    </div>
  );
}

function PhoneField({ id }: { id: string }) {
  return (
    <div>
      <label htmlFor={id} className="sgct-label">
        Telefone (WhatsApp)
      </label>
      <input
        id={id}
        type="tel"
        name="phone"
        required
        inputMode="tel"
        autoComplete="tel"
        maxLength={15}
        placeholder="(84) 99999-9999"
        aria-describedby={`${id}-hint`}
        className="sgct-input"
      />
      <p id={`${id}-hint`} className="mt-1.5 text-sm text-[#53575b]">
        Informe o DDD e o número usado no WhatsApp.
      </p>
    </div>
  );
}

export function CadastroClient({ stakeSlug, stakeName, wards }: Props) {
  const [tab, setTab] = useState<"member" | "minor" | "guest" | null>(null);

  const [memberState, memberAction, isMemberPending] = useActionState(
    registerMemberAction.bind(null, stakeSlug),
    initialState
  );

  const [minorState, minorAction, isMinorPending] = useActionState(
    registerMinorAction.bind(null, stakeSlug),
    initialState
  );

  const [guestState, guestAction, isGuestPending] = useActionState(
    registerGuestAction.bind(null, stakeSlug),
    initialState
  );

  const currentState = tab === "member" ? memberState : tab === "minor" ? minorState : guestState;

  const participantLabels = {
    member: "Membro adulto",
    minor: "Jovem de 12 a 17 anos",
    guest: "Convidado de outra Estaca",
  } as const;

  return (
    <div className="sgct-narrow">
      <div className="sgct-card p-5 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-[#e0e2e2] pb-5">
          <div>
            <p className="text-sm font-bold text-brand-700">{tab ? "Etapa 2 de 2" : "Etapa 1 de 2"}</p>
            <h2 className="mt-1 text-xl font-bold text-[#212225]">
              {tab ? participantLabels[tab] : "Quem vai participar?"}
            </h2>
          </div>
          {tab && (
            <button
              type="button"
              onClick={() => setTab(null)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Trocar
            </button>
          )}
        </div>

        {!tab && (
          <div className="space-y-3">
            <p className="mb-5 text-base leading-relaxed text-[#53575b]">
              Escolha a opção que melhor descreve a pessoa que usará esta conta.
            </p>
            {(
              [
                ["member", "Membro adulto", "Tenho 18 anos ou mais e pertenço a uma Ala desta Estaca."],
                ["minor", "Jovem de 12 a 17 anos", "Usarei meu próprio e-mail e tenho consentimento dos responsáveis."],
                ["guest", "Convidado de outra Estaca", `Não pertenço à ${stakeName}, mas desejo viajar nesta caravana.`],
              ] as const
            ).map(([value, title, description]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className="group flex min-h-[5.5rem] w-full items-center gap-4 rounded-xl border border-[#d0d3d3] bg-white p-4 text-left transition hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-white">
                  <UserIcon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-[#212225]">{title}</span>
                  <span className="mt-1 block text-sm leading-snug text-[#53575b]">{description}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-brand-700">›</span>
              </button>
            ))}
          </div>
        )}

        {tab && currentState?.error && (
          <div role="alert" className="sgct-alert-danger mb-5 flex gap-3">
            <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{currentState.error}</span>
          </div>
        )}

        {tab && currentState?.success && currentState?.message && (
          <div role="status" className="sgct-alert-success mb-5">
            {currentState.message}
          </div>
        )}

      {/* Formulário: Membro Adulto */}
      {tab === "member" && (
        <form action={memberAction} className="space-y-5">
          <div>
            <label htmlFor="member-fullName" className="sgct-label">
              Nome Completo
            </label>
            <input
              id="member-fullName"
              type="text"
              name="fullName"
              required
              placeholder="Seu nome completo"
              autoComplete="name"
              className="sgct-input"
            />
          </div>

          <CpfField id="member-cpf" />

          <PhoneField id="member-phone" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="member-birthDate" className="sgct-label">
                Data de Nascimento
              </label>
              <input
                id="member-birthDate"
                type="date"
                name="birthDate"
                required
                autoComplete="bday"
                className="sgct-input"
              />
            </div>
            <div>
              <label htmlFor="member-sexo" className="sgct-label">
                Sexo
              </label>
              <select
                id="member-sexo"
                name="sexo"
                required
                className="sgct-input"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="member-wardId" className="sgct-label">
              Sua Ala ({stakeName})
            </label>
            <select
              id="member-wardId"
              name="wardId"
              required
              className="sgct-input"
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
            <label htmlFor="member-email" className="sgct-label">
              E-mail
            </label>
            <input
              id="member-email"
              type="email"
              name="email"
              required
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
              className="sgct-input"
            />
          </div>

          <div>
            <label htmlFor="member-password" className="sgct-label">
              Senha
            </label>
            <input
              id="member-password"
              type="password"
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
            disabled={isMemberPending}
            className="sgct-button-primary w-full"
          >
            {isMemberPending ? "Cadastrando..." : "Concluir Cadastro"}
          </button>
        </form>
      )}

      {/* Formulário: Jovem 12-17 */}
      {tab === "minor" && (
        <form action={minorAction} className="space-y-5">
          <div className="sgct-alert-info">
            Cadastro exclusivo para jovens entre 12 e 17 anos com login próprio.
          </div>

          <div>
            <label htmlFor="minor-fullName" className="sgct-label">
              Nome Completo do Jovem
            </label>
            <input
              id="minor-fullName"
              type="text"
              name="fullName"
              required
              placeholder="Nome completo do jovem"
              autoComplete="name"
              className="sgct-input"
            />
          </div>

          <CpfField id="minor-cpf" />

          <PhoneField id="minor-phone" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="minor-birthDate" className="sgct-label">
                Data de Nascimento
              </label>
              <input
                id="minor-birthDate"
                type="date"
                name="birthDate"
                required
                autoComplete="bday"
                className="sgct-input"
              />
            </div>
            <div>
              <label htmlFor="minor-sexo" className="sgct-label">
                Sexo
              </label>
              <select
                id="minor-sexo"
                name="sexo"
                required
                className="sgct-input"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="minor-wardId" className="sgct-label">
              Sua Ala ({stakeName})
            </label>
            <select
              id="minor-wardId"
              name="wardId"
              required
              className="sgct-input"
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
            <label htmlFor="minor-email" className="sgct-label">
              E-mail Próprio
            </label>
            <input
              id="minor-email"
              type="email"
              name="email"
              required
              placeholder="jovem@email.com"
              autoComplete="email"
              inputMode="email"
              className="sgct-input"
            />
          </div>

          <div>
            <label htmlFor="minor-password" className="sgct-label">
              Senha
            </label>
            <input
              id="minor-password"
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="sgct-input"
            />
          </div>

          {/* Consentimento explícito dos pais (Constituição Artigo VI) */}
          <div className="pt-2">
            <label className="flex min-h-12 items-start gap-3 rounded-lg border border-[#d0d3d3] p-3 text-sm leading-relaxed text-[#3a3d40]">
              <input
                type="checkbox"
                name="parentalConsent"
                required
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#bdc0c0] text-brand-600 focus:ring-brand-500"
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
            className="sgct-button-primary w-full"
          >
            {isMinorPending ? "Cadastrando jovem..." : "Concluir Cadastro de Jovem"}
          </button>
        </form>
      )}

      {/* Formulário: Convidado Inter-Estaca */}
      {tab === "guest" && (
        <form action={guestAction} className="space-y-5">
          <div className="sgct-alert-warning">
            Para membros de outras Estacas interessados em viajar na caravana da {stakeName}.
          </div>

          <div>
            <label htmlFor="guest-fullName" className="sgct-label">
              Nome Completo
            </label>
            <input
              id="guest-fullName"
              type="text"
              name="fullName"
              required
              placeholder="Seu nome completo"
              autoComplete="name"
              className="sgct-input"
            />
          </div>

          <CpfField id="guest-cpf" />

          <PhoneField id="guest-phone" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="guest-birthDate" className="sgct-label">
                Data de Nascimento
              </label>
              <input
                id="guest-birthDate"
                type="date"
                name="birthDate"
                required
                autoComplete="bday"
                className="sgct-input"
              />
            </div>
            <div>
              <label htmlFor="guest-sexo" className="sgct-label">
                Sexo
              </label>
              <select
                id="guest-sexo"
                name="sexo"
                required
                className="sgct-input"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="guest-homeStakeName" className="sgct-label">
                Estaca de Origem
              </label>
              <input
                id="guest-homeStakeName"
                type="text"
                name="homeStakeName"
                required
                placeholder="Ex: Estaca Mossoró"
                className="sgct-input"
              />
            </div>
            <div>
              <label htmlFor="guest-homeWardName" className="sgct-label">
                Ala de Origem
              </label>
              <input
                id="guest-homeWardName"
                type="text"
                name="homeWardName"
                required
                placeholder="Ex: Ala Abolição"
                className="sgct-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="guest-email" className="sgct-label">
              E-mail
            </label>
            <input
              id="guest-email"
              type="email"
              name="email"
              required
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
              className="sgct-input"
            />
          </div>

          <div>
            <label htmlFor="guest-password" className="sgct-label">
              Senha
            </label>
            <input
              id="guest-password"
              type="password"
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
            disabled={isGuestPending}
            className="sgct-button-primary w-full"
          >
            {isGuestPending ? "Cadastrando convidado..." : "Concluir Cadastro de Convidado"}
          </button>
        </form>
      )}
      </div>
    </div>
  );
}
