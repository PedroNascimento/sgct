"use client";

import { useState, useTransition, useMemo } from "react";
import { Search, X, Users, Shield, UserCheck } from "lucide-react";
import { AdminEstacaItem, toggleAdminStatusAction, updateAdminRoleAction } from "../actions";

export function AdminList({ admins }: { admins: AdminEstacaItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");

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

  // Contagens para os botões de filtro
  const totalCount = admins.length;
  const adminCount = useMemo(
    () => admins.filter((a) => a.role === "admin_estaca").length,
    [admins]
  );
  const memberCount = useMemo(
    () => admins.filter((a) => a.role === "member").length,
    [admins]
  );

  // Filtragem reativa por texto e papel
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      // 1. Filtro por papel
      if (roleFilter === "admin" && admin.role !== "admin_estaca") return false;
      if (roleFilter === "member" && admin.role !== "member") return false;

      // 2. Filtro por busca de texto (nome, email ou estaca)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = admin.full_name.toLowerCase().includes(query);
        const matchesEmail = (admin.email || "").toLowerCase().includes(query);
        const matchesStake = (admin.stake_name || "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesStake) return false;
      }

      return true;
    });
  }, [admins, roleFilter, searchQuery]);

  return (
    <section className="sgct-card overflow-hidden">
      {/* Header do Card */}
      <div className="border-b border-[#e0e2e2] px-5 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#212225] flex items-center gap-2">
              <span>Administradores Cadastrados</span>
              <span className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5">
                {filteredAdmins.length}{filteredAdmins.length !== totalCount ? ` de ${totalCount}` : ""}
              </span>
            </h2>
            <p className="text-sm text-[#53575b] mt-1">
              Gerencie o status e as permissões de acesso de cada administrador regional e membro da plataforma.
            </p>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-[#f0f2f2]">
          {/* Campo de Busca Reativo */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7b8084] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome ou e-mail para filtrar..."
              className="sgct-input pl-10 pr-9 py-2 text-sm w-full bg-[#fcfdfd]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8084] hover:text-[#212225] p-0.5 rounded-full hover:bg-[#e0e2e2]/60 transition-colors"
                title="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros de Papel (Todos, Admins, Membros) */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f4f5f5] rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "all"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Todos</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                roleFilter === "all" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
              }`}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "admin"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-brand-600" />
              <span>Somente Admins</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                roleFilter === "admin" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
              }`}>
                {adminCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("member")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                roleFilter === "member"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-[#53575b] hover:text-[#212225] hover:bg-white/60"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-[#53575b]" />
              <span>Padrão</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                roleFilter === "member" ? "bg-brand-50 text-brand-700" : "bg-[#e5e7e8] text-[#53575b]"
              }`}>
                {memberCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo de Usuários */}
      {admins.length === 0 ? (
        <div className="p-12 text-center text-base text-[#53575b]">
          Nenhum administrador encontrado. Cadastre o primeiro pelo formulário acima.
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-base font-semibold text-[#212225]">
            Nenhum cadastro encontrado com os filtros aplicados
          </p>
          <p className="text-sm text-[#53575b] mt-1">
            Tente pesquisar por outro termo ou selecione outro filtro de papel.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("all");
            }}
            className="mt-4 sgct-button-secondary text-xs"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <>
          {/* VISUALIZAÇÃO MOBILE (Cards empilhados e confortáveis) */}
          <div className="block md:hidden divide-y divide-[#e0e2e2] bg-white">
            {filteredAdmins.map((admin) => {
              const isAdmin = admin.role === "admin_estaca";
              return (
                <div key={admin.id} className="p-4 space-y-3 hover:bg-brand-50/20 transition-colors">
                  <div>
                    <p className="font-bold text-[#212225] text-base truncate">{admin.full_name}</p>
                    <p className="text-xs text-[#53575b] break-all mt-0.5">{admin.email || "E-mail não disponível"}</p>
                  </div>

                  {/* Grid 3x1 com as 3 tags alinhadas */}
                  <div className="grid grid-cols-3 gap-2 items-center pt-0.5">
                    <span
                      className="sgct-chip justify-center text-center truncate border-[#d0d3d3] bg-[#f0f2f2] text-[#404346] text-xs font-medium px-2 py-1"
                      title={admin.stake_name}
                    >
                      <span className="truncate">{admin.stake_name}</span>
                    </span>

                    <span
                      className={`sgct-chip justify-center text-center truncate text-xs px-2 py-1 ${
                        isAdmin
                          ? "border-brand-300 bg-brand-50 text-brand-800 font-semibold"
                          : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                      }`}
                    >
                      <span className="truncate">{isAdmin ? "Admin Estaca" : "Padrão"}</span>
                    </span>

                    <span
                      className={`sgct-chip justify-center text-center text-xs px-2 py-1 ${
                        admin.is_active
                          ? "border-success-200 bg-success-50 text-success-700"
                          : "border-danger-200 bg-danger-50 text-danger-700"
                      }`}
                    >
                      {admin.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center gap-2 border-t border-[#f0f2f2]">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleRole(admin)}
                      className={`flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                        isAdmin
                          ? "border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50"
                          : "border-brand-600 bg-brand-50 text-brand-800 hover:bg-brand-100"
                      } disabled:opacity-50`}
                    >
                      {isAdmin ? "Alterar para Padrão" : "Promover a Admin"}
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(admin)}
                      className={`flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                        admin.is_active
                          ? "border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100"
                          : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                      } disabled:opacity-50`}
                    >
                      {admin.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISUALIZAÇÃO DESKTOP / TABLET (Tabela completa com min-width garantido) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-[700px] w-full divide-y divide-[#e0e2e2] text-sm">
              <thead className="bg-[#f7f8f8] text-[#3a3d40]">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Nome / E-mail</th>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Estaca</th>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Perfil</th>
                  <th scope="col" className="px-6 py-3.5 text-left font-semibold">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right font-semibold whitespace-nowrap">Ações de Permissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e2e2] bg-white">
                {filteredAdmins.map((admin) => {
                  const isAdmin = admin.role === "admin_estaca";
                  return (
                    <tr key={admin.id} className="hover:bg-brand-50/40 transition-colors">
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
                          className={`sgct-chip whitespace-nowrap ${
                            isAdmin
                              ? "border-brand-300 bg-brand-50 text-brand-800 font-semibold"
                              : "border-[#d0d3d3] bg-[#eff0f0] text-[#53575b]"
                          }`}
                        >
                          {isAdmin ? "Admin da Estaca" : "Padrão"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`sgct-chip whitespace-nowrap ${
                            admin.is_active
                              ? "border-success-200 bg-success-50 text-success-700"
                              : "border-danger-200 bg-danger-50 text-danger-700"
                          }`}
                        >
                          {admin.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          {/* Botão de Alternância de Papel */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleRole(admin)}
                            title={isAdmin ? "Rebaixar para perfil padrão" : "Promover a Admin de Estaca"}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border whitespace-nowrap transition-colors ${
                              isAdmin
                                ? "border-[#d0d3d3] bg-white text-[#3a3d40] hover:bg-brand-50"
                                : "border-brand-600 bg-brand-50 text-brand-800 hover:bg-brand-100"
                            } disabled:opacity-50`}
                          >
                            {isAdmin ? "Alterar para Padrão" : "Promover a Admin"}
                          </button>

                          {/* Botão de Ativar/Desativar */}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleStatus(admin)}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border whitespace-nowrap transition-colors ${
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
        </>
      )}
    </section>
  );
}
