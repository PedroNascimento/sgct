"use client";

import Link from "next/link";
import { Menu, X, PanelLeftClose, PanelLeftOpen, ChevronDown, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BusIcon, CalendarIcon, CheckIcon, UserIcon, BuildingIcon } from "./icons";
import { signOutAction, superAdminSignOutAction } from "@/app/auth-actions";

interface Props {
  stakeSlug?: string;
  context?: string;
  name: string;
  role: string;
  mode: "member" | "admin" | "platform";
}

function readCollapsed() {
  try { return localStorage.getItem("sgct-sidebar-collapsed") === "true"; } catch { return false; }
}
function subscribeCollapsed(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("sgct-navigation", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("sgct-navigation", listener); };
}
const serverCollapsed = () => false;

export function WorkspaceChrome({ stakeSlug, context, name, role, mode }: Props) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, serverCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);
  const account = useRef<HTMLDivElement>(null);
  const prefix = `/${stakeSlug}`;
  const canAdmin = Boolean(stakeSlug) && (role === "admin_estaca" || role === "admin_ala");
  const adminHref = role === "admin_estaca" ? `${prefix}/estaca/calendario` : `${prefix}/ala/reservas`;
  const modeLabel = mode === "platform" ? "Administração da plataforma" : mode === "admin" ? (role === "admin_estaca" ? "Administração da Estaca" : "Administração da Ala") : "Área do membro";
  const links = mode === "platform" ? [
    { href: "/estacas", label: "Estacas", icon: CalendarIcon },
    { href: "/admins", label: "Administradores", icon: UserIcon },
  ] : mode === "admin" ? role === "admin_estaca" ? [
    { href: `${prefix}/estaca/calendario`, label: "Caravanas", icon: CalendarIcon },
    { href: `${prefix}/estaca/validacao-semanal`, label: "Validação semanal", icon: CheckIcon },
    { href: `${prefix}/estaca/alas`, label: "Alas", icon: BuildingIcon },
    { href: `${prefix}/estaca/equipe`, label: "Perfis e Usuários", icon: UserIcon },
  ] : [
    { href: `${prefix}/ala/reservas`, label: "Reservas da Ala", icon: BusIcon },
  ] : [
    { href: prefix, label: "Início", icon: BusIcon },
    { href: `${prefix}/calendario`, label: "Próximas caravanas", icon: CalendarIcon },
    { href: `${prefix}/minhas-reservas`, label: "Minhas reservas", icon: CheckIcon },
    { href: `${prefix}/conta`, label: "Meu perfil", icon: UserIcon },
  ];
  const active = links.find((link) => pathname === link.href || (link.href !== prefix && pathname.startsWith(`${link.href}/`)));

  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: PointerEvent) => {
      if (!account.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setAccountOpen(false); accountButton.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [accountOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = sidebar.current;
    const trigger = menuButton.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button") ?? []).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    document.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
      trigger?.focus();
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    try { localStorage.setItem("sgct-sidebar-collapsed", String(!collapsed)); } catch { /* Preference is optional. */ }
    window.dispatchEvent(new Event("sgct-navigation"));
  };

  const logout = mode === "platform" || role === "super_admin" ? superAdminSignOutAction : signOutAction.bind(null, stakeSlug!);

  return (
    <div className="workspace-chrome" data-collapsed={collapsed}>
      {mobileOpen && <div className="workspace-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <aside ref={sidebar} id="workspace-navigation" className="workspace-sidebar" data-open={mobileOpen} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined} aria-label="Menu de navegação">
        <div className="workspace-brand">
          <Link href={mode === "platform" ? "/estacas" : prefix} aria-label="SGCT — Início" onClick={() => setMobileOpen(false)}>
            <BusIcon className="h-7 w-7" /><span className="sidebar-label">SGCT<span className="workspace-brand-caption">Caravanas ao Templo</span></span>
          </Link>
          <button type="button" className="workspace-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="workspace-nav-body">
          <p className="workspace-nav-caption sidebar-label">{modeLabel}</p>
          <nav aria-label="Navegação principal">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} title={label} aria-label={label} aria-current={active?.href === href ? "page" : undefined} onClick={() => setMobileOpen(false)}>
                <Icon className="h-5 w-5 shrink-0" /><span className="sidebar-label">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="workspace-sidebar-footer">
          <p className="sidebar-label text-sm leading-relaxed text-brand-100">{context || "Organização em cada etapa da viagem."}</p>
          <button type="button" className="workspace-collapse" onClick={toggleCollapsed} aria-expanded={!collapsed} aria-controls="workspace-navigation" aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}<span className="sidebar-label">Recolher menu</span>
          </button>
        </div>
      </aside>

      <header className="workspace-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <button ref={menuButton} type="button" className="workspace-menu-trigger" aria-expanded={mobileOpen} aria-controls="workspace-navigation" onClick={() => setMobileOpen(true)} aria-label="Abrir menu de navegação">
            <Menu size={20} aria-hidden="true" />
            <span>Menu</span>
          </button>
          <div className="min-w-0"><p className="workspace-context">{context || modeLabel}</p><p className="truncate font-semibold text-[#212225]">{active?.label || modeLabel}</p></div>
        </div>
        <div ref={account} className="workspace-account" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setAccountOpen(false); }}>
          <button ref={accountButton} type="button" className="workspace-account-trigger" aria-expanded={accountOpen} aria-controls="workspace-account-menu" onClick={() => setAccountOpen(!accountOpen)} aria-label={`Abrir opções de perfil de ${name}`}>
            <span className="workspace-avatar" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "U"}</span>
            <span className="workspace-account-name"><strong>{name}</strong><span>{modeLabel}</span></span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {accountOpen && <div id="workspace-account-menu" className="workspace-account-menu">
            <div className="workspace-account-heading"><strong>{name}</strong><span>{modeLabel}</span></div>
            {role !== "super_admin" && stakeSlug && <Link href={`${prefix}/conta`} onClick={() => setAccountOpen(false)}><UserIcon className="h-5 w-5" />Meus dados de perfil</Link>}
            {canAdmin && <Link href={mode === "admin" ? `${prefix}/calendario` : adminHref} onClick={() => setAccountOpen(false)}><BusIcon className="h-5 w-5" />{mode === "admin" ? "Usar visão de membro" : "Voltar à administração"}</Link>}
            {role === "super_admin" && mode !== "platform" && <Link href="/estacas">Administração da plataforma</Link>}
            <form action={logout}><button type="submit"><LogOut size={20} aria-hidden="true" />Encerrar sessão</button></form>
          </div>}
        </div>
      </header>
    </div>
  );
}
