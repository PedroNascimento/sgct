import Link from "next/link";
import { getStakesList } from "../actions";
import { AdminForm } from "./admin-form";

export const dynamic = "force-dynamic";

/**
 * Tela de cadastro de Admin Estaca — Super Admin (T000.18).
 */
export default async function AdminsPage() {
  const stakes = await getStakesList();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Administradores de Estaca
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre o primeiro Admin de Estaca para cada Estaca recém-criada.
        </p>
      </div>

      {stakes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-sm text-yellow-800">
          Nenhuma Estaca cadastrada ainda.{" "}
          <Link
            href="/super-admin/estacas"
            className="font-semibold underline hover:text-yellow-900"
          >
            Cadastre uma Estaca primeiro
          </Link>{" "}
          antes de criar o primeiro Administrador.
        </div>
      ) : (
        <AdminForm stakes={stakes} />
      )}
    </div>
  );
}

