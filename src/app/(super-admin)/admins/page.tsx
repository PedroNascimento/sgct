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
    <div className="space-y-8">
      <div>
        <p className="sgct-eyebrow">Acesso e permissões</p>
        <h1 className="sgct-title mt-3">Administradores de Estaca</h1>
        <p className="sgct-subtitle">
          Cadastre novos administradores de Estaca e gerencie o status e as permissões de acesso dos usuários.
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
          antes de criar o primeiro Administrador.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 items-start">
          <div className="lg:col-span-2">
            <AdminForm stakes={stakes} />
          </div>
          <div className="lg:col-span-3">
            <AdminList admins={admins} />
          </div>
        </div>
      )}
    </div>
  );
}

