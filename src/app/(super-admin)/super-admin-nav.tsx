"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { superAdminSignOutAction } from "@/app/auth-actions";

export function SuperAdminNav() {
  const pathname = usePathname();

  const links = [
    {
      href: "/estacas",
      label: "Estacas",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      description: "Visualizar e cadastrar Estacas",
    },
    {
      href: "/admins",
      label: "Admins de Estaca",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      description: "Gestão e permissões de acesso",
    },
  ];

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <nav aria-label="Menu Super Admin" className="flex flex-col gap-2 rounded-2xl border border-[#e0e2e2] bg-white p-3 shadow-sm">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#53575b]">
          Painel de Controle
        </div>
        {links.map((link) => {
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

        <form action={superAdminSignOutAction} className="w-full">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-danger-700 hover:bg-danger-50 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair da Plataforma
          </button>
        </form>
      </nav>
    </aside>
  );
}
