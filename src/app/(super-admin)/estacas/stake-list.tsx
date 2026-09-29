"use client";

import { useTransition } from "react";
import { toggleStakeStatusAction } from "../actions";

interface StakeItem {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export function StakeList({ stakes }: { stakes: StakeItem[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (stake: StakeItem) => {
    startTransition(async () => {
      await toggleStakeStatusAction(stake.id, !stake.is_active);
    });
  };

  return (
    <section className="sgct-card overflow-hidden">
      <div className="border-b border-[#e0e2e2] px-5 py-4 sm:px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#212225]">
            Estacas Cadastradas ({stakes.length})
          </h2>
          <p className="text-xs text-[#53575b] mt-0.5">
            Visualize as instâncias regionais ativas e inativas na plataforma.
          </p>
        </div>
      </div>

      {stakes.length === 0 ? (
        <div className="p-8 text-center text-base text-[#53575b]">
          Nenhuma Estaca cadastrada ainda. Utilize o formulário ao lado para cadastrar a primeira.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e0e2e2] text-sm">
            <thead className="bg-[#f7f8f8] text-[#3a3d40]">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Nome</th>
                <th className="px-6 py-3 text-left font-medium">Slug</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e2e2] bg-white">
              {stakes.map((stake) => (
                <tr key={stake.id} className="hover:bg-brand-50/40">
                  <td className="px-6 py-4 font-semibold text-[#212225]">
                    {stake.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#53575b]">
                    /{stake.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`sgct-chip ${
                        stake.is_active
                          ? "border-success-200 bg-success-50 text-success-700"
                          : "border-danger-200 bg-danger-50 text-danger-700"
                      }`}
                    >
                      {stake.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/${stake.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg border border-[#d0d3d3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#3a3d40] hover:bg-brand-50 hover:text-brand-900 transition-colors"
                      >
                        Abrir página
                      </a>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggle(stake)}
                        className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                          stake.is_active
                            ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                            : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                        } disabled:opacity-50`}
                      >
                        {stake.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
