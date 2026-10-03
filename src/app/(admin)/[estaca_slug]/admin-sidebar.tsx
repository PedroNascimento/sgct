"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth-actions";

interface AdminSidebarProps {
  estacaSlug: string;
  isStakeAdmin: boolean;
  adminName?: string;
  wardName?: string;
}

export function AdminSidebar({
  estacaSlug,
  isStakeAdmin,
  adminName,
  wardName,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const stakeLinks = [
    {
      href: `/${estacaSlug}/estaca/calendario`,
      label: "Gestão de Caravanas",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: "Dashboard e viagens",
    },
    {
      href: `/${estacaSlug}/estaca/validacao-semanal`,
      label: "Validação Semanal",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: "Repasses e confirmação",
    },
    {
      href: `/${estacaSlug}/estaca/alas`,
      label: "Alas da Estaca",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      description: "Cadastro e edição de Alas",
    },
    {
      href: `/${estacaSlug}/estaca/equipe`,
      label: "Equipe / Admins de Ala",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: "Lideranças das Alas",
    },
  ];

  const wardLinks = [
    {
      href: `/${estacaSlug}/ala/reservas`,
      label: "Dashboard da Ala",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: "Inscritos e pagamentos",
    },
  ];

  const navLinks = isStakeAdmin ? stakeLinks : wardLinks;

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="flex flex-col gap-4">
        {/* Identificação do Usuário */}
        <div className="rounded-2xl border border-[#e0e2e2] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-800">
              {adminName ? adminName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#212225]">{adminName || "Administrador"}</p>
              <p className="text-xs text-[#53575b]">
                {isStakeAdmin ? "Admin da Estaca" : wardName ? `Ala ${wardName}` : "Admin da Ala"}
              </p>
            </div>
          </div>

          {/* Botão de Alternância de Visão */}
          <div className="mt-4 pt-3 border-t border-[#f0f2f2]">
            <Link
              href={`/${estacaSlug}/calendario`}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900 border border-brand-200 hover:bg-brand-100 transition-colors shadow-xs"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Ir para Visão de Membro
            </Link>
            <p className="text-[10px] text-[#707478] text-center mt-1.5">
              Faça reservas com seu mesmo usuário
            </p>
          </div>
        </div>

        {/* Menu Administrativo */}
        <nav aria-label="Navegação administrativa" className="flex flex-col gap-1.5 rounded-2xl border border-[#e0e2e2] bg-white p-3 shadow-sm">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#53575b]">
            Menu Administrativo
          </div>
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-brand-900 text-white shadow-sm"
                    : "text-[#3a3d40] hover:bg-brand-50 hover:text-brand-900"
                }`}
              >
                <span className={isActive ? "text-white" : "text-brand-700"}>{link.icon}</span>
                <div>
                  <p className="leading-none">{link.label}</p>
                  <span className={`text-[11px] font-normal ${isActive ? "text-brand-100" : "text-[#707478]"}`}>
                    {link.description}
                  </span>
                </div>
              </Link>
            );
          })}

          <div className="my-2 border-t border-[#e0e2e2]" />

          {/* Links de navegação externa e saída */}
          <Link
            href={`/${estacaSlug}`}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[#3a3d40] hover:bg-brand-50 hover:text-brand-900 transition-colors"
          >
            <svg className="h-5 w-5 text-[#707478]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Página Pública
          </Link>

          <form action={async () => { await signOutAction(estacaSlug); }}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-danger-700 hover:bg-danger-50 transition-colors"
            >
              <svg className="h-5 w-5 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair da Conta
            </button>
          </form>
        </nav>
      </div>
    </aside>
  );
}
