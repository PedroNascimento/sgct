import Link from "next/link";
import { getStakesList, getAdminsList } from "../actions";
import { AdminForm } from "./admin-form";
import { AdminList } from "./admin-list";

export const dynamic = "force-dynamic";

/**
 * Tela de gestão e cadastro de Admin Estaca — Super Admin.
 */
export default async function AdminsPage() {
  const [stakes, admins] = await Promise.all([
    getStakesList(),
    getAdminsList(),
  ]);

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <p className="sgct-eyebrow">Acesso e permissões</p>
        <h1 className="sgct-title mt-3">Administradores de Estaca</h1>
        <p className="sgct-subtitle">
          Promova membros já cadastrados e gerencie os acessos de administração de cada Estaca.
        </p>
      </div>

      {stakes.length === 0 ? (
        <div className="sgct-alert-warning">
          Nenhuma Estaca cadastrada ainda.{" "}
          <Link
            href="/estacas"
            className="font-semibold underline"
          >
            Cadastre uma Estaca primeiro
          </Link>{" "}
          antes de promover um membro a Administrador.
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-8">
          <AdminForm stakes={stakes} />
          <AdminList admins={admins} />
        </div>
      )}
    </div>
  );
}

