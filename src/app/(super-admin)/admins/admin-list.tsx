"use client";

import { useTransition } from "react";
import { AdminEstacaItem, toggleAdminStatusAction, updateAdminRoleAction } from "../actions";

export function AdminList({ admins }: { admins: AdminEstacaItem[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = (admin: AdminEstacaItem) => {
    startTransition(async () => {
      await toggleAdminStatusAction(admin.id, !admin.is_active);
    });
  };

  const handleToggleRole = (admin: AdminEstacaItem) => {
    const nextRole = admin.role === "admin_estaca" ? "member" : "admin_estaca";
    startTransition(async () => {
      await updateAdminRoleAction(admin.id, nextRole);
    });
  };

  return (
    <section className="sgct-card overflow-hidden">
      <div className="border-b border-[#e0e2e2] px-5 py-4 sm:px-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#212225]">
            Administradores Cadastrados ({admins.length})
          </h2>
          <p className="text-xs text-[#53575b] mt-0.5">
            Gerencie o status e as permissões de acesso de cada administrador regional.
          </p>
        </div>
      </div>

      {admins.length === 0 ? (
        <div className="p-8 text-center text-base text-[#53575b]">
          Nenhum administrador encontrado. Cadastre o primeiro pelo formulário ao lado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e0e2e2] text-sm">
            <thead className="bg-[#f7f8f8] text-[#3a3d40]">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Nome / E-mail</th>
                <th className="px-6 py-3 text-left font-medium">Estaca</th>
                <th className="px-6 py-3 text-left font-medium">Papel Atual</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Ações de Permissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e2e2] bg-white">
              {admins.map((admin) => {
                const isAdmin = admin.role === "admin_estaca";
                return (
                  <tr key={admin.id} className="hover:bg-brand-50/40">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#212225]">{admin.full_name}</p>
                      <p className="text-xs text-[#53575b]">{admin.email || "E-mail não disponível"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-[#212225]">{admin.stake_name}</span>
                      {admin.stake_slug && (
                        <p className="font-mono text-xs text-[#53575b]">/{admin.stake_slug}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`sgct-chip ${
                          isAdmin
                            ? "border-brand-300 bg-brand-50 text-brand-800 font-semibold"
                            : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                        }`}
                      >
                        {isAdmin ? "Admin da Estaca" : "Membro Comum"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`sgct-chip ${
                          admin.is_active
                            ? "border-success-200 bg-success-50 text-success-700"
                            : "border-danger-200 bg-danger-50 text-danger-700"
                        }`}
                      >
                        {admin.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão de Alternância de Papel */}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleRole(admin)}
                          title={isAdmin ? "Rebaixar para membro comum" : "Promover a Admin de Estaca"}
                          className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                            isAdmin
                              ? "border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50"
                              : "border-brand-600 bg-brand-50 text-brand-800 hover:bg-brand-100"
                          } disabled:opacity-50`}
                        >
                          {isAdmin ? "Alterar para Membro" : "Promover a Admin"}
                        </button>

                        {/* Botão de Ativar/Desativar */}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleStatus(admin)}
                          className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                            admin.is_active
                              ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                              : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                          } disabled:opacity-50`}
                        >
                          {admin.is_active ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
