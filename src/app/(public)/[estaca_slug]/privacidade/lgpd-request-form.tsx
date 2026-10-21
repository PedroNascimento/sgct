"use client";

import { useState } from "react";
import { submitLgpdRequest } from "./actions";

interface Props {
  stakeId: string;
  stakeSlug: string;
}

export function LgpdRequestForm({ stakeId, stakeSlug }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [requestType, setRequestType] = useState<
    "access" | "correction" | "deletion" | "revocation" | "information"
  >("access");
  const [message, setMessage] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    protocol?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const res = await submitLgpdRequest({
      stakeId,
      fullName,
      email,
      cpf,
      requestType,
      message,
    });

    setIsLoading(false);

    if (res.success && res.protocol) {
      setFeedback({
        type: "success",
        message: "Sua solicitação foi registrada com sucesso!",
        protocol: res.protocol,
      });
      setFullName("");
      setEmail("");
      setCpf("");
      setMessage("");
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Ocorreu um erro ao enviar sua solicitação.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {feedback && (
        <div
          className={`p-4 rounded-xl border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <p className="font-semibold">{feedback.message}</p>
          {feedback.protocol && (
            <p className="mt-1 text-sm">
              Número de Protocolo: <strong>{feedback.protocol}</strong>. Guarde este código para acompanhamento.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Nome Completo *
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail de Contato *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="seu.email@exemplo.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">
            CPF (Opcional, para localização de cadastro)
          </label>
          <input
            id="cpf"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="000.000.000-00"
          />
        </div>

        <div>
          <label htmlFor="requestType" className="block text-sm font-medium text-gray-700">
            Tipo de Solicitação (Art. 18 LGPD) *
          </label>
          <select
            id="requestType"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as any)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="access">Acesso / Cópia dos meus dados</option>
            <option value="correction">Correção de dados incompletos ou inexatos</option>
            <option value="deletion">Eliminação / Exclusão de dados</option>
            <option value="revocation">Revogação do consentimento</option>
            <option value="information">Informações sobre o tratamento de dados</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Detalhes da sua solicitação *
        </label>
        <textarea
          id="message"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Descreva detalhadamente o que você deseja solicitar a respeito dos seus dados..."
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isLoading ? "Enviando solicitação..." : "Enviar Solicitação"}
      </button>
    </form>
  );
}
